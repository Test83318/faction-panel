<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationScheme extends Model
{
    use Auditable, HasFactory;

    protected $fillable = [
        'faction_id',
        'name',
        'trigger_type',
        'target_id',
        'conditions',
        'read_type',
        'text_template',
        'created_by',
    ];

    protected $casts = [
        'conditions' => 'array',
    ];

    public function faction()
    {
        return $this->belongsTo(Faction::class);
    }

    public function permissions()
    {
        return $this->hasMany(NotificationSchemePermission::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
