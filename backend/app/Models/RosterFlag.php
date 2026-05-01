<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RosterFlag extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'faction_id',
        'name',
        'icon',
        'color',
        'rules',
        'created_by'
    ];

    protected $casts = [
        'rules' => 'array',
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
