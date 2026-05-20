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

#[Fillable(['username', 'password', 'is_superadmin', 'avatar_url', 'gtaw_id', 'gtaw_username', 'gtaw_access_token', 'membership_tier_id', 'always_match_row_height'])]
#[Hidden(['password', 'remember_token', 'gtaw_id', 'gtaw_username', 'gtaw_access_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $appends = ['max_factions', 'allow_custom_branding', 'gtaw_linked'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
            'membership_tier_id' => 'integer',
            'allow_custom_branding' => 'boolean',
            'always_match_row_height' => 'boolean',
            'gtaw_linked' => 'boolean',
        ];
    }

    public function getGtawLinkedAttribute(): bool
    {
        return !empty($this->gtaw_access_token);
    }

    public function membershipTier()
    {
        return $this->belongsTo(MembershipTier::class);
    }

    protected function getAvatarUrlAttribute($value)
    {
        if (!$value) return null;
        if (str_starts_with($value, 'http')) return $value;
        
        $baseUrl = env('STORAGE_URL');
        if (!$baseUrl) {
            $baseUrl = rtrim(config('app.url'), '/') . '/storage';
        }
        
        return rtrim($baseUrl, '/') . '/' . ltrim($value, '/');
    }

    protected function setAvatarUrlAttribute($value)
    {
        $this->attributes['avatar_url'] = $this->stripStorageUrl($value);
    }

    private function stripStorageUrl($value)
    {
        if (!$value) return null;
        
        $bases = array_filter([
            env('STORAGE_URL'),
            rtrim(config('app.url'), '/') . '/storage',
            rtrim(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '/')
        ]);

        foreach ($bases as $base) {
            $base = rtrim($base, '/');
            if (str_starts_with($value, $base)) {
                return ltrim(str_replace($base, '', $value), '/');
            }
        }
        
        return $value;
    }

    public function getMaxFactionsAttribute(): int
    {
        if ($this->is_superadmin) {
            return PHP_INT_MAX;
        }

        return $this->membershipTier ? $this->membershipTier->max_factions : 1;
    }

    public function getAllowCustomBrandingAttribute(): bool
    {
        if ($this->is_superadmin) {
            return true;
        }

        return $this->membershipTier ? $this->membershipTier->allow_custom_branding : false;
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

    public function ownedRosters()
    {
        return $this->hasMany(Roster::class, 'created_by');
    }

    public function ownedDatabases()
    {
        return $this->hasMany(FactionRecordDatabase::class, 'created_by');
    }

    public function ownedStatistics()
    {
        return $this->hasMany(StatisticsModel::class, 'created_by');
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

    public function isGroupLeaderInFaction(int $factionId): bool
    {
        return $this->groups()
            ->where('faction_id', $factionId)
            ->wherePivot('is_leader', true)
            ->exists();
    }

    public static function hasRosterPermission(?User $user, Roster $roster, string $permissionKey): bool
    {
        $faction = $roster->faction;

        // 0. Check for global 'view_faction_roster' if the key is 'view_roster'
        if ($permissionKey === 'view_roster' && self::hasFactionPermission($user, $faction, 'view_faction_roster')) {
            return true;
        }

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

        // Public permissions (group_id and role_id are null)
        $publicPerms = $roster->rosterPermissions()->whereNull('group_id')->whereNull('role_id')->first();
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

            // Role permissions
            $userRoleIds = $user->roles()->where('faction_id', $faction->id)->pluck('roles.id');
            $rolePerms = $roster->rosterPermissions()->whereIn('role_id', $userRoleIds)->get();
            foreach ($rolePerms as $rp) {
                $permissionSets->push($rp->permissions);
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

    public static function hasRecordPermission(?User $user, FactionRecordDatabase $database, string $permissionKey): bool
    {
        $faction = $database->faction;

        // 1. Superadmin/Faction Leader/Global Record Moderator/Creator always have access
        if ($user) {
            if ($user->is_superadmin || 
                $faction->faction_leader === $user->id || 
                self::hasFactionPermission($user, $faction, 'global_faction_record_moderation') ||
                $database->created_by === $user->id
            ) {
                return true;
            }
        }

        // 2. Collect all permission sets applicable to this user
        $permissionSets = collect();

        // Public permissions (group_id and role_id are null)
        $publicPerms = $database->databasePermissions()->whereNull('group_id')->whereNull('role_id')->first();
        if ($publicPerms) {
            $permissionSets->push($publicPerms->permissions);
        }

        if ($user) {
            // Group permissions
            $userGroupIds = $user->groups()->where('faction_id', $faction->id)->pluck('groups.id');
            $groupPerms = $database->databasePermissions()->whereIn('group_id', $userGroupIds)->get();
            foreach ($groupPerms as $gp) {
                $permissionSets->push($gp->permissions);
            }

            // Role permissions
            $userRoleIds = $user->roles()->where('faction_id', $faction->id)->pluck('roles.id');
            $rolePerms = $database->databasePermissions()->whereIn('role_id', $userRoleIds)->get();
            foreach ($rolePerms as $rp) {
                $permissionSets->push($rp->permissions);
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

    public static function hasStatisticsPermission(?User $user, StatisticsModel $model, string $permissionKey): bool
    {
        $faction = $model->faction;

        // 1. Superadmin/Faction Leader/Global Statistics Moderator/Creator always have access
        if ($user) {
            if ($user->is_superadmin || 
                $faction->faction_leader === $user->id || 
                self::hasFactionPermission($user, $faction, 'global_statistics_moderation') ||
                $model->created_by === $user->id
            ) {
                return true;
            }
        }

        // 2. Collect all permission sets applicable to this user
        $permissionSets = collect();

        // Public permissions (group_id and role_id are null)
        $publicPerms = $model->statisticsPermissions()->whereNull('group_id')->whereNull('role_id')->first();
        if ($publicPerms) {
            $permissionSets->push($publicPerms->permissions);
        }

        if ($user) {
            // Group permissions
            $userGroupIds = $user->groups()->where('faction_id', $faction->id)->pluck('groups.id');
            $groupPerms = $model->statisticsPermissions()->whereIn('group_id', $userGroupIds)->get();
            foreach ($groupPerms as $gp) {
                $permissionSets->push($gp->permissions);
            }

            // Role permissions
            $userRoleIds = $user->roles()->where('faction_id', $faction->id)->pluck('roles.id');
            $rolePerms = $model->statisticsPermissions()->whereIn('role_id', $userRoleIds)->get();
            foreach ($rolePerms as $rp) {
                $permissionSets->push($rp->permissions);
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

    public static function hasFormPermission(?User $user, Form $form, string $permissionKey): bool
    {
        $faction = $form->faction;

        // 1. Superadmin/Faction Leader/Global Form Moderator/Creator always have access
        if ($user) {
            if ($user->is_superadmin || 
                $faction->faction_leader === $user->id || 
                self::hasFactionPermission($user, $faction, 'global_faction_form_moderation') ||
                $form->created_by === $user->id
            ) {
                return true;
            }
        }

        // 2. Collect all permission sets applicable to this user
        $permissionSets = collect();

        // Public permissions (group_id and role_id are null)
        $publicPerms = $form->formPermissions()->whereNull('group_id')->whereNull('role_id')->first();
        if ($publicPerms) {
            $permissionSets->push($publicPerms->permissions);
        }

        if ($user) {
            // Group permissions
            $userGroupIds = $user->groups()->where('faction_id', $faction->id)->pluck('groups.id');
            $groupPerms = $form->formPermissions()->whereIn('group_id', $userGroupIds)->get();
            foreach ($groupPerms as $gp) {
                $permissionSets->push($gp->permissions);
            }

            // Role permissions
            $userRoleIds = $user->roles()->where('faction_id', $faction->id)->pluck('roles.id');
            $rolePerms = $form->formPermissions()->whereIn('role_id', $userRoleIds)->get();
            foreach ($rolePerms as $rp) {
                $permissionSets->push($rp->permissions);
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
