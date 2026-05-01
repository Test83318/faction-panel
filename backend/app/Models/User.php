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

    public function groups()
    {
        return $this->belongsToMany(Group::class)->withPivot('is_leader')->withTimestamps();
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

        // Check for 'administrator' permission first (System category)
        // This grants everything except specifically exempted permissions
        $isSystemAdmin = false;
        foreach ($roles as $role) {
            if ($role->permissions->where('permission_key', 'administrator')->where('value', 'YES')->first()) {
                $isSystemAdmin = true;
                break;
            }
        }

        // Future-proof exemptions for 'administrator' permission
        $leaderOnlyPermissions = [
            'delete_faction', // Example of a future permission
        ];

        if ($isSystemAdmin && !in_array($permissionKey, $leaderOnlyPermissions)) {
            return true;
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

    public function getHighestRoleWeight(int $factionId): int
    {
        if ($this->is_superadmin) {
            return PHP_INT_MAX;
        }

        $faction = Faction::find($factionId);
        if ($faction && $faction->faction_leader === $this->id) {
            return PHP_INT_MAX;
        }

        return $this->roles()
            ->where('faction_id', $factionId)
            ->max('weight') ?? 0;
    }

    public static function hasRosterPermission(?User $user, Roster $roster, string $permissionKey): bool
    {
        $faction = $roster->faction;

        // 1. Superadmin/Faction Leader/Global Roster Moderator/Creator always have access
        if ($user) {
            if ($user->is_superadmin || 
                $faction->faction_leader === $user->id || 
                self::hasFactionPermission($user, $faction, 'global_roster_moderation') ||
                $roster->created_by === $user->id
            ) {
                return true;
            }
        }

        // 2. Collect all permission sets applicable to this user
        $permissionSets = collect();

        // Public permissions (group_id is null)
        $publicPerms = $roster->rosterPermissions()->whereNull('group_id')->first();
        if ($publicPerms) {
            $permissionSets->push($publicPerms->permissions);
        }

        if ($user) {
            // Group permissions
            $userGroupIds = $user->groups()->where('faction_id', $faction->id)->pluck('groups.id');
            $groupPerms = $roster->rosterPermissions()->whereIn('group_id', $userGroupIds)->get();
            foreach ($groupPerms as $gp) {
                $permissionSets->push($gp->permissions);
            }
        }

        if ($permissionSets->isEmpty()) {
            return false;
        }

        // If any set has the permission as true, return true
        foreach ($permissionSets as $set) {
            if (is_array($set) && in_array($permissionKey, $set)) {
                return true;
            }
        }

        return false;
    }
}
