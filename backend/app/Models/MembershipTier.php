<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembershipTier extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'max_factions', 'allow_custom_branding'];

    protected $casts = [
        'allow_custom_branding' => 'boolean',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
