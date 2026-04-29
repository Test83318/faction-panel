<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['username', 'password', 'is_superadmin'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
        ];
    }

    public function factions()
    {
        return $this->belongsToMany(Faction::class)->withTimestamps();
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    public function hasPermission(string $permissionKey, int $factionId): bool
    {
        if ($this->is_superadmin) {
            return true;
        }

        $faction = Faction::find($factionId);
        if ($faction && $faction->faction_leader === $this->id) {
            return true;
        }

        $roles = $this->roles()->where('faction_id', $factionId)->with('permissions')->get();

        $hasNever = false;
        $hasYes = false;

        foreach ($roles as $role) {
            $permission = $role->permissions->where('permission_key', $permissionKey)->first();
            if ($permission) {
                if ($permission->value === 'NEVER') {
                    $hasNever = true;
                    break;
                }
                if ($permission->value === 'YES') {
                    $hasYes = true;
                }
            }
        }

        return $hasYes && !$hasNever;
    }
}
