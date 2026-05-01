<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RosterDatasetOption extends Model
{
    protected $fillable = ['roster_dataset_id', 'value', 'color', 'is_bold', 'order'];

    protected $casts = [
        'is_bold' => 'boolean',
    ];

    public function dataset(): BelongsTo
    {
        return $this->belongsTo(RosterDataset::class, 'roster_dataset_id');
    }
}
