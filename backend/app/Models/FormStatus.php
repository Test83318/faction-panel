<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormStatus extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'system_key',
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

    protected $appends = ['stage_ids'];

    public function getStageIdsAttribute()
    {
        if ($this->relationLoaded('stages')) {
            return $this->stages->pluck('id')->toArray();
        }
        return $this->stages()->pluck('form_stages.id')->toArray();
    }

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function stages()
    {
        return $this->belongsToMany(FormStage::class, 'form_status_stage');
    }
}
