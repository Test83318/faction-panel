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

            $dbs = $this->ensureGtawDatabases($faction);

            return response()->json([
                'message' => 'Integration setup successful',
                'databases' => [
                    'characters' => $dbs['CHARS'],
                    'history' => $dbs['CHIST'],
                    'name_changes' => $dbs['CNAME'],
                    'activity' => $dbs['ACTIVITY']
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

        $dbs = $this->ensureGtawDatabases($faction);
        $charDb = $dbs['CHARS'];
        $historyDb = $dbs['CHIST'];
        $nameChangeDb = $dbs['CNAME'];
        $activityDb = $dbs['ACTIVITY'];

        $currentEntries = $charDb->entries()->get();
        $gtawMembers = $res['data']['members'];

        $now = now()->toDateString();
        $syncResults = [
            'added' => 0,
            'updated' => 0,
            'removed' => 0,
            'name_changes' => 0,
            'activity_logs' => 0
        ];

        DB::transaction(function () use ($charDb, $historyDb, $nameChangeDb, $activityDb, $currentEntries, $gtawMembers, $abasData, $now, &$syncResults) {
            $processedCharIds = [];
            $userCharCounts = collect($gtawMembers)->groupBy('user_id')->map->count();

            // Pre-calculate Total ABAS for each user
            $userAbasTotals = [];
            foreach ($gtawMembers as $member) {
                $charId = $member['character_id'];
                $abas = $abasData[$charId]['abas'] ?? $abasData[$charId] ?? $member['abas'] ?? 0;
                $userId = $member['user_id'];
                $userAbasTotals[$userId] = ($userAbasTotals[$userId] ?? 0) + (float)$abas;
            }

            foreach ($gtawMembers as $member) {
                $charId = $member['character_id'];
                $processedCharIds[] = $charId;

                $existingEntry = $currentEntries->first(function ($e) use ($charId) {
                    return ($e->data['char_id'] ?? null) == $charId;
                });

                $abasValue = $abasData[$charId]['abas'] ?? $abasData[$charId] ?? $member['abas'] ?? 0;
                $abasString = number_format((float)$abasValue, 2);

                $memberData = [
                    'id' => $member['character_id'],
                    'name' => $member['character_name'],
                    'rank' => $member['rank_name'],
                    'abas' => $abasString,
                    'total_abas' => number_format($userAbasTotals[$member['user_id']] ?? 0, 2),
                    'user_id' => $member['user_id'],
                    'char_id' => $member['character_id'],
                    'is_alt' => ($userCharCounts[$member['user_id']] ?? 1) > 1,
                ];

                // Check for ABAS change
                $oldAbas = $existingEntry ? (float)($existingEntry->data['abas'] ?? 0) : 0;
                $newAbas = (float)$abasValue;

                if (abs($oldAbas - $newAbas) > 0.001) {
                    $activityDb->entries()->create([
                        'entry_id' => ($activityDb->entries()->withTrashed()->max('entry_id') ?? 0) + 1,
                        'data' => [
                            'char_id' => $charId,
                            'user_id' => $member['user_id'],
                            'name' => $member['character_name'],
                            'abas' => number_format($oldAbas, 2) . ' > ' . $abasString,
                            'date' => $now
                        ],
                        'created_by' => Auth::id()
                    ]);
                    $syncResults['activity_logs']++;
                }

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

    private function ensureGtawDatabases(Faction $faction)
    {
        $databases = [
            'CHARS' => [
                'name' => 'Characters Database',
                'description' => 'Automated synchronization of faction characters from GTA:W.',
                'record_shortcode' => 'CHARS',
                'structure' => [
                    ['id' => 'id', 'name' => 'ID', 'type' => 'number', 'required' => true],
                    ['id' => 'name', 'name' => 'Character Name', 'type' => 'text', 'required' => true],
                    ['id' => 'rank', 'name' => 'Rank', 'type' => 'text', 'required' => true],
                    ['id' => 'abas', 'name' => 'ABAS', 'type' => 'text', 'required' => false],
                    ['id' => 'total_abas', 'name' => 'Total ABAS', 'type' => 'text', 'required' => false],
                    ['id' => 'user_id', 'name' => 'User ID', 'type' => 'number', 'required' => true],
                    ['id' => 'char_id', 'name' => 'Character ID', 'type' => 'number', 'required' => true],
                    ['id' => 'is_alt', 'name' => 'Alternative Character', 'type' => 'boolean', 'required' => true],
                ],
                'is_published' => true,
                'detail_customization' => [
                    'linked_databases' => [],
                    'roster_integration' => ['enabled' => true]
                ]
            ],
            'ACTIVITY' => [
                'name' => 'Activity Database',
                'description' => 'Logs of ABAS changes for faction members.',
                'record_shortcode' => 'ACTIVITY',
                'structure' => [
                    ['id' => 'char_id', 'name' => 'Character ID', 'type' => 'number', 'required' => true],
                    ['id' => 'user_id', 'name' => 'User ID', 'type' => 'number', 'required' => true],
                    ['id' => 'name', 'name' => 'Character Name', 'type' => 'text', 'required' => true],
                    ['id' => 'abas', 'name' => 'ABAS', 'type' => 'text', 'required' => true],
                    ['id' => 'date', 'name' => 'Date', 'type' => 'date', 'required' => true],
                ],
                'is_published' => true,
            ],
            'CHIST' => [
                'name' => 'Character History',
                'description' => 'Logs of characters joining or leaving the faction on GTA:W.',
                'record_shortcode' => 'CHIST',
                'structure' => [
                    ['id' => 'char_id', 'name' => 'Character ID', 'type' => 'number', 'required' => true],
                    ['id' => 'name', 'name' => 'Character Name', 'type' => 'text', 'required' => true],
                    ['id' => 'action', 'name' => 'Action', 'type' => 'text', 'required' => true],
                    ['id' => 'date', 'name' => 'Date', 'type' => 'date', 'required' => true],
                ],
                'is_published' => true,
            ],
            'CNAME' => [
                'name' => 'Name Changes',
                'description' => 'Logs of character name changes on GTA:W.',
                'record_shortcode' => 'CNAME',
                'structure' => [
                    ['id' => 'char_id', 'name' => 'Character ID', 'type' => 'number', 'required' => true],
                    ['id' => 'old_name', 'name' => 'Old Name', 'type' => 'text', 'required' => true],
                    ['id' => 'new_name', 'name' => 'New Name', 'type' => 'text', 'required' => true],
                    ['id' => 'date', 'name' => 'Date', 'type' => 'date', 'required' => true],
                ],
                'is_published' => true,
            ],
        ];

        $result = [];

        foreach ($databases as $shortcode => $config) {
            $db = $faction->recordDatabases()->where('record_shortcode', $shortcode)->first();
            if (!$db) {
                $db = $faction->recordDatabases()->create([
                    'name' => $config['name'],
                    'description' => $config['description'],
                    'record_shortcode' => $shortcode,
                    'is_api_database' => true,
                    'is_published' => $config['is_published'] ?? false,
                    'created_by' => Auth::id(),
                    'database_structure' => $config['structure'],
                    'detail_customization' => $config['detail_customization'] ?? null,
                    'allow_details_view' => true,
                    'data_overview_display' => 'table',
                    'data_entry_display' => 'card',
                ]);
                
                if ($shortcode === 'CHARS') {
                    // Add self-link for "Other characters of this user"
                    $db->update([
                        'detail_customization' => [
                            'linked_databases' => [
                                [
                                    'id' => (string) Str::uuid(),
                                    'database_id' => $db->id,
                                    'source_field' => 'user_id',
                                    'target_field' => 'user_id',
                                    'exclude_current' => true
                                ]
                            ],
                            'roster_integration' => ['enabled' => true]
                        ]
                    ]);
                }
            } else {
                // Check and add missing columns
                $currentStructure = $db->database_structure;
                $updated = false;
                foreach ($config['structure'] as $field) {
                    $exists = collect($currentStructure)->contains('id', $field['id']);
                    if (!$exists) {
                        $currentStructure[] = $field;
                        $updated = true;
                    }
                }
                if ($updated) {
                    $db->update(['database_structure' => $currentStructure]);
                }
            }
            $result[$shortcode] = $db;
        }

        return $result;
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
