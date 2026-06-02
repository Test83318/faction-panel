<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationSchemePermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'notification_scheme_id',
        'role_id',
        'group_id',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function notificationScheme()
    {
        return $this->belongsTo(NotificationScheme::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}
