<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Faction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

abstract class Controller
{
    protected function audit(
        string $event,
        ?string $description = null,
        ?int $factionId = null,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        // Bypass manual audit logs for sandbox rosters, sections, and contents
        if ($auditable) {
            $isSandbox = false;
            if ($auditable instanceof \App\Models\Roster && $auditable->is_sandbox) {
                $isSandbox = true;
            } elseif (method_exists($auditable, 'roster') && $auditable->roster?->is_sandbox) {
                $isSandbox = true;
            } elseif (method_exists($auditable, 'section') && $auditable->section?->roster?->is_sandbox) {
                $isSandbox = true;
            }
            if ($isSandbox) {
                return;
            }
        }

        // If factionId is null, try to infer it from the request route parameters or model context
        if (! $factionId) {
            $route = request()->route();
            if ($route) {
                $factionParam = $route->parameter('faction') ?? $route->parameter('shortname');
                if ($factionParam) {
                    if ($factionParam instanceof Faction) {
                        $factionId = $factionParam->id;
                    } elseif (is_numeric($factionParam)) {
                        $factionId = (int) $factionParam;
                    } else {
                        $factionId = Faction::where('shortname', $factionParam)->first()?->id;
                    }
                }
            }
        }

        // If factionId is still null, try to get it from the auditable model
        if (! $factionId && $auditable) {
            $factionId = $auditable->faction_id ?? null;
            if (! $factionId && method_exists($auditable, 'faction')) {
                $factionId = $auditable->faction?->id;
            }
        }

        AuditLog::create([
            'faction_id' => $factionId,
            'user_id' => Auth::id(),
            'event' => $event,
            'description' => $description,
            'auditable_type' => $auditable ? get_class($auditable) : null,
            'auditable_id' => $auditable ? $auditable->id : null,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'url' => request()->fullUrl(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'method' => request()->method(),
        ]);
    }
}
