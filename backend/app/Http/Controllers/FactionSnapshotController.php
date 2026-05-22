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

        return response()->json(
            FactionSnapshot::where('faction_id', $faction->id)
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
            return response()->json(['message' => 'Auto snapshot already exists for today']);
        }

        $this->createSnapshot($faction, 'Automatic Backup '.now()->format('Y-m-d H:i'), 'Scheduled daily automatic snapshot', 'auto');

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
                    'role' => $this->captureModel($role),
                    'permissions' => $role->permissions->map(fn ($p) => $this->captureModel($p))->toArray(),
                ];
            })->toArray(),
            'flags' => $faction->rosterFlags()->get()->map(fn ($f) => $this->captureModel($f))->toArray(),
            'datasets' => $faction->rosterDatasets()->with('options')->get()->map(fn ($d) => [
                'dataset' => $this->captureModel($d),
                'options' => $d->options->map(fn ($o) => $this->captureModel($o, ['dataset_id']))->toArray(),
            ])->toArray(),
            'recordDatabases' => $faction->recordDatabases()->with('entries')->get()->map(fn ($db) => [
                'database' => $this->captureModel($db),
                'entries' => $db->entries->map(fn ($e) => $this->captureModel($e, ['record_database_id']))->toArray(),
            ])->toArray(),
            'rosters' => $faction->rosters()->get()->map(function ($roster) {
                return [
                    'roster' => $this->captureModel($roster),
                    'sections' => $this->captureSections($roster->id),
                ];
            })->toArray(),
            'groups' => $faction->groups()->get()->map(fn ($g) => $this->captureModel($g))->toArray(),
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
            $datasetMapping = [];
            $databaseMapping = [];

            // 3. Restore Roles
            foreach ($data['roles'] as $rData) {
                $oldRoleId = $rData['role']['id'] ?? null;
                $role = $faction->roles()->create($rData['role']);
                if ($oldRoleId) {
                    $roleMapping[$oldRoleId] = $role->id;
                }

                foreach ($rData['permissions'] as $pData) {
                    $role->permissions()->create($pData);
                }
            }

            // Helper to recursively update dataset_id in columns/settings
            $mapColumnDatasets = function ($columns) use ($datasetMapping) {
                if (empty($columns)) {
                    return $columns;
                }

                return collect($columns)->map(function ($col) use ($datasetMapping) {
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
            foreach ($data['groups'] as $groupData) {
                $faction->groups()->create(array_merge($groupData, ['created_by' => $currentUserId]));
            }

            // 5. Restore Flags
            foreach ($data['flags'] ?? [] as $fData) {
                $faction->rosterFlags()->create(array_merge($fData, ['created_by' => $currentUserId]));
            }

            // 6. Restore Record Databases
            foreach ($data['recordDatabases'] ?? [] as $dbData) {
                $oldDbId = $dbData['database']['id'] ?? null;
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
            }

            // 7. Restore Datasets
            foreach ($data['datasets'] ?? [] as $dData) {
                $oldDatasetId = $dData['dataset']['id'] ?? null;
                $datasetInfo = array_merge($dData['dataset'], ['created_by' => $currentUserId]);

                // Map the record_database_id if it exists
                if (! empty($datasetInfo['record_database_id'])) {
                    $datasetInfo['record_database_id'] = $databaseMapping[$datasetInfo['record_database_id']] ?? null;
                }

                $dataset = $faction->rosterDatasets()->create($datasetInfo);
                if ($oldDatasetId) {
                    $datasetMapping[$oldDatasetId] = $dataset->id;
                }

                foreach ($dData['options'] as $oData) {
                    $dataset->options()->create($oData);
                }
            }

            // 8. Restore Rosters & Content
            foreach ($data['rosters'] as $rData) {
                $rosterInfo = array_merge($rData['roster'], ['created_by' => $currentUserId]);
                $rosterInfo['columns'] = $mapColumnDatasets($rosterInfo['columns'] ?? []);

                $roster = $faction->rosters()->create($rosterInfo);

                // Sections
                $this->restoreSections($roster, $rData['sections'], $currentUserId, null, $datasetMapping, $mapColumnDatasets);
            }
        });

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

            foreach ($sData['contents'] as $cData) {
                $section->contents()->create(array_merge($cData, [
                    'created_by' => $currentUserId,
                ]));
            }

            if (! empty($sData['children'])) {
                $this->restoreSections($roster, $sData['children'], $currentUserId, $section->id, $datasetMapping);
            }
        }
    }

    public function destroy(FactionSnapshot $snapshot)
    {
        if (! User::hasFactionPermission(Auth::user(), $snapshot->faction, 'delete_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $snapshot->delete();

        return response()->json(['message' => 'Snapshot deleted']);
    }

    public function download(FactionSnapshot $snapshot)
    {
        if (! User::hasFactionPermission(Auth::user(), $snapshot->faction, 'view_snapshots')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

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

        return response()->json($snapshot);
    }
}
