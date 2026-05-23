<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Form extends Model
{
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'faction_id',
        'name',
        'type',
        'is_automatic_grading',
        'description',
        'metadata',
        'is_public',
        'requires_gtaw_login',
        'cooldown_seconds',
        'cooldown_only_on_fail',
        'max_submissions',
        'is_enabled',
        'created_by',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_public' => 'boolean',
        'requires_gtaw_login' => 'boolean',
        'is_automatic_grading' => 'boolean',
        'cooldown_seconds' => 'integer',
        'cooldown_only_on_fail' => 'boolean',
        'max_submissions' => 'integer',
        'is_enabled' => 'boolean',
    ];

    public function faction()
    {
        return $this->belongsTo(Faction::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function stages()
    {
        return $this->hasMany(FormStage::class)->orderBy('order');
    }

    public function statuses()
    {
        return $this->hasMany(FormStatus::class)->orderBy('order');
    }

    public function formPermissions()
    {
        return $this->hasMany(FormPermission::class);
    }

    public function submissions()
    {
        return $this->hasMany(FormSubmission::class);
    }

    public function automations()
    {
        return $this->hasMany(FormAutomation::class)->orderBy('order');
    }
}
