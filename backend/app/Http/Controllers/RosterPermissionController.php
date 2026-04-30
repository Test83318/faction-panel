<?php

namespace App\Http\Controllers;

use App\Models\Roster;
use App\Models\RosterPermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RosterPermissionController extends Controller
{
    public function index(Roster $roster)
    {
        $faction = $roster->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation') && $roster->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($roster->rosterPermissions()->with('group')->get());
    }

    public function update(Request $request, Roster $roster)
    {
        $faction = $roster->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation') && $roster->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'nullable|exists:groups,id', // NULL for Public
            'permissions' => 'required|array',
        ]);

        $rosterPermission = $roster->rosterPermissions()->updateOrCreate(
            ['group_id' => $validated['group_id']],
            ['permissions' => $validated['permissions']]
        );

        return response()->json($rosterPermission->load('group'));
    }

    public function destroy(Roster $roster, $permissionId)
    {
        $faction = $roster->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation') && $roster->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $permission = $roster->rosterPermissions()->findOrFail($permissionId);
        $permission->delete();

        return response()->json(['message' => 'Permission removed']);
    }
}
