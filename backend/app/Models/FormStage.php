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
        'order',
    ];

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function sections()
    {
        return $this->hasMany(FormSection::class)->orderBy('order');
    }
}
