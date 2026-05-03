<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RosterSection extends Model
{
    use SoftDeletes, Auditable;

    protected $fillable = [
        'roster_id',
        'name',
        'shortname',
        'color',
        'type',
        'order',
        'parent_id',
        'section_options',
        'columns',
        'layout_settings',
        'subsections_per_row',
        'created_by'
    ];

    protected $casts = [
        'section_options' => 'array',
        'columns' => 'array',
        'layout_settings' => 'array',
    ];

    public function roster()
    {
        return $this->belongsTo(Roster::class);
    }

    public function parent()
    {
        return $this->belongsTo(RosterSection::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(RosterSection::class, 'parent_id')->orderBy('order');
    }

    public function contents()
    {
        return $this->hasMany(RosterContent::class, 'section_id')->orderBy('order');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
