<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RosterContent extends Model
{
    use SoftDeletes, Auditable;

    protected $fillable = [
        'section_id',
        'order',
        'type',
        'content',
        'created_by'
    ];

    protected $casts = [
        'content' => 'array',
    ];

    public function section()
    {
        return $this->belongsTo(RosterSection::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
