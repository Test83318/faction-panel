<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormStatus extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'name',
        'order',
        'is_hidden',
        'is_locked',
        'is_closed',
        'is_failed',
        'is_passed',
        'is_archived',
    ];

    protected $casts = [
        'is_hidden' => 'boolean',
        'is_locked' => 'boolean',
        'is_closed' => 'boolean',
        'is_failed' => 'boolean',
        'is_passed' => 'boolean',
        'is_archived' => 'boolean',
        'order' => 'integer',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class);
    }
}
