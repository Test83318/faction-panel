<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class FactionController extends Controller
{
    public function index()
    {
        return Auth::user()->factions()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shortname' => 'required|string|unique:factions,shortname|max:20|alpha_dash',
            'name' => 'required|string|max:255',
            'color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'image_url' => 'nullable|url|max:2048',
            'visibility' => ['required', Rule::in(['public', 'hidden', 'joinable', 'invite-only', 'private'])],
            'gtaw_faction_id' => 'nullable|integer|unique:factions,gtaw_faction_id',
        ]);

        $faction = Faction::create([
            ...$validated,
            'faction_leader' => Auth::id(),
            'created_by' => Auth::id(),
        ]);

        // Creator automatically joins the faction
        $faction->users()->attach(Auth::id());

        // Create Default Roles
        $adminRole = $faction->roles()->create(['name' => 'Administrator', 'weight' => 100, 'color' => '#ef4444']);
        $userRole = $faction->roles()->create(['name' => 'User', 'weight' => 1, 'color' => '#d1d5db']);
        $publicRole = $faction->roles()->create(['name' => 'Public', 'weight' => 0, 'color' => '#d1d5db']);

        // Assign creator to Admin role
        Auth::user()->roles()->attach($adminRole->id);

        // Assign permissions
        $allPermissions = config('permissions.categories');
        
        foreach ($allPermissions as $category) {
            foreach ($category['permissions'] as $key => $details) {
                // Admin gets YES for everything
                $adminRole->permissions()->create(['permission_key' => $key, 'value' => 'YES']);
                
                // User gets basic
                $userValue = ($key === 'view_faction_roster') ? 'YES' : 'NO';
                $userRole->permissions()->create(['permission_key' => $key, 'value' => $userValue]);

                // Public gets nothing by default
                $publicRole->permissions()->create(['permission_key' => $key, 'value' => 'NO']);
            }
        }

        return response()->json($faction, 201);
    }

    public function show(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::guard('sanctum')->user();

        if (!User::hasFactionPermission($user, $faction, 'view_faction_roster')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($user) {
            $highestRole = $user->roles()
                ->where('faction_id', $faction->id)
                ->orderByDesc('weight')
                ->first();
                
            $faction->user_highest_role = $highestRole;
        }

        return $faction;
    }
    public function update(Request $request, Faction $faction)
    {
        // Only leader or superadmin can update
        if ($faction->faction_leader !== Auth::id() && !Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'shortname' => ['sometimes', 'string', Rule::unique('factions')->ignore($faction->id), 'max:20', 'alpha_dash'],
            'name' => 'sometimes|string|max:255',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'image_url' => 'nullable|url|max:2048',
            'visibility' => ['sometimes', Rule::in(['public', 'hidden', 'joinable', 'invite-only', 'private'])],
            'gtaw_faction_id' => ['sometimes', 'nullable', 'integer', Rule::unique('factions')->ignore($faction->id)],
            'faction_leader' => 'sometimes|exists:users,id',
        ]);

        $faction->update($validated);

        return $faction;
    }

    public function destroy(Faction $faction)
    {
        if ($faction->faction_leader !== Auth::id() && !Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $faction->delete();

        return response()->json(['message' => 'Faction deleted']);
    }

    public function join(Request $request)
    {
        $request->validate([
            'shortname' => 'required|string|exists:factions,shortname',
        ]);

        $faction = Faction::where('shortname', $request->shortname)->firstOrFail();
        
        // Only allow joining if visibility is 'joinable'
        if ($faction->visibility !== 'joinable') {
            return response()->json(['message' => 'This faction is not currently open for joining.'], 403);
        }

        if ($faction->users()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Already a member'], 400);
        }

        $faction->users()->attach(Auth::id());

        return response()->json(['message' => 'Joined successfully']);
    }

    public function leave(Faction $faction)
    {
        if ($faction->faction_leader === Auth::id()) {
            return response()->json(['message' => 'Leaders cannot leave. Transfer leadership first.'], 400);
        }

        $faction->users()->detach(Auth::id());

        return response()->json(['message' => 'Left successfully']);
    }

    public function getAllFactions()
    {
        // Users see public, joinable, and invite-only (maybe? user said hidden doesn't appear)
        // Hidden same as public but doesn't appear on faction page.
        // Private nobody can join (probably hide too).
        return Faction::whereIn('visibility', ['public', 'joinable', 'invite-only'])
            ->get(['name', 'shortname', 'color', 'image_url', 'visibility']);
    }

    public function getPermissions(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::guard('sanctum')->user();

        $allPermissions = config('permissions.categories');
        $permissions = [];

        foreach ($allPermissions as $category) {
            foreach ($category['permissions'] as $key => $details) {
                if (User::hasFactionPermission($user, $faction, $key)) {
                    $permissions[] = $key;
                }
            }
        }

        return $permissions;
    }

    public function getMembers(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        if (!User::hasFactionPermission(Auth::user(), $faction, 'view_users')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $users = $faction->users()->with(['roles' => function($query) use ($faction) {
            $query->where('faction_id', $faction->id);
        }])->get();

        return $users;
    }

    public function removeMember(Faction $faction, User $user)
    {
        if (!User::hasFactionPermission(Auth::user(), $faction, 'remove_users')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($faction->faction_leader === $user->id) {
            return response()->json(['message' => 'Cannot remove the faction leader.'], 403);
        }

        $faction->users()->detach($user->id);
        
        // Also remove faction roles
        $roles = $faction->roles()->pluck('roles.id');
        $user->roles()->detach($roles);

        return response()->json(['message' => 'User removed from faction.']);
    }

    public function updateMemberRoles(Faction $faction, User $user, Request $request)
    {
        if (!User::hasFactionPermission(Auth::user(), $faction, 'change_ranks')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($faction->faction_leader === $user->id) {
            return response()->json(['message' => 'Cannot change the rank of the faction leader.'], 403);
        }

        $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        // Ensure roles belong to the faction
        $validRoles = $faction->roles()->pluck('roles.id')->toArray();
        foreach ($request->role_ids as $id) {
            if (!in_array($id, $validRoles)) {
                return response()->json(['message' => 'Invalid role for this faction.'], 400);
            }
        }

        // Sync roles for this faction
        $otherRoles = $user->roles()->where('faction_id', '!=', $faction->id)->pluck('roles.id')->toArray();
        $user->roles()->sync(array_merge($otherRoles, $request->role_ids));

        return response()->json(['message' => 'User roles updated.']);
    }
}
