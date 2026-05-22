<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_submission_id',
        'user_id',
        'comment',
        'is_internal',
        'form_section_id',
    ];

    protected $casts = [
        'is_internal' => 'boolean',
    ];

    public function submission()
    {
        return $this->belongsTo(FormSubmission::class, 'form_submission_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function section()
    {
        return $this->belongsTo(FormSection::class, 'form_section_id');
    }
}
