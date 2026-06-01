<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionRecordDatabase;
use App\Models\RosterContent;
use App\Models\RosterDataset;
use App\Models\User;
use App\Services\DynamicSectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class FactionController extends Controller
{
    public function index()
    {
        $this->audit('faction.index', 'Viewed list of joined factions');

        return Auth::user()->factions()->get();
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $createdFactionsCount = Faction::where('created_by', $user->id)->count();

        if ($createdFactionsCount >= $user->max_factions) {
            return response()->json([
                'message' => "You have reached your limit of {$user->max_factions} created factions.",
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

        $this->audit('faction.create', "Created faction '{$faction->name}' ({$faction->shortname})", $faction->id, $faction);

        return response()->json($faction, 201);
    }

    public function show(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->with(['creator'])->firstOrFail();
        $user = Auth::guard('sanctum')->user();

        // Trigger automatic snapshot check
        app(FactionSnapshotController::class)->triggerAutoSnapshot($faction);

        $allPermissionsConfig = config('permissions.categories');
        $permissions = [];

        foreach ($allPermissionsConfig as $category) {
            foreach ($category['permissions'] as $key => $details) {
                if (User::hasFactionPermission($user, $faction, $key)) {
                    $permissions[] = $key;
                }
            }
        }

        // Update activity if logged in
        if ($user) {
            $currentRosterId = $request->query('roster_id');
            $faction->users()->updateExistingPivot($user->id, [
                'current_roster_id' => $currentRosterId,
                'last_roster_activity' => now(),
            ]);
        }

        $canViewGlobal = in_array('view_faction_roster', $permissions);
        $hasSandboxPerm = in_array('utilize_sandbox_rosters', $permissions);

        // Include Roster Data
        $rosters = $faction->rosters()
            ->where('is_sandbox', false)
            ->with(['rootSections.children', 'rootSections.contents.editor'])
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        $filteredRosters = $rosters->filter(function ($roster) use ($user, $canViewGlobal) {
            // If this roster has explicit permission entries, always enforce them —
            // even global viewers (view_faction_roster) are subject to per-roster access control.
            $hasExplicitPerms = $roster->rosterPermissions()->exists();
            if ($hasExplicitPerms) {
                return User::hasRosterPermission($user, $roster, 'view_roster');
            }

            // No explicit permissions: fall back to global permission
            return $canViewGlobal || User::hasRosterPermission($user, $roster, 'view_roster');
        })->values();

        if ($filteredRosters->isEmpty() && ! $canViewGlobal && ! $hasSandboxPerm) {
            return response()->json(['message' => 'Forbidden'], 403);
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

        // Active Users Tracking (Online in last 60 seconds)
        $onlineUsers = $faction->users()
            ->where('last_roster_activity', '>=', now()->subSeconds(60))
            ->with(['roles' => function ($query) use ($faction) {
                $query->where('faction_id', $faction->id)->where('type', 'primary');
            }])
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'username' => $u->username,
                    'avatar_url' => $u->avatar_url,
                    'current_roster_id' => $u->pivot->current_roster_id,
                    'primary_role' => $u->roles->first(),
                ];
            });

        $sandboxRosters = collect();
        if ($hasSandboxPerm && $user) {
            $sandboxRosters = $faction->rosters()
                ->where('is_sandbox', true)
                ->where('created_by', $user->id)
                ->with(['rootSections.children', 'rootSections.contents.editor'])
                ->orderBy('order')
                ->orderBy('id')
                ->get();
        }

        // Resolve dynamic sections ONLY for the filtered rosters
        $dynamicService = new DynamicSectionService;
        $resolveDynamic = function ($sections) use (&$resolveDynamic, $dynamicService, $faction) {
            foreach ($sections as $section) {
                if ($section->data_source === 'dynamic') {
                    $dynamicService->resolve($section, $faction);
                }
                if ($section->children) {
                    $resolveDynamic($section->children);
                }
            }
        };

        foreach ($filteredRosters as $roster) {
            $resolveDynamic($roster->rootSections);
        }
        foreach ($sandboxRosters as $roster) {
            $resolveDynamic($roster->rootSections);
        }

        // Include Datasets
        $datasets = $faction->rosterDatasets()
            ->with('options')
            ->get();

        // Include Flags
        $flags = $faction->rosterFlags()->get();

        // Include Published Record Databases & Entries — all for resolution, filter for response later
        $allPublishedDatabases = $faction->recordDatabases()
            ->where('is_published', true)
            ->with(['entries' => function ($query) {
                $query->where('is_active', true);
            }])
            ->get();

        $publishedDatabases = $allPublishedDatabases->filter(fn ($db) => User::hasRecordPermission($user, $db, 'view_database'))->values();

        // Filter and mask record database entries for view-only users
        $resolutionDbsById = $allPublishedDatabases->keyBy('id');
        $publishedDbsById = $publishedDatabases->keyBy('id');
        $referencedEntriesByDb = [];
        $hiddenFieldsByDb = [];

        foreach ($allPublishedDatabases as $db) {
            $referencedEntriesByDb[$db->id] = [
                'ids' => [],
                'values' => [],
                'fields' => [],
            ];
            $hiddenFieldsByDb[$db->id] = [];
        }

        $datasetsById = $datasets->keyBy('id');

        $getLinkedDatabaseId = function ($col) use ($datasetsById) {
            if (isset($col['linked_database_id']) && $col['linked_database_id']) {
                return $col['linked_database_id'];
            }
            if (isset($col['dataset_id']) && $col['dataset_id']) {
                $ds = $datasetsById->get($col['dataset_id']);
                if ($ds && $ds->record_database_id) {
                    return $ds->record_database_id;
                }
            }

            return null;
        };

        // Collect all target row IDs referenced in linked roster columns to resolve them in bulk
        $linkRowIds = [];
        $collectLinks = function ($section) use (&$collectLinks, &$linkRowIds) {
            if ($section->contents) {
                foreach ($section->contents as $content) {
                    $data = $content->content;
                    if (is_array($data)) {
                        foreach ($data as $colId => $val) {
                            if (is_array($val) && isset($val['row_id']) && isset($val['col_id'])) {
                                $linkRowIds[] = $val['row_id'];
                            }
                        }
                    }
                }
            }
            if ($section->children) {
                foreach ($section->children as $child) {
                    $collectLinks($child);
                }
            }
        };

        foreach ($filteredRosters as $roster) {
            foreach ($roster->rootSections as $section) {
                $collectLinks($section);
            }
        }
        $linkRowIds = array_unique($linkRowIds);

        $resolvedLinksMap = [];
        if (! empty($linkRowIds)) {
            $contents = RosterContent::whereIn('id', $linkRowIds)
                ->with('section.roster.faction')
                ->get()
                ->keyBy('id');

            $datasetCache = [];
            $rosterColsCache = [];

            foreach ($linkRowIds as $rowId) {
                $content = $contents->get($rowId);
                if (! $content) {
                    continue;
                }

                $roster = $content->section->roster;
                if (! User::canViewRoster($user, $roster)) {
                    continue;
                }

                $rosterId = $roster->id;
                if (! isset($rosterColsCache[$rosterId])) {
                    $rosterColsCache[$rosterId] = collect($roster->columns ?? []);
                }

                foreach ($content->content as $colId => $value) {
                    $col = null;
                    if (! ($content->section->use_roster_columns ?? true)) {
                        $col = collect($content->section->columns ?? [])->firstWhere('id', $colId);
                    }
                    if (! $col) {
                        $col = $rosterColsCache[$rosterId]->firstWhere('id', $colId);
                    }

                    if ($col && str_contains($col['type'] ?? '', 'hidden')) {
                        if (! User::hasRosterPermission($user, $roster, 'view_hidden_data')) {
                            $resolvedLinksMap["{$rowId}_{$colId}"] = '????';

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

                    $resolvedLinksMap["{$rowId}_{$colId}"] = (is_array($value) || is_object($value)) ? '-' : (string) $value;
                }
            }
        }

        $scanSection = function ($section, $roster) use (&$scanSection, &$referencedEntriesByDb, &$hiddenFieldsByDb, $getLinkedDatabaseId, $user, $resolvedLinksMap, $resolutionDbsById) {
            $config = $section->section_options['dynamic_config'] ?? null;
            $isDynamicDb = ($section->data_source === 'dynamic') &&
                $config &&
                (($config['source_type'] ?? null) === 'database') &&
                isset($config['source_id']);
            $dynamicDbId = $isDynamicDb ? $config['source_id'] : null;

            $columns = $section->use_roster_columns ? ($roster->columns ?? []) : ($section->columns ?: ($roster->columns ?? []));
            $canViewHidden = User::hasRosterPermission($user, $roster, 'view_hidden_data');
            $isEditor = User::hasRosterPermission($user, $roster, 'edit_defined_fields') ||
                        User::hasRosterPermission($user, $roster, 'edit_predefined') ||
                        User::hasRosterPermission($user, $roster, 'modify_roster');

            // Map column IDs to their linked database IDs and fields
            $colDbIds = [];
            foreach ($columns as $col) {
                if (isset($col['id'])) {
                    $dbId = $getLinkedDatabaseId($col);
                    if ($dbId && isset($referencedEntriesByDb[$dbId])) {
                        $colDbIds[$col['id']] = [
                            'db_id' => $dbId,
                            'col' => $col,
                        ];

                        $db = $resolutionDbsById->get($dbId);
                        $fieldId = $col['database_field_id'] ?? null;
                        if (! $fieldId && $db) {
                            $fieldId = $db->database_structure[0]['id'] ?? null;
                        }
                        if ($fieldId) {
                            $referencedEntriesByDb[$dbId]['fields'][] = $fieldId;

                            // If this column type is hidden and user lacks view_hidden_data, mark the field as hidden
                            if (! $canViewHidden && str_contains($col['type'] ?? '', 'hidden')) {
                                $hiddenFieldsByDb[$dbId][] = $fieldId;
                            }
                        }
                    }
                }
            }

            // Also check dynamic section mapping for hidden columns
            if ($dynamicDbId && isset($referencedEntriesByDb[$dynamicDbId])) {
                $mappings = $config['mappings'] ?? [];
                foreach ($columns as $col) {
                    if (isset($col['id']) && isset($mappings[$col['id']])) {
                        $sourceKey = $mappings[$col['id']];
                        $referencedEntriesByDb[$dynamicDbId]['fields'][] = $sourceKey;

                        if (! $canViewHidden && str_contains($col['type'] ?? '', 'hidden')) {
                            $hiddenFieldsByDb[$dynamicDbId][] = $sourceKey;
                        }
                    }
                }
            }

            if ($section->contents) {
                foreach ($section->contents as $content) {
                    if ($dynamicDbId && isset($referencedEntriesByDb[$dynamicDbId])) {
                        $referencedEntriesByDb[$dynamicDbId]['ids'][] = $content->id;
                    }

                    $data = $content->content;
                    if (is_array($data)) {
                        $changed = false;
                        // Resolve database_data and linked_roster_data into the content object
                        foreach ($columns as $col) {
                            $colId = $col['id'] ?? null;
                            if (! $colId) {
                                continue;
                            }

                            if (($col['type'] ?? '') === 'linked_roster_data') {
                                if (! $isEditor) {
                                    $val = $data[$colId] ?? null;
                                    if (is_array($val) && isset($val['row_id']) && isset($val['col_id'])) {
                                        $linkKey = "{$val['row_id']}_{$val['col_id']}";
                                        $data[$colId] = $resolvedLinksMap[$linkKey] ?? '-';
                                        $changed = true;
                                    }
                                }
                            } elseif (str_contains($col['type'] ?? '', 'database_data') && isset($col['source_column_id'])) {
                                $sourceColId = $col['source_column_id'];
                                $sourceCol = collect($columns)->firstWhere('id', $sourceColId);
                                $sourceValue = $data[$sourceColId] ?? null;

                                if ($sourceCol && ($sourceCol['type'] ?? '') === 'linked_roster_data' && is_array($sourceValue)) {
                                    $linkKey = "{$sourceValue['row_id']}_{$sourceValue['col_id']}";
                                    $sourceValue = $resolvedLinksMap[$linkKey] ?? null;
                                }

                                if ($sourceValue) {
                                    $dbId = $getLinkedDatabaseId($sourceCol);
                                    $db = $dbId ? $resolutionDbsById->get($dbId) : null;

                                    if ($db && $db->relationLoaded('entries')) {
                                        $entry = $db->entries->first(function ($e) use ($sourceCol, $sourceValue, $db) {
                                            $fieldId = $sourceCol['database_field_id'] ?? $db->database_structure[0]['id'] ?? 'id';
                                            $label = ($fieldId === 'id') ? (string) $e->entry_id : $e->data[$fieldId] ?? null;

                                            return $label == $sourceValue;
                                        });

                                        if ($entry) {
                                            $fieldId = $col['data_field_id'] ?? null;
                                            $data[$colId] = ($fieldId === 'id') ? $entry->entry_id : $entry->data[$fieldId] ?? '-';
                                            $changed = true;
                                        }
                                    }
                                }
                            }
                        }

                        if ($changed) {
                            $content->content = $data;
                        }

                        foreach ($colDbIds as $colId => $colInfo) {
                            $dbId = $colInfo['db_id'];
                            $val = $data[$colId] ?? null;
                            if ($val !== null && $val !== '') {
                                if (is_array($val) && isset($val['row_id']) && isset($val['col_id'])) {
                                    $linkKey = "{$val['row_id']}_{$val['col_id']}";
                                    $resolvedVal = $resolvedLinksMap[$linkKey] ?? null;
                                    if ($resolvedVal !== null && $resolvedVal !== '') {
                                        $referencedEntriesByDb[$dbId]['values'][] = (string) $resolvedVal;
                                    }
                                } else {
                                    $referencedEntriesByDb[$dbId]['values'][] = (string) $val;
                                }
                            }
                        }
                    }
                }
            }

            if ($section->children) {
                foreach ($section->children as $child) {
                    $scanSection($child, $roster);
                }
            }
        };

        foreach ($filteredRosters as $roster) {
            foreach ($roster->rootSections as $section) {
                $scanSection($section, $roster);
            }
        }

        foreach ($referencedEntriesByDb as $dbId => $refs) {
            $referencedEntriesByDb[$dbId]['ids'] = array_unique($refs['ids']);
            $referencedEntriesByDb[$dbId]['values'] = array_unique($refs['values']);
            $referencedEntriesByDb[$dbId]['fields'] = array_unique($refs['fields']);
        }
        foreach ($hiddenFieldsByDb as $dbId => $fields) {
            $hiddenFieldsByDb[$dbId] = array_unique($fields);
        }

        $isRosterEditor = false;
        if ($user) {
            foreach ($filteredRosters as $roster) {
                if (User::hasRosterPermission($user, $roster, 'modify_roster') ||
                    User::hasRosterPermission($user, $roster, 'edit_predefined') ||
                    User::hasRosterPermission($user, $roster, 'edit_defined_fields') ||
                    User::hasRosterPermission($user, $roster, 'manage_columns') ||
                    User::hasRosterPermission($user, $roster, 'manage_layout') ||
                    User::hasRosterPermission($user, $roster, 'add_sections') ||
                    User::hasRosterPermission($user, $roster, 'remove_sections')) {
                    $isRosterEditor = true;
                    break;
                }
            }
        }

        // Include databases if user can view them OR they have referenced entries
        $recordDataResponse = $allPublishedDatabases->filter(function ($db) use ($user, $referencedEntriesByDb) {
            if (User::hasRecordPermission($user, $db, 'view_database')) {
                return true;
            }

            // If they have any referenced entries, we must include the database (filtered)
            return ! empty($referencedEntriesByDb[$db->id]['ids'] ?? []) ||
                   ! empty($referencedEntriesByDb[$db->id]['values'] ?? []);
        })->values();

        foreach ($recordDataResponse as $db) {
            $isEditor = false;
            if ($user) {
                $isEditor = $user->is_superadmin ||
                    $faction->faction_leader === $user->id ||
                    User::hasFactionPermission($user, $faction, 'global_faction_record_moderation') ||
                    $db->created_by === $user->id ||
                    User::hasRecordPermission($user, $db, 'add_entries') ||
                    User::hasRecordPermission($user, $db, 'modify_entries') ||
                    User::hasRecordPermission($user, $db, 'delete_entries') ||
                    $isRosterEditor;
            }

            if (! $isEditor) {
                $dbRefs = $referencedEntriesByDb[$db->id] ?? ['ids' => [], 'values' => [], 'fields' => []];
                $dbRefsIds = $dbRefs['ids'];
                $dbRefsValues = $dbRefs['values'];
                $dbRefsFields = $dbRefs['fields'];

                // Filter the entries collection
                $filteredEntries = $db->entries->filter(function ($entry) use ($dbRefsIds, $dbRefsValues, $dbRefsFields, $user, $db) {
                    // If they have view_database, they see everything (unless it's further restricted by hidden fields, handled later)
                    if (User::hasRecordPermission($user, $db, 'view_database')) {
                        return true;
                    }

                    // No view_database permission: ONLY see referenced entries
                    if (in_array($entry->id, $dbRefsIds)) {
                        return true;
                    }
                    if (in_array((string) $entry->entry_id, $dbRefsValues)) {
                        return true;
                    }
                    foreach ($dbRefsFields as $fieldId) {
                        if ($fieldId === 'id') {
                            if (in_array((string) $entry->entry_id, $dbRefsValues)) {
                                return true;
                            }
                        } else {
                            $val = $entry->data[$fieldId] ?? null;
                            if ($val !== null && in_array((string) $val, $dbRefsValues)) {
                                return true;
                            }
                        }
                    }

                    return false;
                });

                // Mask hidden fields inside filtered entries
                $hiddenFields = $hiddenFieldsByDb[$db->id] ?? [];
                if (! empty($hiddenFields)) {
                    foreach ($filteredEntries as $entry) {
                        $data = $entry->data;
                        if (is_array($data)) {
                            foreach ($hiddenFields as $fieldId) {
                                if (isset($data[$fieldId]) && $data[$fieldId] !== '') {
                                    unset($data[$fieldId]);
                                }
                            }
                            $entry->data = $data;
                        }
                    }
                }

                $db->setRelation('entries', $filteredEntries->values());
            }
        }

        $filteredRosters->each(function ($roster) use ($user) {
            $canModify = User::hasRosterPermission($user, $roster, 'modify_roster');
            $canViewHidden = $canModify || User::hasRosterPermission($user, $roster, 'view_hidden_data');

            $perms = [
                'view_roster' => User::hasRosterPermission($user, $roster, 'view_roster'),
                'modify_roster' => $canModify,
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

                foreach ($roster->rootSections as $section) {
                    $this->maskSection($section, $hiddenColIds, $roster, true);
                }
            }
        });

        $sandboxRosters->each(function ($roster) use ($user) {
            $perms = [
                'view_roster' => true,
                'modify_roster' => true,
                'manage_columns' => true,
                'manage_layout' => true,
                'add_sections' => true,
                'remove_sections' => true,
                'edit_predefined' => true,
                'edit_defined_fields' => true,
                'view_hidden_data' => true,
            ];
            $roster->user_roster_permissions = $perms;
        });

        // Ensure rosters relation is NOT loaded or serialized on faction model to prevent unmasked data leakage
        $faction->unsetRelation('rosters');

        $this->audit('faction.show', "Viewed faction panel for '{$faction->name}'", $faction->id, $faction);

        return response()->json([
            'faction' => $faction,
            'permissions' => $permissions,
            'rosters' => $filteredRosters,
            'sandbox_rosters' => $sandboxRosters,
            'datasets' => $datasets,
            'flags' => $flags,
            'record_data' => $recordDataResponse,
            'online_users' => $onlineUsers,
        ]);
    }

    public function update(Request $request, Faction $faction)
    {
        if (! User::hasFactionPermission(Auth::user(), $faction, 'modify_faction_details')) {
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
            'header_gradient_direction',
        ];

        $attemptingPremium = false;
        foreach ($premiumFields as $field) {
            if ($request->has($field)) {
                $attemptingPremium = true;
                break;
            }
        }

        if ($attemptingPremium && ! $user->allow_custom_branding) {
            return response()->json([
                'message' => 'Advanced branding is a restricted feature.',
            ], 403);
        }

        $validated = $request->validate([
            'shortname' => ['sometimes', 'string', Rule::unique('factions')->ignore($faction->id), 'max:20', 'alpha_dash'],
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'color' => ['sometimes', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'image_url' => 'nullable|string|max:2048',
            'header_image_dark' => 'nullable|string|max:2048',
            'header_image_light' => 'nullable|string|max:2048',
            'favicon' => 'nullable|string|max:2048',
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

        if (isset($validated['faction_leader']) && $faction->faction_leader !== Auth::id() && ! Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Only the faction leader can transfer leadership.'], 403);
        }

        $oldValues = $faction->getOriginal();
        $faction->update($validated);

        $this->audit('faction.update', "Updated details for faction '{$faction->name}'", $faction->id, $faction, $oldValues, $faction->getDirty());

        return $faction;
    }

    public function destroy(Faction $faction)
    {
        if ($faction->faction_leader !== Auth::id() && ! Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('faction.delete', "Deleted faction '{$faction->name}'", $faction->id, $faction, $faction->getAttributes());

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

        $this->audit('faction.join', "Joined faction '{$faction->name}'", $faction->id, $faction);

        return response()->json(['message' => 'Joined successfully']);
    }

    public function leave(Faction $faction)
    {
        if ($faction->faction_leader === Auth::id()) {
            return response()->json(['message' => 'Leaders cannot leave. Transfer leadership first.'], 400);
        }

        $this->audit('faction.leave', "Left faction '{$faction->name}'", $faction->id, $faction);

        $faction->users()->detach(Auth::id());

        return response()->json(['message' => 'Left successfully']);
    }

    public function getAllFactions()
    {
        $this->audit('faction.list_all', 'Viewed all public factions');

        // Users only see factions with 'public' visibility
        return Faction::with('creator.membershipTier')
            ->where('visibility', 'public')
            ->get();
    }

    public function getPermissions(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::guard('sanctum')->user();

        $this->audit('faction.permissions', "Fetched permissions for faction '{$faction->name}'", $faction->id, $faction);

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

    public function getMembers(string $shortname, Request $request)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        if (! User::hasFactionPermission($user, $faction, 'view_users') &&
            ! User::hasFactionPermission($user, $faction, 'manage_group_members') &&
            ! $user->isGroupLeaderInFaction($faction->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('faction.members.index', "Viewed members list for faction '{$faction->name}'", $faction->id, $faction);

        $search = $request->query('search');
        $query = $faction->users()->with(['roles' => function ($query) use ($faction) {
            $query->where('faction_id', $faction->id);
        }]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                    ->orWhere('gtaw_username', 'like', "%{$search}%");
            });
        }

        if ($request->has('page') || $request->has('per_page')) {
            return $query->paginate($request->query('per_page', 25));
        }

        return $query->get();
    }

    public function getMemberProfile(string $shortname, User $member)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        if (! User::hasFactionPermission($user, $faction, 'view_users')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('faction.members.show', "Viewed member profile of '{$member->username}' in faction '{$faction->name}'", $faction->id, $member);

        $memberWithPivot = $faction->users()->where('users.id', $member->id)->firstOrFail();
        $memberWithPivot->load(['roles' => function ($query) use ($faction) {
            $query->where('faction_id', $faction->id);
        }]);

        $ownedRosters = $member->ownedRosters()->where('faction_id', $faction->id)->get();
        $ownedDatabases = $member->ownedDatabases()->where('faction_id', $faction->id)->get();
        $ownedStatistics = $member->ownedStatistics()->where('faction_id', $faction->id)->get();

        return response()->json([
            'user' => $memberWithPivot,
            'owned_rosters' => $ownedRosters,
            'owned_databases' => $ownedDatabases,
            'owned_statistics' => $ownedStatistics,
        ]);
    }

    public function removeMember(Faction $faction, User $user)
    {
        if (! User::hasFactionPermission(Auth::user(), $faction, 'remove_users')) {
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

        $this->audit('faction.members.remove', "Removed member '{$user->username}' from faction '{$faction->name}'", $faction->id, $user);

        $faction->users()->detach($user->id);

        // Also remove faction roles
        $roles = $faction->roles()->pluck('roles.id');
        $user->roles()->detach($roles);

        return response()->json(['message' => 'User removed from faction.']);
    }

    public function updateMemberRoles(Faction $faction, User $user, Request $request)
    {
        if (! User::hasFactionPermission(Auth::user(), $faction, 'change_ranks')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($faction->faction_leader === $user->id) {
            return response()->json(['message' => 'Cannot change the rank of the faction leader.'], 403);
        }

        $myWeight = Auth::user()->getHighestRoleWeight($faction->id);
        $targetWeight = $user->getHighestRoleWeight($faction->id);

        if ($targetWeight >= $myWeight && ! Auth::user()->is_superadmin && $faction->faction_leader !== Auth::id()) {
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
        $oldRoles = $user->roles()->where('faction_id', $faction->id)->pluck('roles.name')->toArray();
        $otherRoles = $user->roles()->where('faction_id', '!=', $faction->id)->pluck('roles.id')->toArray();
        $user->roles()->sync(array_merge($otherRoles, $request->role_ids));
        $newRoles = $roles->pluck('name')->toArray();

        $this->audit('faction.members.update_roles', "Updated roles for member '{$user->username}' in faction '{$faction->name}'", $faction->id, $user, ['roles' => $oldRoles], ['roles' => $newRoles]);

        return response()->json(['message' => 'User roles updated.']);
    }

    private function maskSection($section, array $rosterHiddenColIds, $roster = null, $omit = false)
    {
        $hiddenColIds = $rosterHiddenColIds;
        if ($section->columns && ! $section->use_roster_columns) {
            $hiddenColIds = collect($section->columns)
                ->filter(fn ($col) => str_contains($col['type'] ?? '', 'hidden'))
                ->pluck('id')
                ->toArray();
        }

        // Mask contents of this section
        if ($section->contents) {
            foreach ($section->contents as $content) {
                $data = $content->content;
                if (is_array($data)) {
                    foreach ($hiddenColIds as $colId) {
                        if (isset($data[$colId]) && $data[$colId] !== '') {
                            if ($omit) {
                                unset($data[$colId]);
                            } else {
                                $data[$colId] = '????';
                            }
                        }
                    }
                    $content->content = $data;
                }
            }
        }

        // Recursively mask children
        if ($section->children) {
            foreach ($section->children as $child) {
                $this->maskSection($child, $rosterHiddenColIds, $roster, $omit);
            }
        }
    }
}
