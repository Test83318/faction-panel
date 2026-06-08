<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FactionRecordEntry extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'database_id',
        'entry_id',
        'data',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'data' => 'array',
        'is_active' => 'boolean',
    ];

    public function database()
    {
        return $this->belongsTo(FactionRecordDatabase::class, 'database_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by')->withDefault([
            'username' => 'System',
        ]);
    }
}
