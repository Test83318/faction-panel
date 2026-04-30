<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Faction extends Model
{
    /** @use HasFactory<\Database\Factories\FactionFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'shortname',
        'name',
        'description',
        'color',
        'image_url',
        'visibility',
        'access',
        'gtaw_faction_id',
        'faction_leader',
        'created_by',
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
}
