<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_submission_id',
        'form_field_id',
        'value',
        'points_awarded',
        'is_graded',
        'reviewer_comment',
        'correctness',
    ];

    protected $casts = [
        'is_graded' => 'boolean',
        'points_awarded' => 'integer',
    ];

    public function submission()
    {
        return $this->belongsTo(FormSubmission::class, 'form_submission_id');
    }

    public function field()
    {
        return $this->belongsTo(FormField::class, 'form_field_id');
    }
}
