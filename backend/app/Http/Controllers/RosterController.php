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
        $user = Auth::guard('sanctum')->user();

        // If user has view_faction_roster, they see everything by default.
        // If not, they might still see specific rosters if they have permission.
        $isGlobalViewer = User::hasFactionPermission($user, $faction, 'view_faction_roster');
        
        $rosters = $faction->rosters()
            ->with(['rootSections.children', 'rootSections.contents.editor'])
            ->orderBy('order')
            ->orderBy('id')
            ->get();
        
        $filteredRosters = $rosters->filter(function ($roster) use ($user, $isGlobalViewer) {
            return $isGlobalViewer || User::hasRosterPermission($user, $roster, 'view_roster');
        });

        if ($filteredRosters->isEmpty() && !$isGlobalViewer) {
             // If they have no global permission and no specific roster permissions, they get Forbidden
             return response()->json(['message' => 'Forbidden'], 403);
        }

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

            // Apply data masking if user cannot view hidden data
            if (!$canViewHidden) {
                $hiddenColIds = collect($roster->columns ?? [])
                    ->filter(fn($col) => str_contains($col['type'] ?? '', 'hidden'))
                    ->pluck('id')
                    ->toArray();

                if (!empty($hiddenColIds)) {
                    foreach ($roster->rootSections as $section) {
                        $this->maskSection($section, $hiddenColIds);
                    }
                }
            }
        });

        return response()->json($filteredRosters->values());
    }

    private function maskSection($section, array $hiddenColIds)
    {
        // Mask contents of this section
        if ($section->contents) {
            foreach ($section->contents as $content) {
                $data = $content->content;
                if (is_array($data)) {
                    foreach ($hiddenColIds as $colId) {
                        if (isset($data[$colId]) && $data[$colId] !== '') {
                            $data[$colId] = '????';
                        }
                    }
                    $content->content = $data;
                }
            }
        }

        // Recursively mask children
        if ($section->children) {
            foreach ($section->children as $child) {
                $this->maskSection($child, $hiddenColIds);
            }
        }
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
            'columns' => 'nullable|array',
            'layout_settings' => 'nullable|array',
            'default_sections_per_row' => 'nullable|integer|min:1|max:4',
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

        $template = $faction->roster_template ?? [];
        $columns = $validated['columns'] ?? $template['columns'] ?? $defaultColumns;
        $layoutSettings = $validated['layout_settings'] ?? $template['layout_settings'] ?? null;
        $defaultSectionsPerRow = $validated['default_sections_per_row'] ?? $template['default_sections_per_row'] ?? 1;
        $rosterOptions = $validated['roster_options'] ?? $template['roster_options'] ?? null;

        $roster = $faction->rosters()->create([
            ...$validated,
            'order' => $maxOrder + 1,
            'columns' => $columns,
            'layout_settings' => $layoutSettings,
            'default_sections_per_row' => $defaultSectionsPerRow,
            'roster_options' => $rosterOptions,
            'created_by' => Auth::id(),
        ]);

        // Automatically create a master section
        $roster->sections()->create([
            'name' => 'Main Section',
            'shortname' => 'MAIN',
            'type' => 'master',
            'order' => 0,
            'created_by' => Auth::id(),
        ]);

        return response()->json($roster, 201);
    }

    public function update(Request $request, Roster $roster)
    {
        $user = Auth::user();
        $canModify = User::hasRosterPermission($user, $roster, 'modify_roster');
        $canManageLayout = User::hasRosterPermission($user, $roster, 'manage_layout');
        $canManageColumns = User::hasRosterPermission($user, $roster, 'manage_columns');

        if (!$canModify && !$canManageLayout && !$canManageColumns) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'shortname' => 'sometimes|string|max:6',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'roster_options' => 'nullable|array',
            'columns' => 'nullable|array',
            'counts' => 'nullable|array',
            'layout_settings' => 'nullable|array',
            'default_sections_per_row' => 'nullable|integer|min:1|max:4',
            'section_order' => 'nullable|array',
        ]);

        // Authorization logic for specific fields
        $toUpdate = [];

        // Critical settings (name, color, shortname) -> modify_roster
        if ($canModify) {
            foreach(['name', 'shortname', 'color', 'roster_options', 'counts'] as $field) {
                if (isset($validated[$field])) $toUpdate[$field] = $validated[$field];
            }
        }

        // Layout settings -> manage_layout
        if ($canManageLayout) {
            foreach(['layout_settings', 'default_sections_per_row', 'section_order'] as $field) {
                if (isset($validated[$field])) $toUpdate[$field] = $validated[$field];
            }
        }

        // Columns -> manage_columns
        if ($canManageColumns) {
            if (isset($validated['columns'])) $toUpdate['columns'] = $validated['columns'];
        }

        if (empty($toUpdate) && !isset($validated['section_order'])) {
             return response()->json(['message' => 'No authorized changes provided'], 403);
        }

        $roster->update(collect($toUpdate)->except('section_order')->toArray());

        if (isset($validated['section_order']) && $canManageLayout) {
            foreach ($validated['section_order'] as $index => $id) {
                $roster->sections()->where('id', $id)->update(['order' => $index]);
            }
        }

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
