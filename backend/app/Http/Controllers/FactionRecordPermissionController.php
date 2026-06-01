<?php

namespace App\Http\Controllers;

use App\Models\FactionRecordDatabase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FactionRecordPermissionController extends Controller
{
    public function index(string $shortname, FactionRecordDatabase $database)
    {
        $faction = $database->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_faction_record_moderation') && $database->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('record_permission.index', "Viewed permissions for record database '{$database->name}'", $database->faction_id, $database);

        return response()->json($database->databasePermissions()->with(['group', 'role'])->get());
    }

    public function update(Request $request, string $shortname, FactionRecordDatabase $database)
    {
        $faction = $database->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_faction_record_moderation') && $database->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'nullable|exists:groups,id',
            'role_id' => 'nullable|exists:roles,id',
            'permissions' => 'required|array',
        ]);

        $existing = $database->databasePermissions()
            ->where('group_id', $validated['group_id'])
            ->where('role_id', $validated['role_id'])
            ->first();

        $oldValues = $existing ? $existing->getAttributes() : null;

        $permission = $database->databasePermissions()->updateOrCreate(
            [
                'group_id' => $validated['group_id'],
                'role_id' => $validated['role_id'],
            ],
            ['permissions' => $validated['permissions']]
        );

        $this->audit('record_permission.update', "Updated permission rule for record database '{$database->name}'", $database->faction_id, $permission, $oldValues, $permission->getAttributes());

        return response()->json($permission->load(['group', 'role']));
    }

    public function destroy(string $shortname, FactionRecordDatabase $database, $permissionId)
    {
        $faction = $database->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_faction_record_moderation') && $database->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $permission = $database->databasePermissions()->findOrFail($permissionId);

        $this->audit('record_permission.delete', "Deleted permission rule for record database '{$database->name}'", $database->faction_id, $permission, $permission->getAttributes());

        $permission->delete();

        return response()->json(['message' => 'Permission removed']);
    }
}
