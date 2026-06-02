<?php

namespace App\Traits;

use App\Models\AuditLog;
use App\Models\Faction;
use App\Models\Roster;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            $model->logAudit('created', null, $model->getAttributes());
        });

        static::updated(function ($model) {
            $oldValues = array_intersect_key($model->getOriginal(), $model->getDirty());
            $newValues = $model->getDirty();

            // Exclude updated_at if it's the only thing changed
            if (count($newValues) === 1 && isset($newValues['updated_at'])) {
                return;
            }

            $model->logAudit('updated', $oldValues, $newValues);
        });

        static::deleted(function ($model) {
            $model->logAudit('deleted', $model->getAttributes(), null);
        });
    }

    public function audits()
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('id');
    }

    public function logAudit(string $event, ?array $oldValues, ?array $newValues): void
    {
        // Bypass audit logs for sandbox rosters, sections, and contents
        if ($this instanceof Roster && $this->is_sandbox) {
            return;
        }
        if (method_exists($this, 'roster') && $this->roster?->is_sandbox) {
            return;
        }
        if (method_exists($this, 'section') && $this->section?->roster?->is_sandbox) {
            return;
        }

        $factionId = $this->faction_id ?? null;

        if (! $factionId) {
            if (method_exists($this, 'faction')) {
                $factionId = $this->faction?->id;
            } elseif (method_exists($this, 'section')) {
                $factionId = $this->section?->roster?->faction_id;
            } elseif (method_exists($this, 'roster')) {
                $factionId = $this->roster?->faction_id;
            } elseif (method_exists($this, 'database')) {
                $factionId = $this->database?->faction_id;
            } elseif (method_exists($this, 'dataset')) {
                $factionId = $this->dataset?->faction_id;
            } elseif (method_exists($this, 'form')) {
                $factionId = $this->form?->faction_id;
            } elseif (method_exists($this, 'submission')) {
                $factionId = $this->submission?->form?->faction_id;
            }
        }

        // If still null, try to get from request context
        if (! $factionId) {
            $route = Request::route();
            if ($route) {
                $factionParam = $route->parameter('faction') ?? $route->parameter('shortname');
                if ($factionParam) {
                    $factionId = $factionParam instanceof Faction ? $factionParam->id : $factionParam;

                    if (! is_numeric($factionId)) {
                        $factionId = Faction::where('shortname', $factionId)->first()?->id;
                    }
                }
            }
        }

        $modelName = class_basename($this);
        $description = ucfirst($event)." {$modelName} (#{$this->id})";

        AuditLog::create([
            'faction_id' => $factionId,
            'user_id' => Auth::id(),
            'event' => $event,
            'description' => $description,
            'auditable_type' => static::class,
            'auditable_id' => $this->id,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'url' => Request::fullUrl(),
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'method' => Request::method(),
        ]);
    }
}
