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
        ]);

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

        if (!$this->can($faction, 'modify_ranks')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'weight' => 'sometimes|integer',
        ]);

        $role->update($validated);

        return $role;
    }

    public function destroy(Role $role)
    {
        $faction = $role->faction;

        if (!$this->can($faction, 'delete_ranks')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($role->name === 'Administrator') {
            return response()->json(['message' => 'Cannot delete Administrator role'], 400);
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
