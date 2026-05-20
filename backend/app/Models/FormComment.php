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
}
