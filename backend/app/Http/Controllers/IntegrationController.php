<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionRecordDatabase;
use App\Models\FactionRecordEntry;
use App\Models\User;
use App\Services\GtawService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IntegrationController extends Controller
{
    protected GtawService $gtawService;

    public function __construct(GtawService $gtawService)
    {
        $this->gtawService = $gtawService;
    }

    public function getAvailableFactions(string $shortname)
    {
        $user = Auth::user();
        if (!$user->gtaw_access_token) {
            return response()->json(['message' => 'User not linked with GTA:W'], 400);
        }

        $res = $this->gtawService->getFactions($user->gtaw_access_token);
        if (!$res || !isset($res['data'])) {
            return response()->json(['message' => 'Failed to fetch factions from GTA:W or invalid response'], 500);
        }

        $factions = $res['data'];
        $available = [];

        foreach ($factions as $f) {
            $rank = $f['faction_rank'] ?? 0;
            if ($rank >= 15) {
                $available[] = [
                    'id' => $f['faction'],
                    'name' => $f['faction_name'],
                    'rank' => $rank,
                    'rank_name' => $f['faction_rank_name'] ?? ''
                ];
            }
        }

        return response()->json($available);
    }

    public function setupGtaw(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        if (!Auth::user()->hasPermission('manage_integrations', $faction->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'gtaw_faction_id' => 'required|integer',
        ]);

        if ($faction->gtaw_faction_id) {
            return response()->json(['message' => 'Integration already exists'], 400);
        }

        return DB::transaction(function () use ($request, $faction) {
            $faction->update([
                'gtaw_faction_id' => $request->gtaw_faction_id
            ]);

            // 1. Create Characters Database
            $charDb = $faction->recordDatabases()->create([
                'name' => 'Characters Database',
                'description' => 'Automated synchronization of faction characters from GTA:W.',
                'allow_details_view' => true,
                'data_overview_display' => 'table',
                'data_entry_display' => 'card',
                'record_shortcode' => 'CHARS',
                'is_api_database' => true,
                'is_published' => true,
                'created_by' => Auth::id(),
                'database_structure' => [
                    ['id' => 'id', 'name' => 'ID', 'type' => 'number', 'required' => true],
                    ['id' => 'name', 'name' => 'Character Name', 'type' => 'text', 'required' => true],
                    ['id' => 'rank', 'name' => 'Rank', 'type' => 'text', 'required' => true],
                    ['id' => 'abas', 'name' => 'ABAS', 'type' => 'text', 'required' => false],
                    ['id' => 'user_id', 'name' => 'User ID', 'type' => 'number', 'required' => true],
                    ['id' => 'char_id', 'name' => 'Character ID', 'type' => 'number', 'required' => true],
                    ['id' => 'is_alt', 'name' => 'Alternative Character', 'type' => 'boolean', 'required' => true],
                ],
                'detail_customization' => [
                    'linked_databases' => [],
                    'roster_integration' => ['enabled' => true]
                ]
            ]);

            // Add self-link for "Other characters of this user"
            $charDb->update([
                'detail_customization' => [
                    'linked_databases' => [
                        [
                            'id' => (string) Str::uuid(),
                            'database_id' => $charDb->id,
                            'source_field' => 'user_id',
                            'target_field' => 'user_id',
                            'exclude_current' => true
                        ]
                    ],
                    'roster_integration' => ['enabled' => true]
                ]
            ]);

            // 2. Create History Database
            $historyDb = $faction->recordDatabases()->create([
                'name' => 'Character History',
                'description' => 'Logs of characters joining or leaving the faction on GTA:W.',
                'allow_details_view' => true,
                'data_overview_display' => 'table',
                'data_entry_display' => 'card',
                'record_shortcode' => 'CHIST',
                'is_api_database' => true,
                'created_by' => Auth::id(),
                'database_structure' => [
                    ['id' => 'char_id', 'name' => 'Character ID', 'type' => 'number', 'required' => true],
                    ['id' => 'name', 'name' => 'Character Name', 'type' => 'text', 'required' => true],
                    ['id' => 'action', 'name' => 'Action', 'type' => 'text', 'required' => true],
                    ['id' => 'date', 'name' => 'Date', 'type' => 'date', 'required' => true],
                ]
            ]);

            // 3. Create Name Changes Database
            $nameChangeDb = $faction->recordDatabases()->create([
                'name' => 'Name Changes',
                'description' => 'Logs of character name changes on GTA:W.',
                'allow_details_view' => true,
                'data_overview_display' => 'table',
                'data_entry_display' => 'card',
                'record_shortcode' => 'CNAME',
                'is_api_database' => true,
                'created_by' => Auth::id(),
                'database_structure' => [
                    ['id' => 'char_id', 'name' => 'Character ID', 'type' => 'number', 'required' => true],
                    ['id' => 'old_name', 'name' => 'Old Name', 'type' => 'text', 'required' => true],
                    ['id' => 'new_name', 'name' => 'New Name', 'type' => 'text', 'required' => true],
                    ['id' => 'date', 'name' => 'Date', 'type' => 'date', 'required' => true],
                ]
            ]);

            return response()->json([
                'message' => 'Integration setup successful',
                'databases' => [
                    'characters' => $charDb,
                    'history' => $historyDb,
                    'name_changes' => $nameChangeDb
                ]
            ]);
        });
    }

    public function syncGtaw(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        if (!Auth::user()->hasPermission('manage_integrations', $faction->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$faction->gtaw_faction_id) {
            return response()->json(['message' => 'Integration not setup'], 400);
        }

        $user = Auth::user();
        if (!$user->gtaw_access_token) {
            return response()->json(['message' => 'User not linked with GTA:W'], 400);
        }

        $res = $this->gtawService->getFactionMembers($user->gtaw_access_token, $faction->gtaw_faction_id);
        if (!$res || !isset($res['data']['members'])) {
            return response()->json(['message' => 'Failed to fetch members from GTA:W or invalid response'], 500);
        }

        // Optional: Fetch ABAS data if available
        $abasRes = $this->gtawService->getFactionAbas($user->gtaw_access_token, $faction->gtaw_faction_id);
        $abasData = ($abasRes && isset($abasRes['data'])) ? $abasRes['data'] : [];

        $charDb = $faction->recordDatabases()->where('record_shortcode', 'CHARS')->firstOrFail();
        $historyDb = $faction->recordDatabases()->where('record_shortcode', 'CHIST')->firstOrFail();
        $nameChangeDb = $faction->recordDatabases()->where('record_shortcode', 'CNAME')->firstOrFail();

        $currentEntries = $charDb->entries()->get();
        $gtawMembers = $res['data']['members'];

        $now = now()->toDateString();
        $syncResults = [
            'added' => 0,
            'updated' => 0,
            'removed' => 0,
            'name_changes' => 0
        ];

        DB::transaction(function () use ($charDb, $historyDb, $nameChangeDb, $currentEntries, $gtawMembers, $abasData, $now, &$syncResults) {
            $processedCharIds = [];
            $userCharCounts = collect($gtawMembers)->groupBy('user_id')->map->count();

            foreach ($gtawMembers as $member) {
                $charId = $member['character_id'];
                $processedCharIds[] = $charId;

                $existingEntry = $currentEntries->first(function ($e) use ($charId) {
                    return ($e->data['char_id'] ?? null) == $charId;
                });

                // Find ABAS for this character. The endpoint might return a list or just for one.
                // Assuming it returns a keyed object by character_id or an array of character data.
                $abas = '';
                if (isset($abasData[$charId])) {
                    $abas = $abasData[$charId]['abas'] ?? $abasData[$charId] ?? '';
                } elseif (isset($member['abas'])) {
                    $abas = $member['abas'];
                }

                $memberData = [
                    'id' => $member['character_id'],
                    'name' => $member['character_name'],
                    'rank' => $member['rank_name'],
                    'abas' => (string) $abas,
                    'user_id' => $member['user_id'],
                    'char_id' => $member['character_id'],
                    'is_alt' => ($userCharCounts[$member['user_id']] ?? 1) > 1, // Basic logic: if user has > 1 char in faction, they are alts
                ];

                if ($existingEntry) {
                    // Check for name change
                    if ($existingEntry->data['name'] !== $member['character_name']) {
                        $nameChangeDb->entries()->create([
                            'entry_id' => ($nameChangeDb->entries()->withTrashed()->max('entry_id') ?? 0) + 1,
                            'data' => [
                                'char_id' => $charId,
                                'old_name' => $existingEntry->data['name'],
                                'new_name' => $member['character_name'],
                                'date' => $now
                            ],
                            'created_by' => Auth::id()
                        ]);
                        $syncResults['name_changes']++;
                    }

                    // Update existing
                    $existingEntry->update(['data' => $memberData]);
                    $syncResults['updated']++;
                } else {
                    // Create new
                    $charDb->entries()->create([
                        'entry_id' => ($charDb->entries()->withTrashed()->max('entry_id') ?? 0) + 1,
                        'data' => $memberData,
                        'created_by' => Auth::id()
                    ]);

                    // Log to history
                    $historyDb->entries()->create([
                        'entry_id' => ($historyDb->entries()->withTrashed()->max('entry_id') ?? 0) + 1,
                        'data' => [
                            'char_id' => $charId,
                            'name' => $member['character_name'],
                            'action' => 'Added',
                            'date' => $now
                        ],
                        'created_by' => Auth::id()
                    ]);

                    $syncResults['added']++;
                }
            }

            // Remove characters no longer in faction
            foreach ($currentEntries as $entry) {
                $charId = $entry->data['char_id'] ?? null;
                if ($charId && !in_array($charId, $processedCharIds)) {
                    // Log to history before deleting
                    $historyDb->entries()->create([
                        'entry_id' => ($historyDb->entries()->withTrashed()->max('entry_id') ?? 0) + 1,
                        'data' => [
                            'char_id' => $charId,
                            'name' => $entry->data['name'],
                            'action' => 'Removed',
                            'date' => $now
                        ],
                        'created_by' => Auth::id()
                    ]);

                    $entry->delete();
                    $syncResults['removed']++;
                }
            }
        });

        return response()->json([
            'message' => 'Synchronization complete',
            'results' => $syncResults
        ]);
    }

    public function pruneGtaw(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        if (!Auth::user()->hasPermission('manage_integrations', $faction->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $charDb = $faction->recordDatabases()->where('record_shortcode', 'CHARS')->first();
        if ($charDb) {
            $charDb->entries()->delete();
        }

        return response()->json(['message' => 'All synchronized data pruned']);
    }
}
