<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'user_id',
        'current_stage_id',
        'current_status_id',
        'started_at',
        'submitted_at',
        'metadata',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function currentStage()
    {
        return $this->belongsTo(FormStage::class, 'current_stage_id');
    }

    public function currentStatus()
    {
        return $this->belongsTo(FormStatus::class, 'current_status_id');
    }

    public function responses()
    {
        return $this->hasMany(FormResponse::class);
    }

    public function comments()
    {
        return $this->hasMany(FormComment::class);
    }
}
