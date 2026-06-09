<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RosterPermission extends Model
{
    protected static function booted()
    {
        $clear = function ($rosterPermission) {
            $roster = \App\Models\Roster::find($rosterPermission->roster_id);
            if ($roster) {
                \App\Models\Faction::invalidateRosterCache($roster->faction_id);
                \App\Events\RosterUpdated::dispatch($roster);
            }
        };
        static::saved($clear);
        static::deleted($clear);
    }

    protected $fillable = [
        'roster_id',
        'group_id',
        'role_id',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function roster()
    {
        return $this->belongsTo(Roster::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }
}
