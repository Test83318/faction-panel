<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\RosterFlag;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RosterFlagController extends Controller
{
    public function index($shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        return response()->json($faction->rosterFlags()->get());
    }

    public function store(Request $request, $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        if (!User::hasFactionPermission(Auth::user(), $faction, 'modify_roster_flags')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'rules' => 'array',
        ]);

        $flag = $faction->rosterFlags()->create([
            'name' => $validated['name'],
            'icon' => $validated['icon'] ?? 'Flag',
            'color' => $validated['color'] ?? '#3b82f6',
            'rules' => $validated['rules'] ?? [],
            'created_by' => Auth::id(),
        ]);

        return response()->json($flag, 201);
    }

    public function update(Request $request, RosterFlag $flag)
    {
        if (!User::hasFactionPermission(Auth::user(), $flag->faction, 'modify_roster_flags')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'icon' => 'sometimes|nullable|string|max:50',
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'rules' => 'sometimes|array',
        ]);

        $flag->update($validated);

        return response()->json($flag);
    }

    public function destroy(RosterFlag $flag)
    {
        if (!User::hasFactionPermission(Auth::user(), $flag->faction, 'modify_roster_flags')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $flag->delete();

        return response()->json(['message' => 'Flag deleted']);
    }
}
