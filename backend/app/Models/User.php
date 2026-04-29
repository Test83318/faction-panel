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

    public static function hasFactionPermission(?User $user, Faction $faction, string $permissionKey): bool
    {
        if ($user && $user->is_superadmin) {
            return true;
        }

        if ($user && $faction->faction_leader === $user->id) {
            return true;
        }

        $roles = collect();

        // 1. Always get Public role permissions if faction is public/hidden
        if (in_array($faction->visibility, ['public', 'hidden'])) {
            $publicRole = $faction->roles()->where('name', 'Public')->with('permissions')->first();
            if ($publicRole) {
                $roles->push($publicRole);
            }
        }

        // 2. Add specific user roles if user is logged in
        if ($user) {
            $userRoles = $user->roles()->where('faction_id', $faction->id)->with('permissions')->get();
            foreach ($userRoles as $role) {
                if (!$roles->contains('id', $role->id)) {
                    $roles->push($role);
                }
            }
        }

        if ($roles->isEmpty()) {
            return false;
        }

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

    public function hasPermission(string $permissionKey, int $factionId): bool
    {
        $faction = Faction::find($factionId);
        if (!$faction) return false;

        return self::hasFactionPermission($this, $faction, $permissionKey);
    }
}
