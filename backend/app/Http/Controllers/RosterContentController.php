<?php

namespace App\Http\Controllers;

use App\Models\RosterContent;
use App\Models\RosterSection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RosterContentController extends Controller
{
    public function store(Request $request, RosterSection $section)
    {
        $roster = $section->roster;
        $faction = $roster->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'type' => 'required|string|in:predefined,defined',
            'content' => 'nullable|array',
        ]);

        $maxOrder = $section->contents()->max('order') ?? -1;

        $content = $section->contents()->create([
            ...$validated,
            'order' => $maxOrder + 1,
            'created_by' => Auth::id(),
        ]);

        return response()->json($content, 201);
    }

    public function update(Request $request, RosterContent $content)
    {
        $section = $content->section;
        $faction = $section->roster->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'type' => 'sometimes|string|in:predefined,defined',
            'content' => 'sometimes|array',
            'order' => 'sometimes|integer',
        ]);

        $content->update($validated);

        return response()->json($content);
    }

    public function destroy(RosterContent $content)
    {
        $section = $content->section;
        $faction = $section->roster->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $content->delete();

        return response()->json(['message' => 'Content deleted']);
    }

    public function batchUpdate(Request $request, RosterSection $section)
    {
        $faction = $section->roster->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'contents' => 'required|array',
            'contents.*.id' => 'required|exists:roster_contents,id',
            'contents.*.content' => 'sometimes|array',
            'contents.*.type' => 'sometimes|string|in:predefined,defined',
            'contents.*.order' => 'sometimes|integer',
        ]);

        foreach ($request->contents as $item) {
            RosterContent::where('id', $item['id'])
                ->where('section_id', $section->id)
                ->update(collect($item)->only(['content', 'type', 'order'])->toArray());
        }

        return response()->json(['message' => 'Batch update successful']);
    }
}
