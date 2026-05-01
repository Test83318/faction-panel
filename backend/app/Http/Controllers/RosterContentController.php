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
        $user = Auth::user();

        if (!User::hasRosterPermission($user, $roster, 'edit_predefined')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'type' => 'required|string|in:predefined,defined',
            'content' => 'nullable|array',
        ]);

        if (isset($validated['content'])) {
            $canViewHidden = User::hasRosterPermission($user, $roster, 'view_hidden_data');
            
            if (!$canViewHidden) {
                $hiddenColIds = collect($roster->columns ?? [])
                    ->filter(fn($col) => str_contains($col['type'] ?? '', 'hidden'))
                    ->pluck('id')
                    ->toArray();

                foreach ($hiddenColIds as $colId) {
                    if (array_key_exists($colId, $validated['content'])) {
                        unset($validated['content'][$colId]);
                    }
                }
            }
        }

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
        $roster = $content->section->roster;

        $user = Auth::user();
        $canEditDefined = User::hasRosterPermission($user, $roster, 'edit_defined_fields');
        $canEditPredefined = User::hasRosterPermission($user, $roster, 'edit_predefined');

        if (!$canEditDefined && !$canEditPredefined) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'type' => 'sometimes|string|in:predefined,defined',
            'content' => 'sometimes|array',
            'order' => 'sometimes|integer',
        ]);

        if (isset($validated['content'])) {
            $canViewHidden = User::hasRosterPermission($user, $roster, 'view_hidden_data');
            
            if (!$canViewHidden) {
                $hiddenColIds = collect($roster->columns ?? [])
                    ->filter(fn($col) => str_contains($col['type'] ?? '', 'hidden'))
                    ->pluck('id')
                    ->toArray();

                foreach ($hiddenColIds as $colId) {
                    if (array_key_exists($colId, $validated['content'])) {
                        // Remove hidden columns from update if user lacks permission
                        unset($validated['content'][$colId]);
                    }
                }
            }
        }

        $content->update($validated);

        return response()->json($content);
    }

    public function destroy(RosterContent $content)
    {
        $roster = $content->section->roster;

        if (!User::hasRosterPermission(Auth::user(), $roster, 'edit_predefined')) {
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
