<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\NotificationScheme;
use App\Models\NotificationSchemePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationSchemeController extends Controller
{
    public function index(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        $canConfigure = $user->is_superadmin ||
                        $faction->faction_leader === $user->id ||
                        User::hasFactionPermission($user, $faction, 'configure_notifications');

        $canView = $canConfigure ||
                   User::hasFactionPermission($user, $faction, 'view_notifications') ||
                   User::hasFactionPermission($user, $faction, 'administrator');

        if (! $canView) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $schemes = NotificationScheme::where('faction_id', $faction->id)
            ->with(['permissions.role', 'permissions.group'])
            ->get();

        $roles = $faction->roles()->orderBy('weight', 'desc')->get();
        $groups = $faction->groups()->orderBy('name')->get();
        $databases = $faction->recordDatabases()->get();
        $rosters = $faction->rosters()->get();

        return response()->json([
            'schemes' => $schemes,
            'roles' => $roles,
            'groups' => $groups,
            'databases' => $databases,
            'rosters' => $rosters,
            'can_configure' => $canConfigure,
        ]);
    }

    public function store(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        $canConfigure = $user->is_superadmin ||
                        $faction->faction_leader === $user->id ||
                        User::hasFactionPermission($user, $faction, 'configure_notifications') ||
                        User::hasFactionPermission($user, $faction, 'administrator');

        if (! $canConfigure) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_type' => 'required|string|in:database_entry_created,database_entry_updated,roster_row_created,roster_row_updated,faction_updated',
            'target_id' => 'nullable|integer',
            'conditions' => 'nullable|array',
            'read_type' => 'required|string|in:global,user_bound',
            'text_template' => 'nullable|string',
            'permissions' => 'required|array',
            'permissions.*.role_id' => 'nullable|integer|exists:roles,id',
            'permissions.*.group_id' => 'nullable|integer|exists:groups,id',
            'permissions.*.permissions' => 'required|array',
        ]);

        // Nullify text template if custom branding is not allowed
        if (! $faction->allow_branding) {
            $validated['text_template'] = null;
        }

        $scheme = NotificationScheme::create([
            'faction_id' => $faction->id,
            'name' => $validated['name'],
            'trigger_type' => $validated['trigger_type'],
            'target_id' => $validated['target_id'] ?? null,
            'conditions' => $validated['conditions'] ?? null,
            'read_type' => $validated['read_type'],
            'text_template' => $validated['text_template'] ?? null,
            'created_by' => $user->id,
        ]);

        // Save permissions
        foreach ($validated['permissions'] as $perm) {
            $scheme->permissions()->create([
                'role_id' => $perm['role_id'] ?? null,
                'group_id' => $perm['group_id'] ?? null,
                'permissions' => $perm['permissions'],
            ]);
        }

        $this->audit('notification_scheme.create', "Created notification scheme '{$scheme->name}'", $faction->id, $scheme);

        return response()->json($scheme->load(['permissions.role', 'permissions.group']), 201);
    }

    public function update(Request $request, NotificationScheme $scheme)
    {
        $user = Auth::user();
        $faction = $scheme->faction;

        $isLeaderOrSuper = $user->is_superadmin ||
                           $faction->faction_leader === $user->id ||
                           User::hasFactionPermission($user, $faction, 'administrator');

        $canManage = $isLeaderOrSuper || User::hasFactionPermission($user, $faction, 'configure_notifications');

        if (! $canManage) {
            // Check scheme-level permission
            $roleIds = $user->roles()->where('faction_id', $faction->id)->pluck('roles.id')->toArray();
            $groupIds = $user->groups()->where('faction_id', $faction->id)->pluck('groups.id')->toArray();

            $canManage = NotificationSchemePermission::where('notification_scheme_id', $scheme->id)
                ->where(function ($q) use ($roleIds, $groupIds) {
                    $q->whereIn('role_id', $roleIds)
                        ->orWhereIn('group_id', $groupIds)
                        ->orWhere(function ($sub) {
                            $sub->whereNull('role_id')->whereNull('group_id');
                        });
                })
                ->whereJsonContains('permissions', 'manage')
                ->exists();
        }

        if (! $canManage) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'trigger_type' => 'sometimes|required|string|in:database_entry_created,database_entry_updated,roster_row_created,roster_row_updated,faction_updated',
            'target_id' => 'nullable|integer',
            'conditions' => 'nullable|array',
            'read_type' => 'sometimes|required|string|in:global,user_bound',
            'text_template' => 'nullable|string',
            'permissions' => 'sometimes|required|array',
            'permissions.*.role_id' => 'nullable|integer|exists:roles,id',
            'permissions.*.group_id' => 'nullable|integer|exists:groups,id',
            'permissions.*.permissions' => 'required|array',
        ]);

        if (! $faction->allow_branding) {
            $validated['text_template'] = null;
        }

        $oldValues = $scheme->getOriginal();
        $scheme->update(collect($validated)->only(['name', 'trigger_type', 'target_id', 'conditions', 'read_type', 'text_template'])->toArray());

        if (isset($validated['permissions'])) {
            // Sync permissions by deleting old and creating new
            $scheme->permissions()->delete();
            foreach ($validated['permissions'] as $perm) {
                $scheme->permissions()->create([
                    'role_id' => $perm['role_id'] ?? null,
                    'group_id' => $perm['group_id'] ?? null,
                    'permissions' => $perm['permissions'],
                ]);
            }
        }

        $this->audit('notification_scheme.update', "Updated notification scheme '{$scheme->name}'", $faction->id, $scheme, $oldValues, $scheme->getDirty());

        return response()->json($scheme->load(['permissions.role', 'permissions.group']));
    }

    public function destroy(NotificationScheme $scheme)
    {
        $user = Auth::user();
        $faction = $scheme->faction;

        $isLeaderOrSuper = $user->is_superadmin ||
                           $faction->faction_leader === $user->id ||
                           User::hasFactionPermission($user, $faction, 'administrator');

        $canManage = $isLeaderOrSuper || User::hasFactionPermission($user, $faction, 'configure_notifications');

        if (! $canManage) {
            $roleIds = $user->roles()->where('faction_id', $faction->id)->pluck('roles.id')->toArray();
            $groupIds = $user->groups()->where('faction_id', $faction->id)->pluck('groups.id')->toArray();

            $canManage = NotificationSchemePermission::where('notification_scheme_id', $scheme->id)
                ->where(function ($q) use ($roleIds, $groupIds) {
                    $q->whereIn('role_id', $roleIds)
                        ->orWhereIn('group_id', $groupIds)
                        ->orWhere(function ($sub) {
                            $sub->whereNull('role_id')->whereNull('group_id');
                        });
                })
                ->whereJsonContains('permissions', 'manage')
                ->exists();
        }

        if (! $canManage) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('notification_scheme.delete', "Deleted notification scheme '{$scheme->name}'", $faction->id, $scheme, $scheme->getAttributes());

        $scheme->delete();

        return response()->json(['message' => 'Notification scheme deleted']);
    }
}
