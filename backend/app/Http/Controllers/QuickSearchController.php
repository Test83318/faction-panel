<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionRecordDatabase;
use App\Models\FactionRecordEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class QuickSearchController extends Controller
{
    public function updateSettings(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!User::hasFactionPermission(Auth::user(), $faction, 'modify_global_quick_search')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'database_id' => 'required_if:enabled,true|nullable|exists:faction_record_databases,id',
            'column_id' => 'required_if:enabled,true|nullable|string',
            'exact_match_only' => 'required|boolean',
        ]);

        $faction->update([
            'quick_search_enabled' => $validated['enabled'],
            'quick_search_settings' => [
                'database_id' => $validated['database_id'],
                'column_id' => $validated['column_id'],
                'exact_match_only' => $validated['exact_match_only'],
            ],
        ]);

        return response()->json(['message' => 'Quick search settings updated', 'faction' => $faction]);
    }

    public function search(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!$faction->quick_search_enabled || !$faction->quick_search_settings) {
            return response()->json([], 200);
        }

        $settings = $faction->quick_search_settings;
        $dbId = $settings['database_id'];
        $columnId = $settings['column_id'];
        $exactMatchOnly = $settings['exact_match_only'];

        $query = $request->input('q');

        if (!$query || strlen($query) < ( $exactMatchOnly ? 1 : 3)) {
            return response()->json([], 200);
        }

        $database = FactionRecordDatabase::find($dbId);
        if (!$database || $database->faction_id !== $faction->id) {
            return response()->json([], 200);
        }

        // Check if user has permission to view this database
        // Assuming 'view_faction_records' or specific database permission
        if (!User::hasFactionPermission(Auth::user(), $faction, 'view_faction_records')) {
            // Check specific database permissions if any (implementation depends on how FactionRecordDatabasePermission works)
            // For now, let's assume basic check
            return response()->json([], 403);
        }

        $entriesQuery = $database->entries()->where('is_active', true);

        if ($exactMatchOnly) {
            $entriesQuery->where("data->{$columnId}", $query);
        } else {
            $entriesQuery->where("data->{$columnId}", 'like', "%{$query}%");
        }

        $results = $entriesQuery->limit(10)->get()->map(function($entry) use ($columnId, $database) {
            return [
                'id' => $entry->id,
                'entry_id' => $entry->entry_id,
                'value' => $entry->data[$columnId] ?? 'Unknown',
                'database_id' => $entry->database_id,
                'database_shortcode' => $database->record_shortcode,
            ];
        });

        return response()->json($results);
    }
}
