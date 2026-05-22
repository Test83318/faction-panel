<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\RosterDataset;
use App\Models\RosterDatasetOption;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DatasetController extends Controller
{
    public function index($shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::guard('sanctum')->user();

        // Anyone who can view the faction should be able to see datasets for dropdowns
        if (! User::hasFactionPermission($user, $faction, 'view_faction_roster')) {
            // Check if they have at least one roster they can view
            $canViewAnyRoster = false;
            foreach ($faction->rosters as $roster) {
                if (User::hasRosterPermission($user, $roster, 'view_roster')) {
                    $canViewAnyRoster = true;
                    break;
                }
            }
            if (! $canViewAnyRoster) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        $datasets = RosterDataset::where('faction_id', $faction->id)
            ->with(['options', 'recordDatabase'])
            ->get();

        return response()->json($datasets);
    }

    public function store($shortname, Request $request)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (! User::hasFactionPermission(Auth::user(), $faction, 'modify_roster_variables')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'record_database_id' => 'nullable|exists:faction_record_databases,id',
        ]);

        $dataset = RosterDataset::create([
            'faction_id' => $faction->id,
            'name' => $request->name,
            'record_database_id' => $request->record_database_id,
        ]);

        return response()->json($dataset->load(['options', 'recordDatabase']));
    }

    public function update(RosterDataset $dataset, Request $request)
    {
        $faction = $dataset->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'modify_roster_variables')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'record_database_id' => 'nullable|exists:faction_record_databases,id',
            'options' => 'array',
            'options.*.value' => 'required|string',
            'options.*.color' => 'nullable|string|max:7',
            'options.*.is_bold' => 'boolean',
            'options.*.order' => 'integer',
        ]);

        DB::transaction(function () use ($dataset, $request) {
            $dataset->update([
                'name' => $request->name,
                'record_database_id' => $request->record_database_id,
            ]);

            if ($request->has('options')) {
                $optionIds = collect($request->options)->pluck('id')->filter(fn ($id) => is_numeric($id));
                $dataset->options()->whereNotIn('id', $optionIds)->delete();

                foreach ($request->options as $index => $optionData) {
                    $data = [
                        'value' => $optionData['value'],
                        'color' => $optionData['color'] ?? null,
                        'is_bold' => $optionData['is_bold'] ?? false,
                        'order' => $optionData['order'] ?? $index,
                    ];

                    $id = $optionData['id'] ?? null;
                    if ($id && is_numeric($id)) {
                        RosterDatasetOption::where('id', $id)->update($data);
                    } else {
                        $dataset->options()->create($data);
                    }
                }
            }
        });

        return response()->json($dataset->load('options'));
    }

    public function destroy(RosterDataset $dataset)
    {
        $faction = $dataset->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'modify_roster_variables')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $dataset->delete();

        return response()->json(['message' => 'Dataset deleted']);
    }
}
