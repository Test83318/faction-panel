<?php

namespace App\Http\Controllers;

use App\Models\Roster;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RosterPermissionController extends Controller
{
    public function index(Roster $roster)
    {
        $faction = $roster->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation') && $roster->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($roster->rosterPermissions()->with(['group', 'role'])->get());
    }

    public function update(Request $request, Roster $roster)
    {
        $faction = $roster->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation') && $roster->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'nullable|exists:groups,id', // NULL for Public or when role is set
            'role_id' => 'nullable|exists:roles,id',
            'permissions' => 'required|array',
        ]);

        // If both are null, it's public. If one is set, it's for that specific target.
        $rosterPermission = $roster->rosterPermissions()->updateOrCreate(
            [
                'group_id' => $validated['group_id'],
                'role_id' => $validated['role_id'],
            ],
            ['permissions' => $validated['permissions']]
        );

        return response()->json($rosterPermission->load(['group', 'role']));
    }

    public function destroy(Roster $roster, $permissionId)
    {
        $faction = $roster->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation') && $roster->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $permission = $roster->rosterPermissions()->findOrFail($permissionId);
        $permission->delete();

        return response()->json(['message' => 'Permission removed']);
    }
}
