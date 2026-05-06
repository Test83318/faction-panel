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
        $user = Auth::user();
        $createdFactionsCount = Faction::where('created_by', $user->id)->count();

        if ($createdFactionsCount >= $user->max_factions) {
            return response()->json([
                'message' => "You have reached your limit of {$user->max_factions} created factions."
            ], 403);
        }

        $validated = $request->validate([
            'shortname' => ['required', 'string', 'unique:factions,shortname', 'max:20', 'regex:/^[a-z0-9\-_]+$/'],
            'name' => 'required|string|max:255',
            'color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'image_url' => 'nullable|url|max:2048',
            'visibility' => ['required', Rule::in(['public', 'hidden', 'private'])],
            'access' => ['required', Rule::in(['joinable', 'invite-only', 'private'])],
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
        $adminRole = $faction->roles()->create(['name' => 'Administrator', 'weight' => 100, 'color' => '#ef4444', 'type' => 'primary']);
        $userRole = $faction->roles()->create(['name' => 'User', 'weight' => 1, 'color' => '#d1d5db', 'type' => 'primary']);
        $publicRole = $faction->roles()->create(['name' => 'Public', 'weight' => 0, 'color' => '#d1d5db', 'type' => 'secondary']);

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

        $allPermissionsConfig = config('permissions.categories');
        $permissions = [];

        foreach ($allPermissionsConfig as $category) {
            foreach ($category['permissions'] as $key => $details) {
                if (User::hasFactionPermission($user, $faction, $key)) {
                    $permissions[] = $key;
                }
            }
        }

        $canViewGlobal = in_array('view_faction_roster', $permissions);
        
        // Faction Detail View Check
        if (!$canViewGlobal) {
            $canViewAnyRoster = false;
            foreach ($faction->rosters as $roster) {
                if (User::hasRosterPermission($user, $roster, 'view_roster')) {
                    $canViewAnyRoster = true;
                    break;
                }
            }
            if (!$canViewAnyRoster) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        if ($user) {
            $primaryRole = $user->roles()
                ->where('faction_id', $faction->id)
                ->where('type', 'primary')
                ->first();

            $highestRole = $user->roles()
                ->where('faction_id', $faction->id)
                ->orderByDesc('weight')
                ->first();
                
            $faction->user_highest_role = $highestRole;
            $faction->user_primary_role = $primaryRole ?? $highestRole;
        }

        // Include Roster Data
        $rosters = $faction->rosters()
            ->with(['rootSections.children.children.contents', 'rootSections.children.contents', 'rootSections.contents'])
            ->orderBy('order')
            ->orderBy('id')
            ->get();
        
        $filteredRosters = $rosters->filter(function ($roster) use ($user, $canViewGlobal) {
            return $canViewGlobal || User::hasRosterPermission($user, $roster, 'view_roster');
        })->values();

        $filteredRosters->each(function ($roster) use ($user) {
            $canViewHidden = User::hasRosterPermission($user, $roster, 'view_hidden_data');
            
            $perms = [
                'view_roster' => User::hasRosterPermission($user, $roster, 'view_roster'),
                'modify_roster' => User::hasRosterPermission($user, $roster, 'modify_roster'),
                'manage_columns' => User::hasRosterPermission($user, $roster, 'manage_columns'),
                'manage_layout' => User::hasRosterPermission($user, $roster, 'manage_layout'),
                'add_sections' => User::hasRosterPermission($user, $roster, 'add_sections'),
                'remove_sections' => User::hasRosterPermission($user, $roster, 'remove_sections'),
                'edit_predefined' => User::hasRosterPermission($user, $roster, 'edit_predefined'),
                'edit_defined_fields' => User::hasRosterPermission($user, $roster, 'edit_defined_fields'),
                'view_hidden_data' => $canViewHidden,
            ];
            $roster->user_roster_permissions = $perms;
        });

        // Include Datasets
        $datasets = $faction->rosterDatasets()
            ->with('options')
            ->get();

        // Include Flags
        $flags = $faction->rosterFlags()->get();

        // Include Published Record Databases & Entries
        $publishedDatabases = $faction->recordDatabases()
            ->where('is_published', true)
            ->with(['entries' => function ($query) {
                $query->where('is_active', true);
            }])
            ->get();

        return response()->json([
            'faction' => $faction,
            'permissions' => $permissions,
            'rosters' => $filteredRosters,
            'datasets' => $datasets,
            'flags' => $flags,
            'record_data' => $publishedDatabases
        ]);
    }
    public function update(Request $request, Faction $faction)
    {
        if (!User::hasFactionPermission(Auth::user(), $faction, 'modify_faction_details')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = Auth::user();
        $premiumFields = [
            'header_image_dark', 
            'header_image_light',
            'favicon', 
            'header_link_to_faction', 
            'hide_panel_header', 
            'custom_footer_text', 
            'header_bg_color', 
            'header_gradient_enabled', 
            'header_gradient_color', 
            'header_gradient_direction'
        ];

        $attemptingPremium = false;
        foreach ($premiumFields as $field) {
            if ($request->has($field)) {
                $attemptingPremium = true;
                break;
            }
        }

        if ($attemptingPremium && !$user->allow_custom_branding) {
             return response()->json([
                'message' => 'Advanced branding is a restricted feature.'
            ], 403);
        }

        $validated = $request->validate([
            'shortname' => ['sometimes', 'string', Rule::unique('factions')->ignore($faction->id), 'max:20', 'alpha_dash'],
            'name' => 'sometimes|string|max:255',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'image_url' => 'nullable|url|max:2048',
            'header_image_dark' => 'nullable|url|max:2048',
            'header_image_light' => 'nullable|url|max:2048',
            'favicon' => 'nullable|url|max:2048',
            'header_link_to_faction' => 'sometimes|boolean',
            'hide_panel_header' => 'sometimes|boolean',
            'custom_footer_text' => 'nullable|string|max:255',
            'header_bg_color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'header_gradient_enabled' => 'sometimes|boolean',
            'header_gradient_color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'header_gradient_direction' => ['sometimes', Rule::in(['to-r', 'to-l', 'to-t', 'to-b', 'to-tr', 'to-tl', 'to-br', 'to-bl'])],
            'visibility' => ['sometimes', Rule::in(['public', 'hidden', 'private'])],
            'access' => ['sometimes', Rule::in(['joinable', 'invite-only', 'private'])],
            'gtaw_faction_id' => ['sometimes', 'nullable', 'integer', Rule::unique('factions')->ignore($faction->id)],
            'faction_leader' => 'sometimes|exists:users,id',
            'roster_template' => 'sometimes|nullable|array',
        ]);

        if (isset($validated['faction_leader']) && $faction->faction_leader !== Auth::id() && !Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Only the faction leader can transfer leadership.'], 403);
        }

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
        
        // Only allow joining if access is 'joinable'
        if ($faction->access !== 'joinable') {
            return response()->json(['message' => 'This faction is not currently open for joining.'], 403);
        }

        if ($faction->users()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Already a member'], 400);
        }

        $faction->users()->attach(Auth::id());

        // Assign default User role
        $userRole = $faction->roles()->where('name', 'User')->first();
        if ($userRole) {
            Auth::user()->roles()->attach($userRole->id);
        }

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
        // Users only see factions with 'public' visibility
        return Faction::with('creator.membershipTier')
            ->where('visibility', 'public')
            ->get();
    }

    public function getPermissions(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::guard('sanctum')->user();

        $allPermissions = config('permissions.categories', []);
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

        $myWeight = Auth::user()->getHighestRoleWeight($faction->id);
        $targetWeight = $user->getHighestRoleWeight($faction->id);

        if ($targetWeight >= $myWeight) {
            return response()->json(['message' => 'Cannot remove a user with equal or higher weight than your own.'], 403);
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

        $myWeight = Auth::user()->getHighestRoleWeight($faction->id);
        $targetWeight = $user->getHighestRoleWeight($faction->id);

        if ($targetWeight >= $myWeight && !Auth::user()->is_superadmin && $faction->faction_leader !== Auth::id()) {
            return response()->json(['message' => 'Cannot change roles of a user with equal or higher weight than your own.'], 403);
        }

        $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        // Ensure roles belong to the faction
        $roles = $faction->roles()->whereIn('roles.id', $request->role_ids)->get();
        if ($roles->count() !== count($request->role_ids)) {
            return response()->json(['message' => 'Invalid role for this faction.'], 400);
        }

        // Check for multiple primary roles
        $primaryRoles = $roles->where('type', 'primary');
        if ($primaryRoles->count() > 1) {
            return response()->json(['message' => 'A user can only have one primary rank.'], 400);
        }

        // Hierarchy check for assigned roles
        foreach ($roles as $role) {
            if ($role->weight >= $myWeight) {
                return response()->json(['message' => "Cannot assign role '{$role->name}' as it has equal or higher weight than your own."], 403);
            }
        }

        // Sync roles for this faction
        $otherRoles = $user->roles()->where('faction_id', '!=', $faction->id)->pluck('roles.id')->toArray();
        $user->roles()->sync(array_merge($otherRoles, $request->role_ids));

        return response()->json(['message' => 'User roles updated.']);
    }
}
