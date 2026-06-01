<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StatisticsModel extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'faction_id',
        'name',
        'description',
        'created_by',
    ];

    protected $casts = [
    ];

    public function faction()
    {
        return $this->belongsTo(Faction::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function statisticsPermissions()
    {
        return $this->hasMany(StatisticsPermission::class, 'statistics_model_id');
    }

    public function widgets()
    {
        return $this->hasMany(StatisticsWidget::class, 'statistics_model_id')->orderBy('order');
    }
}
