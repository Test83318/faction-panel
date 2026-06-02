<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionSnapshot;
use App\Models\RosterSection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FactionSnapshotController extends Controller
{
    public function index(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        if (! User::hasFactionPermission(Auth::user(), $faction, 'view_snapshots')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('snapshot.index', "Viewed snapshots for faction '{$faction->name}'", $faction->id);

        return response()->json(
            FactionSnapshot::where('faction_id', $faction->id)
                ->select('id', 'faction_id', 'name', 'description', 'type', 'created_by', 'created_at', 'updated_at')
                ->with('creator')
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function store(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        if (! User::hasFactionPermission(Auth::user(), $faction, 'create_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $snapshot = $this->createSnapshot($faction, $request->name, $request->description, 'manual');

        $this->audit('snapshot.create', "Created manual snapshot '{$snapshot->name}'", null, $snapshot);

        return response()->json($snapshot);
    }

    public function triggerAutoSnapshot(Faction $faction)
    {
        // Check if we already have a snapshot today
        $today = now()->startOfDay();
        $exists = FactionSnapshot::where('faction_id', $faction->id)
            ->where('type', 'auto')
            ->where('created_at', '>=', $today)
            ->exists();

        if ($exists) {
            $this->audit('snapshot.auto_create_skip', "Skipped automatic snapshot for faction '{$faction->name}': already exists for today", $faction->id);

            return response()->json(['message' => 'Auto snapshot already exists for today']);
        }

        $snapshot = $this->createSnapshot($faction, 'Automatic Backup '.now()->format('Y-m-d H:i'), 'Scheduled daily automatic snapshot', 'auto');

        $this->audit('snapshot.auto_create', "Triggered daily automatic snapshot '{$snapshot->name}'", $faction->id, $snapshot);

        return response()->json(['message' => 'Auto snapshot created']);
    }

    private function createSnapshot(Faction $faction, $name, $description, $type)
    {
        $data = $this->captureFactionState($faction);

        $snapshot = FactionSnapshot::create([
            'faction_id' => $faction->id,
            'name' => $name,
            'description' => $description,
            'data' => $data,
            'type' => $type,
            'created_by' => Auth::id(),
        ]);

        // Clean up old automatic snapshots (keep max 7)
        if ($type === 'auto') {
            $oldSnapshots = FactionSnapshot::where('faction_id', $faction->id)
                ->where('type', 'auto')
                ->select('id')
                ->orderBy('created_at', 'desc')
                ->skip(7)
                ->take(100) // SQLite requires a LIMIT if OFFSET is used
                ->get();

            foreach ($oldSnapshots as $old) {
                $old->delete();
            }
        }

        return $snapshot;
    }

    private $systemFields = [
        'id', 'faction_id', 'roster_id', 'parent_id', 'section_id', 'created_at', 'updated_at', 'deleted_at',
        'created_by', 'editing_by', 'editing_at', 'editing_col',
    ];

    private function captureModel($model, $extraExclusions = [])
    {
        return $model->makeHidden(array_merge($this->systemFields, $extraExclusions))->toArray();
    }

    private function captureFactionState(Faction $faction)
    {
        return [
            'faction' => $this->captureModel($faction, ['gtaw_faction_id', 'faction_leader']),
            'roles' => $faction->roles()->with('permissions')->get()->map(function ($role) {
                return [
                    'id' => $role->id,
                    'role' => $this->captureModel($role),
                    'permissions' => $role->permissions->map(fn ($p) => $this->captureModel($p))->toArray(),
                ];
            })->toArray(),
            'flags' => $faction->rosterFlags()->get()->map(fn ($f) => $this->captureModel($f))->toArray(),
            'datasets' => $faction->rosterDatasets()->with('options')->get()->map(fn ($d) => [
                'id' => $d->id,
                'dataset' => $this->captureModel($d),
                'options' => $d->options->map(fn ($o) => $this->captureModel($o, ['dataset_id']))->toArray(),
            ])->toArray(),
            'recordDatabases' => $faction->recordDatabases()->with(['entries', 'databasePermissions'])->get()->map(fn ($db) => [
                'id' => $db->id,
                'database' => $this->captureModel($db),
                'entries' => $db->entries->map(fn ($e) => $this->captureModel($e, ['record_database_id']))->toArray(),
                'permissions' => $db->databasePermissions->map(fn ($p) => $this->captureModel($p, ['database_id']))->toArray(),
            ])->toArray(),
            'rosters' => $faction->rosters()->with('rosterPermissions')->get()->map(function ($roster) {
                return [
                    'id' => $roster->id,
                    'roster' => $this->captureModel($roster),
                    'permissions' => $roster->rosterPermissions->map(fn ($p) => $this->captureModel($p, ['roster_id']))->toArray(),
                    'sections' => $this->captureSections($roster->id),
                ];
            })->toArray(),
            'groups' => $faction->groups()->get()->map(fn ($g) => [
                'id' => $g->id,
                'group' => $this->captureModel($g),
            ])->toArray(),
            'statistics' => $faction->statisticsModels()->with(['widgets', 'statisticsPermissions'])->get()->map(fn ($sm) => [
                'id' => $sm->id,
                'model' => $this->captureModel($sm),
                'widgets' => $sm->widgets->map(fn ($w) => $this->captureModel($w, ['statistics_model_id']))->toArray(),
                'permissions' => $sm->statisticsPermissions->map(fn ($p) => $this->captureModel($p, ['statistics_model_id']))->toArray(),
            ])->toArray(),
            'forms' => $faction->forms()->with(['statuses', 'stages.sections.fields', 'automations', 'formPermissions'])->get()->map(function ($form) {
                return [
                    'id' => $form->id,
                    'form' => $this->captureModel($form),
                    'statuses' => $form->statuses->map(fn ($s) => [
                        'id' => $s->id,
                        'status' => $this->captureModel($s),
                    ])->toArray(),
                    'stages' => $form->stages->map(function ($stage) {
                        return [
                            'id' => $stage->id,
                            'stage' => $this->captureModel($stage),
                            'sections' => $stage->sections->map(function ($section) {
                                return [
                                    'id' => $section->id,
                                    'section' => $this->captureModel($section),
                                    'fields' => $section->fields->map(fn ($f) => [
                                        'id' => $f->id,
                                        'field' => $this->captureModel($f),
                                    ])->toArray(),
                                ];
                            })->toArray(),
                        ];
                    })->toArray(),
                    'automations' => $form->automations->map(fn ($a) => $this->captureModel($a))->toArray(),
                    'permissions' => $form->formPermissions->map(fn ($p) => $this->captureModel($p))->toArray(),
                    'status_stage_links' => DB::table('form_status_stage')
                        ->join('form_statuses', 'form_status_stage.form_status_id', '=', 'form_statuses.id')
                        ->where('form_statuses.form_id', $form->id)
                        ->select('form_status_stage.form_status_id', 'form_status_stage.form_stage_id')
                        ->get()
                        ->map(fn ($row) => [
                            'form_status_id' => $row->form_status_id,
                            'form_stage_id' => $row->form_stage_id,
                        ])
                        ->toArray(),
                ];
            })->toArray(),
        ];
    }

    private function captureSections($rosterId, $parentId = null)
    {
        return RosterSection::where('roster_id', $rosterId)
            ->where('parent_id', $parentId)
            ->with(['contents'])
            ->get()
            ->map(function ($section) use ($rosterId) {
                return [
                    'section' => $this->captureModel($section),
                    'contents' => $section->contents->map(fn ($c) => $this->captureModel($c))->toArray(),
                    'children' => $this->captureSections($rosterId, $section->id),
                ];
            })->toArray();
    }

    public function restore(Request $request, FactionSnapshot $snapshot)
    {
        $faction = $snapshot->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'restore_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $oldValues = $faction->getOriginal();

        DB::transaction(function () use ($faction, $snapshot) {
            $data = $snapshot->data;
            $currentUserId = Auth::id();

            // 1. Wipe existing data (Keep members and audit logs)
            // We delete in reverse order of dependencies
            $faction->rosters()->each(fn ($r) => $r->delete());
            $faction->rosterDatasets()->each(fn ($d) => $d->delete());
            $faction->recordDatabases()->each(fn ($d) => $d->delete());
            $faction->rosterFlags()->each(fn ($f) => $f->delete());
            $faction->groups()->each(fn ($g) => $g->delete());
            $faction->roles()->each(fn ($r) => $r->delete());
            $faction->forms()->each(fn ($f) => $f->delete());
            $faction->statisticsModels()->each(fn ($s) => $s->delete());

            // 2. Restore Faction basic info (don't overwrite critical integration IDs if they are missing/null in snapshot)
            $factionUpdate = $data['faction'];
            unset($factionUpdate['gtaw_faction_id']); // Protect current integration
            unset($factionUpdate['faction_leader']); // Protect current leadership

            // Ensure roster_template is explicitly handled for global variables
            if (isset($factionUpdate['roster_template'])) {
                $faction->roster_template = $factionUpdate['roster_template'];
            }

            $faction->update($factionUpdate);

            // Mapping old IDs to new IDs to maintain relationships
            $roleMapping = [];
            $groupMapping = [];
            $datasetMapping = [];
            $databaseMapping = [];
            $formMapping = [];
            $statusMapping = [];
            $stageMapping = [];
            $sectionMapping = [];
            $fieldMapping = [];

            // 3. Restore Roles
            foreach ($data['roles'] ?? [] as $rData) {
                $oldRoleId = $rData['id'] ?? ($rData['role']['id'] ?? null);
                $role = $faction->roles()->create($rData['role']);
                if ($oldRoleId) {
                    $roleMapping[$oldRoleId] = $role->id;
                }

                foreach ($rData['permissions'] ?? [] as $pData) {
                    $role->permissions()->create($pData);
                }
            }

            // Helper to recursively update dataset_id in columns/settings
            $mapColumnDatasets = function ($columns) use (&$datasetMapping) {
                if (empty($columns)) {
                    return $columns;
                }

                return collect($columns)->map(function ($col) use (&$datasetMapping) {
                    // Standard dataset linkage
                    if (! empty($col['dataset_id'])) {
                        $col['dataset_id'] = $datasetMapping[$col['dataset_id']] ?? null;
                    }

                    // Advanced: Deep mapping for settings (e.g. global variable dropdowns)
                    if (isset($col['settings']) && is_array($col['settings'])) {
                        if (! empty($col['settings']['dataset_id'])) {
                            $col['settings']['dataset_id'] = $datasetMapping[$col['settings']['dataset_id']] ?? null;
                        }
                    }

                    return $col;
                })->toArray();
            };

            // 4. Restore Groups
            foreach ($data['groups'] ?? [] as $groupData) {
                $oldGroupId = $groupData['id'] ?? ($groupData['group']['id'] ?? null);
                $groupInfo = $groupData['group'] ?? $groupData;
                $group = $faction->groups()->create(array_merge($groupInfo, ['created_by' => $currentUserId]));
                if ($oldGroupId) {
                    $groupMapping[$oldGroupId] = $group->id;
                }
            }

            // 5. Restore Flags
            foreach ($data['flags'] ?? [] as $fData) {
                $faction->rosterFlags()->create(array_merge($fData, ['created_by' => $currentUserId]));
            }

            // 6. Restore Record Databases
            foreach ($data['recordDatabases'] ?? [] as $dbData) {
                $oldDbId = $dbData['id'] ?? ($dbData['database']['id'] ?? null);
                $db = $faction->recordDatabases()->create(array_merge($dbData['database'], ['created_by' => $currentUserId]));
                if ($oldDbId) {
                    $databaseMapping[$oldDbId] = $db->id;
                }

                // Handle entries if they exist in snapshot
                if (isset($dbData['entries'])) {
                    foreach ($dbData['entries'] as $eData) {
                        $db->entries()->create(array_merge($eData, ['created_by' => $currentUserId]));
                    }
                }

                // Handle permissions if they exist in snapshot
                if (isset($dbData['permissions'])) {
                    foreach ($dbData['permissions'] as $pData) {
                        $pInfo = $pData;
                        if (! empty($pInfo['group_id'])) {
                            $pInfo['group_id'] = $groupMapping[$pInfo['group_id']] ?? null;
                        }
                        if (! empty($pInfo['role_id'])) {
                            $pInfo['role_id'] = $roleMapping[$pInfo['role_id']] ?? null;
                        }
                        $db->databasePermissions()->create($pInfo);
                    }
                }
            }

            // 7. Restore Datasets
            foreach ($data['datasets'] ?? [] as $dData) {
                $oldDatasetId = $dData['id'] ?? ($dData['dataset']['id'] ?? null);
                $datasetInfo = array_merge($dData['dataset'], ['created_by' => $currentUserId]);

                // Map the record_database_id if it exists
                if (! empty($datasetInfo['record_database_id'])) {
                    $datasetInfo['record_database_id'] = $databaseMapping[$datasetInfo['record_database_id']] ?? null;
                }

                $dataset = $faction->rosterDatasets()->create($datasetInfo);
                if ($oldDatasetId) {
                    $datasetMapping[$oldDatasetId] = $dataset->id;
                }

                foreach ($dData['options'] ?? [] as $oData) {
                    $dataset->options()->create(array_merge($oData, [
                        'roster_dataset_id' => $dataset->id,
                    ]));
                }
            }

            // 8. Restore Rosters & Content
            foreach ($data['rosters'] ?? [] as $rData) {
                $oldRosterId = $rData['id'] ?? ($rData['roster']['id'] ?? null);
                $rosterInfo = array_merge($rData['roster'], ['created_by' => $currentUserId]);
                $rosterInfo['columns'] = $mapColumnDatasets($rosterInfo['columns'] ?? []);

                $roster = $faction->rosters()->create($rosterInfo);

                // Restore Roster Permissions
                if (isset($rData['permissions'])) {
                    foreach ($rData['permissions'] as $pData) {
                        $pInfo = $pData;
                        if (! empty($pInfo['group_id'])) {
                            $pInfo['group_id'] = $groupMapping[$pInfo['group_id']] ?? null;
                        }
                        if (! empty($pInfo['role_id'])) {
                            $pInfo['role_id'] = $roleMapping[$pInfo['role_id']] ?? null;
                        }
                        $roster->rosterPermissions()->create($pInfo);
                    }
                }

                // Sections
                $this->restoreSections($roster, $rData['sections'] ?? [], $currentUserId, null, $datasetMapping, $mapColumnDatasets);
            }

            // 9. Restore Statistics Models
            foreach ($data['statistics'] ?? [] as $sData) {
                $oldStatId = $sData['id'] ?? ($sData['model']['id'] ?? null);
                $sm = $faction->statisticsModels()->create(array_merge($sData['model'], ['created_by' => $currentUserId]));

                // Widgets
                foreach ($sData['widgets'] ?? [] as $wData) {
                    $sm->widgets()->create($wData);
                }

                // Permissions
                foreach ($sData['permissions'] ?? [] as $pData) {
                    $pInfo = $pData;
                    if (! empty($pInfo['group_id'])) {
                        $pInfo['group_id'] = $groupMapping[$pInfo['group_id']] ?? null;
                    }
                    if (! empty($pInfo['role_id'])) {
                        $pInfo['role_id'] = $roleMapping[$pInfo['role_id']] ?? null;
                    }
                    $sm->statisticsPermissions()->create($pInfo);
                }
            }

            // 10. Restore Forms
            foreach ($data['forms'] ?? [] as $formData) {
                $oldFormId = $formData['id'] ?? ($formData['form']['id'] ?? null);
                $form = $faction->forms()->create(array_merge($formData['form'], ['created_by' => $currentUserId]));
                if ($oldFormId) {
                    $formMapping[$oldFormId] = $form->id;
                }

                // 10.1 Restore Form Statuses
                foreach ($formData['statuses'] ?? [] as $statusData) {
                    $oldStatusId = $statusData['id'] ?? ($statusData['status']['id'] ?? null);
                    $statusInfo = $statusData['status'] ?? $statusData;
                    $status = $form->statuses()->create($statusInfo);
                    if ($oldStatusId) {
                        $statusMapping[$oldStatusId] = $status->id;
                    }
                }

                // 10.2 Restore Form Stages
                foreach ($formData['stages'] ?? [] as $stageData) {
                    $oldStageId = $stageData['id'] ?? ($stageData['stage']['id'] ?? null);
                    $stageInfo = $stageData['stage'];
                    if (! empty($stageInfo['submit_status_id'])) {
                        $stageInfo['submit_status_id'] = $statusMapping[$stageInfo['submit_status_id']] ?? null;
                    }
                    $stage = $form->stages()->create($stageInfo);
                    if ($oldStageId) {
                        $stageMapping[$oldStageId] = $stage->id;
                    }

                    // Restore Form Sections for this stage
                    foreach ($stageData['sections'] ?? [] as $sectionData) {
                        $oldSectionId = $sectionData['id'] ?? ($sectionData['section']['id'] ?? null);
                        $sectionInfo = $sectionData['section'];
                        $section = $stage->sections()->create($sectionInfo);
                        if ($oldSectionId) {
                            $sectionMapping[$oldSectionId] = $section->id;
                        }

                        // Restore Form Fields for this section
                        foreach ($sectionData['fields'] ?? [] as $fieldData) {
                            $oldFieldId = $fieldData['id'] ?? ($fieldData['field']['id'] ?? null);
                            $fieldInfo = $fieldData['field'] ?? $fieldData;
                            $field = $section->fields()->create($fieldInfo);
                            if ($oldFieldId) {
                                $fieldMapping[$oldFieldId] = $field->id;
                            }
                        }
                    }
                }

                // 10.3 Restore Status-Stage pivot linkages
                foreach ($formData['status_stage_links'] ?? [] as $link) {
                    $newStatusId = $statusMapping[$link['form_status_id']] ?? null;
                    $newStageId = $stageMapping[$link['form_stage_id']] ?? null;
                    if ($newStatusId && $newStageId) {
                        DB::table('form_status_stage')->insert([
                            'form_status_id' => $newStatusId,
                            'form_stage_id' => $newStageId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                // 10.4 Restore Form Permissions
                foreach ($formData['permissions'] ?? [] as $pData) {
                    $pInfo = $pData;
                    if (! empty($pInfo['group_id'])) {
                        $pInfo['group_id'] = $groupMapping[$pInfo['group_id']] ?? null;
                    }
                    if (! empty($pInfo['role_id'])) {
                        $pInfo['role_id'] = $roleMapping[$pInfo['role_id']] ?? null;
                    }
                    $form->formPermissions()->create($pInfo);
                }

                // 10.5 Restore Form Automations
                foreach ($formData['automations'] ?? [] as $aData) {
                    $autoInfo = $aData;
                    if (! empty($autoInfo['trigger_status_id'])) {
                        $autoInfo['trigger_status_id'] = $statusMapping[$autoInfo['trigger_status_id']] ?? null;
                    }
                    if (! empty($autoInfo['trigger_stage_id'])) {
                        $autoInfo['trigger_stage_id'] = $stageMapping[$autoInfo['trigger_stage_id']] ?? null;
                    }
                    if (! empty($autoInfo['action_status_id'])) {
                        $autoInfo['action_status_id'] = $statusMapping[$autoInfo['action_status_id']] ?? null;
                    }
                    if (! empty($autoInfo['action_group_id'])) {
                        $autoInfo['action_group_id'] = $groupMapping[$autoInfo['action_group_id']] ?? null;
                    }

                    // Map internal field and status references in conditions
                    if (isset($autoInfo['conditions']) && is_array($autoInfo['conditions'])) {
                        $conditions = $autoInfo['conditions'];
                        foreach ($conditions as &$condition) {
                            if (isset($condition['field_id'])) {
                                $condition['field_id'] = $fieldMapping[$condition['field_id']] ?? null;
                            }
                            if (isset($condition['type']) && $condition['type'] === 'status' && isset($condition['value'])) {
                                $condition['value'] = (string) ($statusMapping[$condition['value']] ?? $condition['value']);
                            }
                        }
                        $autoInfo['conditions'] = $conditions;
                    }

                    $form->automations()->create($autoInfo);
                }
            }
        });

        $this->audit('snapshot.restore', "Restored faction '{$faction->name}' from snapshot '{$snapshot->name}'", null, $snapshot, $oldValues, $faction->getDirty());

        return response()->json(['message' => 'Restore successful']);
    }

    private function restoreSections($roster, $sections, $currentUserId, $parentId = null, $datasetMapping = [], $mapColumnDatasets = null)
    {
        foreach ($sections as $sData) {
            $sectionInfo = array_merge($sData['section'], [
                'roster_id' => $roster->id,
                'parent_id' => $parentId,
                'created_by' => $currentUserId,
            ]);

            if ($mapColumnDatasets) {
                $sectionInfo['columns'] = $mapColumnDatasets($sectionInfo['columns'] ?? []);
            }

            $section = $roster->sections()->create($sectionInfo);

            foreach ($sData['contents'] ?? [] as $cData) {
                $section->contents()->create(array_merge($cData, [
                    'created_by' => $currentUserId,
                ]));
            }

            if (! empty($sData['children'])) {
                $this->restoreSections($roster, $sData['children'], $currentUserId, $section->id, $datasetMapping, $mapColumnDatasets);
            }
        }
    }

    public function destroy(FactionSnapshot $snapshot)
    {
        if (! User::hasFactionPermission(Auth::user(), $snapshot->faction, 'delete_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('snapshot.delete', "Deleted snapshot '{$snapshot->name}'", null, $snapshot, $snapshot->getAttributes());

        $snapshot->delete();

        return response()->json(['message' => 'Snapshot deleted']);
    }

    public function download(FactionSnapshot $snapshot)
    {
        if (! User::hasFactionPermission(Auth::user(), $snapshot->faction, 'view_snapshots')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('snapshot.download', "Downloaded snapshot '{$snapshot->name}'", null, $snapshot);

        $filename = 'snapshot_'.$snapshot->faction->shortname.'_'.$snapshot->created_at->format('Y-m-d_H-i').'.json';

        return response()->streamDownload(function () use ($snapshot) {
            echo json_encode([
                'v' => 1,
                'name' => $snapshot->name,
                'description' => $snapshot->description,
                'data' => $snapshot->data,
            ], JSON_PRETTY_PRINT);
        }, $filename);
    }

    public function upload(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        if (! User::hasFactionPermission(Auth::user(), $faction, 'create_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'file' => 'required|file|extensions:json',
        ], [
            'file.uploaded' => 'The file failed to upload. This is usually because the file size exceeds the server upload limit (currently '.ini_get('upload_max_filesize').').',
        ]);

        $fileContent = file_get_contents($request->file('file')->path());
        $snapshotData = json_decode($fileContent, true);

        if (! $snapshotData || ! isset($snapshotData['data'])) {
            return response()->json(['message' => 'Invalid snapshot file'], 422);
        }

        $snapshot = FactionSnapshot::create([
            'faction_id' => $faction->id,
            'name' => ($snapshotData['name'] ?? 'Uploaded Backup').' (Imported)',
            'description' => $snapshotData['description'] ?? 'Manually uploaded backup file',
            'data' => $snapshotData['data'],
            'type' => 'manual',
            'created_by' => Auth::id(),
        ]);

        $this->audit('snapshot.upload', "Uploaded snapshot '{$snapshot->name}'", null, $snapshot);

        return response()->json($snapshot);
    }
}
