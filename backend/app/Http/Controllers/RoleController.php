<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleController extends Controller
{
    public function index(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        if (!$this->can($faction, 'view_permissions')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $faction->roles()->with('permissions')->orderBy('weight', 'desc')->get();
    }

    public function store(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!$this->can($faction, 'create_ranks')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'weight' => 'required|integer',
            'color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'type' => 'required|string|in:primary,secondary',
        ]);

        if ($validated['weight'] >= Auth::user()->getHighestRoleWeight($faction->id)) {
            return response()->json(['message' => 'Cannot create a role with weight equal to or higher than your own.'], 403);
        }

        $role = $faction->roles()->create($validated);

        // Initialize permissions with default NO
        $allPermissions = config('permissions.categories');
        foreach ($allPermissions as $category) {
            foreach ($category['permissions'] as $key => $details) {
                $role->permissions()->create(['permission_key' => $key, 'value' => 'NO']);
            }
        }

        return $role->load('permissions');
    }

    public function update(Request $request, Role $role)
    {
        $faction = $role->faction;
        $userWeight = Auth::user()->getHighestRoleWeight($faction->id);

        if (!$this->can($faction, 'modify_ranks')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($role->weight >= $userWeight) {
            return response()->json(['message' => 'Cannot modify a role with weight equal to or higher than your own.'], 403);
        }

        $systemRoles = ['Administrator', 'User', 'Public'];
        if (in_array($role->name, $systemRoles)) {
            return response()->json(['message' => 'Cannot modify core system roles'], 400);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'weight' => 'sometimes|integer',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'type' => 'sometimes|string|in:primary,secondary',
        ]);

        if (isset($validated['weight']) && $validated['weight'] >= $userWeight) {
            return response()->json(['message' => 'Cannot set weight equal to or higher than your own.'], 403);
        }

        $role->update($validated);

        return $role;
    }

    public function destroy(Role $role)
    {
        $faction = $role->faction;

        if (!$this->can($faction, 'delete_ranks')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($role->weight >= Auth::user()->getHighestRoleWeight($faction->id)) {
            return response()->json(['message' => 'Cannot delete a role with weight equal to or higher than your own.'], 403);
        }

        $protectedRoles = ['Administrator', 'User', 'Public'];
        if (in_array($role->name, $protectedRoles)) {
            return response()->json(['message' => "Cannot delete the {$role->name} role as it is a core system role."], 400);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted']);
    }

    public function updatePermissions(Request $request, Role $role)
    {
        $faction = $role->faction;

        if (!$this->can($faction, 'modify_permissions')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($role->weight >= Auth::user()->getHighestRoleWeight($faction->id)) {
            return response()->json(['message' => 'Cannot modify permissions for a role with weight equal to or higher than your own.'], 403);
        }

        if ($role->name === 'Administrator') {
            return response()->json(['message' => 'Administrator permissions are locked and cannot be modified.'], 400);
        }

        $request->validate([
            'permissions' => 'required|array',
            'permissions.*.key' => 'required|string',
            'permissions.*.value' => 'required|in:YES,NO,NEVER',
        ]);

        foreach ($request->permissions as $perm) {
            $role->permissions()->updateOrCreate(
                ['permission_key' => $perm['key']],
                ['value' => $perm['value']]
            );
        }

        return response()->json(['message' => 'Permissions updated']);
    }

    public function getGlobalConfig()
    {
        return response()->json(config('permissions.categories'));
    }

    private function can(Faction $faction, string $permission)
    {
        return Auth::user()->hasPermission($permission, $faction->id);
    }
}
