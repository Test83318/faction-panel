<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionRecordDatabase;
use App\Models\Roster;
use App\Models\RosterContent;
use App\Models\RosterDataset;
use App\Models\RosterSection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RosterController extends Controller
{
    private function cleanUpOrphanedData($target, array $columns)
    {
        $oldColumns = $target->getOriginal('columns') ?? [];
        if (! is_array($oldColumns)) {
            $oldColumns = [];
        }

        // Map of oldLabel => newLabel for renames, per column
        // Also tracks if we need a full sweep for color/icon (though those are usually handled by rendering if we don't store them in content)
        // Actually, content ONLY stores the labels (strings).
        // So if a label changes, we MUST update the strings in the content JSON.

        $renameMap = [];
        $validMap = [];
        $clearMap = [];

        foreach ($columns as $newCol) {
            $colId = $newCol['id'];
            $oldCol = collect($oldColumns)->firstWhere('id', $colId);

            $newCbLabels = collect($newCol['checkboxes'] ?? [])->map(fn ($cb) => is_string($cb) ? $cb : ($cb['label'] ?? null))->filter()->toArray();
            $newTagLabels = collect($newCol['tags'] ?? [])->map(fn ($tag) => is_string($tag) ? $tag : ($tag['label'] ?? null))->filter()->toArray();

            $validMap[$colId] = [
                'checkboxes' => $newCbLabels,
                'tags' => $newTagLabels,
            ];

            if ($oldCol) {
                // If the type changed, we should clear the data for this column
                if (($oldCol['type'] ?? null) !== ($newCol['type'] ?? null)) {
                    $clearMap[] = $colId;
                }

                $oldCbs = $oldCol['checkboxes'] ?? [];
                $newCbs = $newCol['checkboxes'] ?? [];

                // If the count is the same, we check for index-based renames
                if (count($oldCbs) === count($newCbs)) {
                    foreach ($oldCbs as $idx => $oldCb) {
                        $oldLabel = is_string($oldCb) ? $oldCb : ($oldCb['label'] ?? null);
                        $newLabel = is_string($newCbs[$idx]) ? $newCbs[$idx] : ($newCbs[$idx]['label'] ?? null);
                        if ($oldLabel && $newLabel && $oldLabel !== $newLabel) {
                            $renameMap[$colId]['checkboxes'][$oldLabel] = $newLabel;
                        }
                    }
                }

                $oldTags = $oldCol['tags'] ?? [];
                $newTags = $newCol['tags'] ?? [];
                if (count($oldTags) === count($newTags)) {
                    foreach ($oldTags as $idx => $oldTag) {
                        $oldLabel = is_string($oldTag) ? $oldTag : ($oldTag['label'] ?? null);
                        $newLabel = is_string($newTags[$idx]) ? $newTags[$idx] : ($newTags[$idx]['label'] ?? null);
                        if ($oldLabel && $newLabel && $oldLabel !== $newLabel) {
                            $renameMap[$colId]['tags'][$oldLabel] = $newLabel;
                        }
                    }
                }
            }
        }

        // Get all content for this target
        $contents = [];
        if ($target instanceof Roster) {
            $sectionIds = RosterSection::where('roster_id', $target->id)
                ->where(function ($q) {
                    $q->where('use_roster_columns', true)->orWhereNull('columns');
                })
                ->pluck('id');
            $contents = RosterContent::whereIn('section_id', $sectionIds)->get();
        } else {
            $contents = RosterContent::where('section_id', $target->id)->get();
        }

        foreach ($contents as $content) {
            $data = $content->content;
            if (! $data || ! is_array($data)) {
                continue;
            }

            $changed = false;
            foreach ($clearMap as $colId) {
                if (isset($data[$colId])) {
                    unset($data[$colId]);
                    $changed = true;
                }
            }

            foreach ($validMap as $colId => $valids) {
                // Handle Checkboxes
                $cbKey = "{$colId}_cb";
                if (isset($data[$cbKey]) && is_array($data[$cbKey])) {
                    $original = $data[$cbKey];

                    // 1. Apply renames
                    if (isset($renameMap[$colId]['checkboxes'])) {
                        $data[$cbKey] = array_map(function ($val) use ($renameMap, $colId) {
                            return $renameMap[$colId]['checkboxes'][$val] ?? $val;
                        }, $data[$cbKey]);
                    }

                    // 2. Filter out orphans
                    $data[$cbKey] = array_values(array_intersect($data[$cbKey], $valids['checkboxes']));

                    if ($original !== $data[$cbKey]) {
                        $changed = true;
                    }
                }

                // Handle Tags
                $tagKey = "{$colId}_tags";
                if (isset($data[$tagKey]) && is_array($data[$tagKey])) {
                    $original = $data[$tagKey];

                    // 1. Apply renames
                    if (isset($renameMap[$colId]['tags'])) {
                        $data[$tagKey] = array_map(function ($val) use ($renameMap, $colId) {
                            return $renameMap[$colId]['tags'][$val] ?? $val;
                        }, $data[$tagKey]);
                    }

                    // 2. Filter out orphans
                    $data[$tagKey] = array_values(array_intersect($data[$tagKey], $valids['tags']));

                    if ($original !== $data[$tagKey]) {
                        $changed = true;
                    }
                }
            }

            if ($changed) {
                $content->content = $data;
                $content->save();
            }
        }
    }

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

        if ($filteredRosters->isEmpty() && ! $isGlobalViewer) {
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
            if (! $canViewHidden) {
                $hiddenColIds = collect($roster->columns ?? [])
                    ->filter(fn ($col) => str_contains($col['type'] ?? '', 'hidden'))
                    ->pluck('id')
                    ->toArray();

                if (! empty($hiddenColIds)) {
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

        if (! User::hasFactionPermission(Auth::user(), $faction, 'create_roster')) {
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
            ['id' => 'callsign', 'name' => 'Callsign', 'type' => 'text', 'checkboxes' => []],
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

        if (! $canModify && ! $canManageLayout && ! $canManageColumns) {
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
            'created_by' => 'nullable|integer|exists:users,id',
        ]);

        // Authorization logic for specific fields
        $toUpdate = [];

        // Critical settings (name, color, shortname) -> modify_roster
        if ($canModify) {
            foreach (['name', 'shortname', 'color', 'roster_options', 'counts', 'created_by'] as $field) {
                if (isset($validated[$field]) || array_key_exists($field, $validated)) {
                    $toUpdate[$field] = $validated[$field];
                }
            }
        }

        // Layout settings -> manage_layout
        if ($canManageLayout) {
            foreach (['layout_settings', 'default_sections_per_row', 'section_order'] as $field) {
                if (isset($validated[$field])) {
                    $toUpdate[$field] = $validated[$field];
                }
            }
        }

        // Columns -> manage_columns
        if ($canManageColumns) {
            if (isset($validated['columns'])) {
                $toUpdate['columns'] = $validated['columns'];
                $this->cleanUpOrphanedData($roster, $validated['columns']);
            }
        }

        if (empty($toUpdate) && ! isset($validated['section_order'])) {
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
        if (! User::hasRosterPermission(Auth::user(), $roster, 'modify_roster')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $roster->delete();

        return response()->json(['message' => 'Roster deleted']);
    }

    public function resolveLinks(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        $links = $request->input('links', []);
        $results = [];

        // Group by row_id to minimize queries
        $rowIds = collect($links)->pluck('row_id')->filter()->unique();
        $contents = RosterContent::whereIn('id', $rowIds)->with('section.roster.faction')->get()->keyBy('id');

        // Cache for rosters and datasets to avoid repeated lookups
        $rosterCache = [];
        $datasetCache = [];

        foreach ($links as $link) {
            $rosterId = $link['roster_id'] ?? null;
            $rowId = $link['row_id'] ?? null;
            $colId = $link['col_id'] ?? null;

            if (! $rosterId || ! $rowId || ! $colId) {
                $results[] = '-';

                continue;
            }

            $content = $contents->get($rowId);
            if (! $content || $content->section->roster_id != $rosterId) {
                $results[] = '-';

                continue;
            }

            // Check if user can view this roster
            if (! User::hasRosterPermission($user, $content->section->roster, 'view_roster')) {
                $results[] = '-';

                continue;
            }

            $value = $content->content[$colId] ?? '-';

            // Resolve label if it's a dataset/predefined type
            if (! isset($rosterCache[$rosterId])) {
                $rosterCache[$rosterId] = $content->section->roster;
            }
            $roster = $rosterCache[$rosterId];

            $col = collect($roster->columns ?? [])->firstWhere('id', $colId);
            if (! $col) {
                $col = collect($content->section->columns ?? [])->firstWhere('id', $colId);
            }

            // Mask if it's a hidden column and user doesn't have permission
            if ($col && str_contains($col['type'] ?? '', 'hidden')) {
                if (! User::hasRosterPermission($user, $roster, 'view_hidden_data')) {
                    $results[] = '????';

                    continue;
                }
            }

            if ($col && isset($col['dataset_id'])) {
                $datasetId = $col['dataset_id'];
                if (! isset($datasetCache[$datasetId])) {
                    $datasetCache[$datasetId] = RosterDataset::find($datasetId);
                }
                $dataset = $datasetCache[$datasetId];

                if ($dataset) {
                    if ($dataset->record_database_id) {
                        $db = FactionRecordDatabase::find($dataset->record_database_id);
                        if ($db && is_numeric($value)) {
                            $entry = $db->entries()->where('entry_id', $value)->first();
                            if ($entry) {
                                $fieldId = $col['database_field_id'] ?? $db->database_structure[0]['id'] ?? 'id';
                                if ($fieldId === 'id') {
                                    $value = $entry->entry_id;
                                } else {
                                    $value = $entry->data[$fieldId] ?? $value;
                                }
                            }
                        }
                    } else {
                        if (is_numeric($value)) {
                            $option = $dataset->options()->where('id', $value)->first();
                            if ($option) {
                                $value = $option->value;
                            }
                        }
                    }
                }
            }

            $results[] = (string) $value;
        }

        return response()->json(['results' => $results]);
    }

    public function reorder(Request $request, $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_roster_moderation')) {
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
