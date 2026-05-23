<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormAutomation extends Model
{
    protected $fillable = [
        'form_id', 'name', 'trigger', 'trigger_status_id', 'trigger_stage_id',
        'condition_logic', 'conditions', 'action',
        'action_status_id', 'action_comment', 'action_comment_internal',
        'action_group_id', 'is_enabled', 'order',
    ];

    protected $casts = [
        'conditions' => 'array',
        'action_comment_internal' => 'boolean',
        'is_enabled' => 'boolean',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function triggerStatus()
    {
        return $this->belongsTo(FormStatus::class, 'trigger_status_id');
    }

    public function triggerStage()
    {
        return $this->belongsTo(FormStage::class, 'trigger_stage_id');
    }

    public function actionStatus()
    {
        return $this->belongsTo(FormStatus::class, 'action_status_id');
    }

    public function actionGroup()
    {
        return $this->belongsTo(Group::class, 'action_group_id');
    }
}
