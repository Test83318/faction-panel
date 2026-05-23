<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormStage extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'name',
        'submit_status_id',
        'required_points',
        'order',
    ];

    protected $casts = [
        'required_points' => 'integer',
        'submit_status_id' => 'integer',
        'order' => 'integer',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function submitStatus()
    {
        return $this->belongsTo(FormStatus::class, 'submit_status_id');
    }

    public function sections()
    {
        return $this->hasMany(FormSection::class)->orderBy('order');
    }
}
