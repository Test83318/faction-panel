<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'faction_id',
        'notification_scheme_id',
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'is_read',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
    ];

    public function faction()
    {
        return $this->belongsTo(Faction::class);
    }

    public function scheme()
    {
        return $this->belongsTo(NotificationScheme::class, 'notification_scheme_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reads()
    {
        return $this->hasMany(NotificationRead::class);
    }
}
