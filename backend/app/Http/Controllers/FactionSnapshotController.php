<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionSnapshot;
use App\Models\User;
use App\Models\Roster;
use App\Models\RosterSection;
use App\Models\RosterContent;
use App\Models\RosterDataset;
use App\Models\RosterDatasetOption;
use App\Models\RosterFlag;
use App\Models\Role;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FactionSnapshotController extends Controller
{
    public function index(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        if (!User::hasFactionPermission(Auth::user(), $faction, 'view_snapshots')) {
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
        if (!User::hasFactionPermission(Auth::user(), $faction, 'create_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string'
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

        $this->createSnapshot($faction, 'Automatic Backup ' . now()->format('Y-m-d H:i'), 'Scheduled daily automatic snapshot', 'auto');
        
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
            'created_by' => Auth::id()
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

    private function captureFactionState(Faction $faction)
    {
        return [
            'faction' => $faction->only(['name', 'shortname', 'description', 'color', 'roster_template', 'quick_search_enabled', 'quick_search_settings']),
            'roles' => $faction->roles()->with('permissions')->get()->map(function($role) {
                return [
                    'role' => $role->only(['name', 'weight', 'color', 'type']),
                    'permissions' => $role->permissions->map(fn($p) => $p->only(['permission_key', 'value']))->toArray()
                ];
            })->toArray(),
            'flags' => $faction->rosterFlags()->get()->map(fn($f) => $f->only(['name', 'rules', 'color', 'icon', 'order', 'is_active', 'excluded_rosters']))->toArray(),
            'datasets' => $faction->rosterDatasets()->with('options')->get()->map(fn($d) => [
                'dataset' => $d->only(['name', 'type', 'is_published', 'linked_database_id', 'linking_settings']),
                'options' => $d->options->map(fn($o) => $o->only(['label', 'color', 'is_bold', 'order']))->toArray()
            ])->toArray(),
            'rosters' => $faction->rosters()->get()->map(function($roster) {
                return [
                    'roster' => $roster->only(['name', 'shortname', 'color', 'order', 'roster_options', 'columns', 'layout_settings', 'default_sections_per_row']),
                    'sections' => $this->captureSections($roster->id)
                ];
            })->toArray(),
            'groups' => $faction->groups()->get()->map(fn($g) => $g->only(['name', 'shortname', 'color', 'description']))->toArray()
        ];
    }

    private function captureSections($rosterId, $parentId = null)
    {
        return RosterSection::where('roster_id', $rosterId)
            ->where('parent_id', $parentId)
            ->with(['contents'])
            ->get()
            ->map(function($section) use ($rosterId) {
                return [
                    'section' => $section->only(['name', 'shortname', 'color', 'type', 'order', 'section_options', 'columns', 'use_roster_columns', 'layout_settings', 'subsections_per_row', 'content_html']),
                    'contents' => $section->contents->map(fn($c) => $c->only(['content', 'type', 'color', 'order']))->toArray(),
                    'children' => $this->captureSections($rosterId, $section->id)
                ];
            })->toArray();
    }

    public function restore(Request $request, FactionSnapshot $snapshot)
    {
        $faction = $snapshot->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'restore_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        DB::transaction(function() use ($faction, $snapshot) {
            $data = $snapshot->data;
            $currentUserId = Auth::id();

            // 1. Wipe existing data (Keep members and audit logs)
            $faction->rosters()->each(fn($r) => $r->delete());
            $faction->roles()->each(fn($r) => $r->delete());
            $faction->groups()->each(fn($g) => $g->delete());
            $faction->rosterFlags()->each(fn($f) => $f->delete());
            $faction->rosterDatasets()->each(fn($d) => $d->delete());

            // 2. Restore Faction basic info
            $faction->update($data['faction']);

            // 3. Restore Roles
            foreach ($data['roles'] as $rData) {
                $role = $faction->roles()->create($rData['role']);
                foreach ($rData['permissions'] as $pData) {
                    $role->permissions()->create($pData);
                }
            }

            // 4. Restore Groups
            foreach ($data['groups'] as $groupData) {
                $faction->groups()->create(array_merge($groupData, ['created_by' => $currentUserId]));
            }

            // 5. Restore Flags
            foreach ($data['flags'] ?? [] as $fData) {
                $faction->rosterFlags()->create(array_merge($fData, ['created_by' => $currentUserId]));
            }

            // 6. Restore Datasets
            foreach ($data['datasets'] ?? [] as $dData) {
                $dataset = $faction->rosterDatasets()->create(array_merge($dData['dataset'], ['created_by' => $currentUserId]));
                foreach ($dData['options'] as $oData) {
                    $dataset->options()->create($oData);
                }
            }

            // 7. Restore Rosters & Content
            foreach ($data['rosters'] as $rData) {
                $roster = $faction->rosters()->create(array_merge($rData['roster'], ['created_by' => $currentUserId]));
                
                // Sections
                $this->restoreSections($roster, $rData['sections'], $currentUserId);
            }
        });

        return response()->json(['message' => 'Restore successful']);
    }

    private function restoreSections($roster, $sections, $currentUserId, $parentId = null)
    {
        foreach ($sections as $sData) {
            $section = $roster->sections()->create(array_merge($sData['section'], [
                'roster_id' => $roster->id,
                'parent_id' => $parentId,
                'created_by' => $currentUserId
            ]));

            foreach ($sData['contents'] as $cData) {
                $section->contents()->create(array_merge($cData, [
                    'created_by' => $currentUserId
                ]));
            }

            if (!empty($sData['children'])) {
                $this->restoreSections($roster, $sData['children'], $currentUserId, $section->id);
            }
        }
    }

    public function destroy(FactionSnapshot $snapshot)
    {
        if (!User::hasFactionPermission(Auth::user(), $snapshot->faction, 'delete_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $snapshot->delete();
        return response()->json(['message' => 'Snapshot deleted']);
    }

    public function download(FactionSnapshot $snapshot)
    {
        if (!User::hasFactionPermission(Auth::user(), $snapshot->faction, 'view_snapshots')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $filename = 'snapshot_' . $snapshot->faction->shortname . '_' . $snapshot->created_at->format('Y-m-d_H-i') . '.json';
        
        return response()->streamDownload(function() use ($snapshot) {
            echo json_encode([
                'v' => 1,
                'name' => $snapshot->name,
                'description' => $snapshot->description,
                'data' => $snapshot->data
            ], JSON_PRETTY_PRINT);
        }, $filename);
    }

    public function upload(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        if (!User::hasFactionPermission(Auth::user(), $faction, 'create_snapshot')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:json',
        ]);

        $fileContent = file_get_contents($request->file('file')->path());
        $snapshotData = json_decode($fileContent, true);

        if (!$snapshotData || !isset($snapshotData['data'])) {
            return response()->json(['message' => 'Invalid snapshot file'], 422);
        }

        $snapshot = FactionSnapshot::create([
            'faction_id' => $faction->id,
            'name' => ($snapshotData['name'] ?? 'Uploaded Backup') . ' (Imported)',
            'description' => $snapshotData['description'] ?? 'Manually uploaded backup file',
            'data' => $snapshotData['data'],
            'type' => 'manual',
            'created_by' => Auth::id()
        ]);

        return response()->json($snapshot);
    }
}
