<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChangelogEntry extends Model
{
    protected $fillable = [
        'version',
        'title',
        'body',
        'items',
        'released_at',
        'order',
    ];

    protected $casts = [
        'released_at' => 'date',
        'order' => 'integer',
        'items' => 'array',
    ];
}
