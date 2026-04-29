<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['role_id', 'permission_key', 'value'];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }
}
