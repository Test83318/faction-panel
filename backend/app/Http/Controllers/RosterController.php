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
        
        // Check if user has permission to view rosters (generic view_faction_roster)
        if (!User::hasFactionPermission(Auth::user(), $faction, 'view_faction_roster')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $rosters = $faction->rosters()->with(['rootSections.children'])->orderBy('order')->get();
        return response()->json($rosters);
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

        $roster = $faction->rosters()->create([
            ...$validated,
            'order' => $maxOrder + 1,
            'created_by' => Auth::id(),
        ]);

        return response()->json($roster, 201);
    }

    public function update(Request $request, Roster $roster)
    {
        $faction = $roster->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'shortname' => 'sometimes|string|max:6',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'roster_options' => 'nullable|array',
        ]);

        if (isset($validated['shortname'])) {
            $validated['shortname'] = strtoupper($validated['shortname']);
        }

        $roster->update($validated);

        return response()->json($roster);
    }

    public function destroy(Roster $roster)
    {
        $faction = $roster->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
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
