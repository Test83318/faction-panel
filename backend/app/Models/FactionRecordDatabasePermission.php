<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FactionRecordDatabasePermission extends Model
{
    protected $fillable = [
        'database_id',
        'group_id',
        'role_id',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function database()
    {
        return $this->belongsTo(FactionRecordDatabase::class, 'database_id');
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }
}
