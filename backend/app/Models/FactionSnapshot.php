<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FactionSnapshot extends Model
{
    protected $fillable = [
        'faction_id',
        'name',
        'description',
        'data',
        'type',
        'created_by'
    ];

    protected $casts = [
        'data' => 'array',
    ];

    public function faction()
    {
        return $this->belongsTo(Faction::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
