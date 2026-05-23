<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_stage_id',
        'name',
        'description',
        'order',
    ];

    public function stage()
    {
        return $this->belongsTo(FormStage::class, 'form_stage_id');
    }

    public function fields()
    {
        return $this->hasMany(FormField::class)->orderBy('order');
    }
}
