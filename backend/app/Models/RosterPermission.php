<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RosterPermission extends Model
{
    protected $fillable = [
        'roster_id',
        'group_id',
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
}
