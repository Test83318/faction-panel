<?php

namespace App\Http\Controllers;

use App\Models\FactionRecordDatabase;
use App\Models\FactionRecordDatabasePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FactionRecordPermissionController extends Controller
{
    public function index(string $shortname, FactionRecordDatabase $database)
    {
        $faction = $database->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_faction_record_moderation') && $database->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($database->databasePermissions()->with('group')->get());
    }

    public function update(Request $request, string $shortname, FactionRecordDatabase $database)
    {
        $faction = $database->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_faction_record_moderation') && $database->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'nullable|exists:groups,id',
            'permissions' => 'required|array',
        ]);

        $permission = $database->databasePermissions()->updateOrCreate(
            ['group_id' => $validated['group_id']],
            ['permissions' => $validated['permissions']]
        );

        return response()->json($permission->load('group'));
    }

    public function destroy(string $shortname, FactionRecordDatabase $database, $permissionId)
    {
        $faction = $database->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_faction_record_moderation') && $database->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $permission = $database->databasePermissions()->findOrFail($permissionId);
        $permission->delete();

        return response()->json(['message' => 'Permission removed']);
    }
}
