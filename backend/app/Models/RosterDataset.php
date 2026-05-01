<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RosterDataset extends Model
{
    protected $fillable = ['faction_id', 'name', 'record_database_id'];

    public function faction(): BelongsTo
    {
        return $this->belongsTo(Faction::class);
    }

    public function recordDatabase(): BelongsTo
    {
        return $this->belongsTo(FactionRecordDatabase::class, 'record_database_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(RosterDatasetOption::class)->orderBy('order');
    }
}
