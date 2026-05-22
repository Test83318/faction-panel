<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RosterContent extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'section_id',
        'order',
        'type',
        'color',
        'content',
        'created_by',
        'editing_by',
        'editing_at',
        'editing_col',
    ];

    protected $casts = [
        'content' => 'array',
        'editing_at' => 'datetime',
    ];

    public function section()
    {
        return $this->belongsTo(RosterSection::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'editing_by');
    }
}
