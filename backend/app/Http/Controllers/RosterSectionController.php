<?php

namespace App\Http\Controllers;

use App\Models\Roster;
use App\Models\RosterSection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RosterSectionController extends Controller
{
    public function store(Request $request, Roster $roster)
    {
        if (!User::hasRosterPermission(Auth::user(), $roster, 'add_sections')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'shortname' => 'required|string|max:6',
            'color' => ['nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'type' => 'required|in:master,section,subsection,content',
            'parent_id' => 'nullable|exists:roster_sections,id',
            'section_options' => 'nullable|array',
            'columns' => 'nullable|array',
            'layout_settings' => 'nullable|array',
            'subsections_per_row' => 'nullable|integer|min:1|max:3',
            'content_html' => 'nullable|string',
        ]);

        $validated['shortname'] = strtoupper($validated['shortname']);
        
        // Validation: master sections cannot have parents
        if ($validated['type'] === 'master' && !empty($validated['parent_id'])) {
            return response()->json(['message' => 'Master sections cannot have a parent'], 422);
        }

        // Only one master section per roster
        if ($validated['type'] === 'master') {
            $exists = $roster->sections()->where('type', 'master')->exists();
            if ($exists) {
                return response()->json(['message' => 'A master section already exists for this roster.'], 422);
            }
        }

        // Get next order within the same parent or root
        $maxOrder = $roster->sections()
            ->where('parent_id', $validated['parent_id'] ?? null)
            ->max('order') ?? -1;

        $columns = $validated['columns'] ?? $roster->columns;

        $section = $roster->sections()->create([
            ...$validated,
            'columns' => $columns,
            'order' => $maxOrder + 1,
            'created_by' => Auth::id(),
        ]);

        return response()->json($section, 201);
    }

    public function update(Request $request, RosterSection $section)
    {
        if (!User::hasRosterPermission(Auth::user(), $section->roster, 'add_sections')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'shortname' => 'sometimes|string|max:6',
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'type' => 'sometimes|in:master,section,subsection,content',
            'parent_id' => 'sometimes|nullable|exists:roster_sections,id',
            'section_options' => 'sometimes|nullable|array',
            'columns' => 'sometimes|nullable|array',
            'layout_settings' => 'sometimes|nullable|array',
            'subsections_per_row' => 'sometimes|nullable|integer|min:1|max:3',
            'content_html' => 'sometimes|nullable|string',
        ]);

        if (isset($validated['shortname'])) {
            $validated['shortname'] = strtoupper($validated['shortname']);
        }

        $section->update($validated);

        return response()->json($section);
    }

    public function destroy(RosterSection $section)
    {
        if (!User::hasRosterPermission(Auth::user(), $section->roster, 'remove_sections')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($section->type === 'master') {
            return response()->json(['message' => 'The master section cannot be deleted'], 422);
        }

        $section->delete();

        return response()->json(['message' => 'Section deleted']);
    }

    public function reorder(Request $request, Roster $roster)
    {
        if (!User::hasRosterPermission(Auth::user(), $roster, 'add_sections')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'section_ids' => 'required|array',
            'section_ids.*' => 'exists:roster_sections,id',
            'parent_id' => 'nullable|exists:roster_sections,id',
        ]);

        foreach ($request->section_ids as $index => $id) {
            RosterSection::where('id', $id)
                ->where('roster_id', $roster->id)
                ->update([
                    'order' => $index,
                    'parent_id' => $request->parent_id
                ]);
        }

        return response()->json(['message' => 'Order updated']);
    }
}
