<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class StatisticsWidget extends Model
{
    use Auditable;

    protected $fillable = [
        'statistics_model_id',
        'name',
        'type',
        'configuration',
        'cache_result',
        'last_calculated_at',
        'is_intensive',
        'order',
        'width',
    ];

    protected $casts = [
        'configuration' => 'array',
        'cache_result' => 'array',
        'last_calculated_at' => 'datetime',
        'is_intensive' => 'boolean',
    ];

    public function statisticsModel()
    {
        return $this->belongsTo(StatisticsModel::class, 'statistics_model_id');
    }
}
