<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Faction extends Model
{
    /** @use HasFactory<\Database\Factories\FactionFactory> */
    use HasFactory, SoftDeletes, Auditable;

    protected $appends = ['allow_branding'];

    public function getAllowBrandingAttribute(): bool
    {
        return $this->creator ? $this->creator->allow_custom_branding : false;
    }

    protected $fillable = [
        'shortname',
        'name',
        'description',
        'color',
        'image_url',
        'header_image_dark',
        'header_image_light',
        'favicon',
        'header_link_to_faction',
        'hide_panel_header',
        'custom_footer_text',
        'header_bg_color',
        'header_gradient_enabled',
        'header_gradient_color',
        'header_gradient_direction',
        'visibility',
        'access',
        'gtaw_faction_id',
        'faction_leader',
        'roster_template',
        'created_by',
    ];

    protected $casts = [
        'roster_template' => 'array',
    ];

    public function invites()
    {
        return $this->hasMany(FactionInvite::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function leader()
    {
        return $this->belongsTo(User::class, 'faction_leader');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function roles()
    {
        return $this->hasMany(Role::class);
    }

    public function rosters()
    {
        return $this->hasMany(Roster::class);
    }

    public function recordDatabases()
    {
        return $this->hasMany(FactionRecordDatabase::class);
    }

    public function groups()
    {
        return $this->hasMany(Group::class);
    }

    public function rosterFlags()
    {
        return $this->hasMany(RosterFlag::class);
    }

    public function rosterDatasets()
    {
        return $this->hasMany(RosterDataset::class);
    }
}
