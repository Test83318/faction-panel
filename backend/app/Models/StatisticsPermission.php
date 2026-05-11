<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatisticsPermission extends Model
{
    protected $fillable = [
        'statistics_model_id',
        'group_id',
        'role_id',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function statisticsModel()
    {
        return $this->belongsTo(StatisticsModel::class, 'statistics_model_id');
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
