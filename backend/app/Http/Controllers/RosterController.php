<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\Roster;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RosterController extends Controller
{
    public function index($shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        // If user has view_faction_roster, they see everything by default.
        // If not, they might still see specific rosters if they have permission.
        $isGlobalViewer = User::hasFactionPermission($user, $faction, 'view_faction_roster');
        
        $rosters = $faction->rosters()
            ->with(['rootSections.children.contents', 'rootSections.contents'])
            ->orderBy('order')
            ->get();
        
        $filteredRosters = $rosters->filter(function ($roster) use ($user, $isGlobalViewer) {
            return $isGlobalViewer || User::hasRosterPermission($user, $roster, 'view_roster');
        });

        if ($filteredRosters->isEmpty() && !$isGlobalViewer) {
             // If they have no global permission and no specific roster permissions, they get Forbidden
             return response()->json(['message' => 'Forbidden'], 403);
        }

        $filteredRosters->each(function ($roster) use ($user) {
            $perms = [
                'view_roster' => User::hasRosterPermission($user, $roster, 'view_roster'),
                'modify_roster' => User::hasRosterPermission($user, $roster, 'modify_roster'),
                'manage_columns' => User::hasRosterPermission($user, $roster, 'manage_columns'),
                'add_sections' => User::hasRosterPermission($user, $roster, 'add_sections'),
                'remove_sections' => User::hasRosterPermission($user, $roster, 'remove_sections'),
                'edit_predefined' => User::hasRosterPermission($user, $roster, 'edit_predefined'),
                'edit_defined_fields' => User::hasRosterPermission($user, $roster, 'edit_defined_fields'),
            ];
            $roster->user_roster_permissions = $perms;
        });

        return response()->json($filteredRosters->values());
    }

    public function store(Request $request, $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!User::hasFactionPermission(Auth::user(), $faction, 'create_roster')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'shortname' => 'required|string|max:6', // limited to 6 characters, uppercase will be handled or validated
            'color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'roster_options' => 'nullable|array',
        ]);

        $validated['shortname'] = strtoupper($validated['shortname']);
        
        // Get next order
        $maxOrder = $faction->rosters()->max('order') ?? -1;

        $defaultColumns = [
            ['id' => 'rank', 'name' => 'Rank', 'type' => 'dropdown', 'options' => [], 'checkboxes' => ['Acting']],
            ['id' => 'name', 'name' => 'Name', 'type' => 'text', 'checkboxes' => ['LOA']],
            ['id' => 'position', 'name' => 'Position', 'type' => 'text', 'checkboxes' => []],
            ['id' => 'callsign', 'name' => 'Callsign', 'type' => 'text', 'checkboxes' => []]
        ];

        $roster = $faction->rosters()->create([
            ...$validated,
            'order' => $maxOrder + 1,
            'columns' => $validated['columns'] ?? $defaultColumns,
            'created_by' => Auth::id(),
        ]);

        return response()->json($roster, 201);
    }

    public function update(Request $request, Roster $roster)
    {
        if (!User::hasRosterPermission(Auth::user(), $roster, 'modify_roster')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'shortname' => 'sometimes|string|max:6',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'roster_options' => 'nullable|array',
            'columns' => 'nullable|array',
        ]);

        if (isset($validated['shortname'])) {
            $validated['shortname'] = strtoupper($validated['shortname']);
        }

        $roster->update($validated);

        return response()->json($roster);
    }

    public function destroy(Roster $roster)
    {
        if (!User::hasRosterPermission(Auth::user(), $roster, 'modify_roster')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $roster->delete();

        return response()->json(['message' => 'Roster deleted']);
    }

    public function reorder(Request $request, $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'roster_ids' => 'required|array',
            'roster_ids.*' => 'exists:rosters,id',
        ]);

        foreach ($request->roster_ids as $index => $id) {
            Roster::where('id', $id)->where('faction_id', $faction->id)->update(['order' => $index]);
        }

        return response()->json(['message' => 'Order updated']);
    }
}
