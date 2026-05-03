<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FactionRecordDatabase extends Model
{
    use SoftDeletes, Auditable;

    protected $fillable = [
        'faction_id',
        'name',
        'description',
        'allow_details_view',
        'data_overview_display',
        'data_entry_display',
        'record_shortcode',
        'permissions',
        'database_structure',
        'detail_customization',
        'is_api_database',
        'is_published',
        'created_by',
    ];

    protected $casts = [
        'permissions' => 'array',
        'database_structure' => 'array',
        'detail_customization' => 'array',
        'is_api_database' => 'boolean',
        'allow_details_view' => 'boolean',
        'is_published' => 'boolean',
    ];

    public function faction()
    {
        return $this->belongsTo(Faction::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function entries()
    {
        return $this->hasMany(FactionRecordEntry::class, 'database_id');
    }

    public function databasePermissions()
    {
        return $this->hasMany(FactionRecordDatabasePermission::class, 'database_id');
    }
}
