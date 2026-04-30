<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['faction_id', 'name', 'weight', 'color', 'type'];

    public function faction()
    {
        return $this->belongsTo(Faction::class);
    }

    public function permissions()
    {
        return $this->hasMany(Permission::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }
}
