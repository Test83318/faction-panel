<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\Group;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GroupController extends Controller
{
    public function index($shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        $canManageAll = User::hasFactionPermission($user, $faction, 'view_groups');
        
        if ($canManageAll) {
            $groups = $faction->groups()->with('members', 'leaders')->get();
            return response()->json($groups);
        }

        // If not having global permission, check if user is a leader of any group in this faction
        $groups = $user->groups()
            ->where('faction_id', $faction->id)
            ->wherePivot('is_leader', true)
            ->with('members', 'leaders')
            ->get();

        return response()->json($groups);
    }

    public function store(Request $request, $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!User::hasFactionPermission(Auth::user(), $faction, 'create_groups')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
        ]);

        $group = $faction->groups()->create([
            ...$validated,
            'created_by' => Auth::id(),
        ]);

        return response()->json($group, 201);
    }

    public function update(Request $request, Group $group)
    {
        $faction = $group->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'modify_groups')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
        ]);

        $group->update($validated);

        return response()->json($group);
    }

    public function destroy(Group $group)
    {
        $faction = $group->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'remove_groups')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $group->delete();

        return response()->json(['message' => 'Group deleted']);
    }

    public function addMember(Request $request, Group $group)
    {
        $faction = $group->faction;
        $user = Auth::user();

        $isGlobalManager = User::hasFactionPermission($user, $faction, 'manage_group_members');
        $isGroupLeader = $group->leaders()->where('user_id', $user->id)->exists();

        if (!$isGlobalManager && !$isGroupLeader) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'is_leader' => 'sometimes|boolean'
        ]);

        $targetUserId = $request->user_id;
        $isLeader = $request->is_leader ?? false;

        // Group leaders cannot promote others to leaders
        if (!$isGlobalManager && $isLeader) {
            return response()->json(['message' => 'Group leaders cannot promote members to leaders'], 403);
        }

        // Check if user is in faction
        $targetUser = User::find($targetUserId);
        if (!$targetUser->factions()->where('faction_id', $faction->id)->exists()) {
            return response()->json(['message' => 'User is not a member of this faction'], 422);
        }

        $group->members()->syncWithoutDetaching([$targetUserId => ['is_leader' => $isLeader]]);

        return response()->json(['message' => 'Member added']);
    }

    public function removeMember(Request $request, Group $group, User $user)
    {
        $faction = $group->faction;
        $authUser = Auth::user();

        $isGlobalManager = User::hasFactionPermission($authUser, $faction, 'manage_group_members');
        $isGroupLeader = $group->leaders()->where('user_id', $authUser->id)->exists();

        if (!$isGlobalManager && !$isGroupLeader) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $targetPivot = $group->members()->where('user_id', $user->id)->first();
        if (!$targetPivot) {
            return response()->json(['message' => 'User not in group'], 404);
        }

        // Group leaders cannot remove other leaders
        if (!$isGlobalManager && $targetPivot->pivot->is_leader) {
             return response()->json(['message' => 'Group leaders cannot remove other leaders'], 403);
        }

        $group->members()->detach($user->id);

        return response()->json(['message' => 'Member removed']);
    }

    public function toggleLeader(Request $request, Group $group, User $user)
    {
        $faction = $group->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'manage_group_members')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $targetPivot = $group->members()->where('user_id', $user->id)->first();
        if (!$targetPivot) {
            return response()->json(['message' => 'User not in group'], 404);
        }

        $group->members()->updateExistingPivot($user->id, ['is_leader' => !$targetPivot->pivot->is_leader]);

        return response()->json(['message' => 'Leader status toggled']);
    }
}
