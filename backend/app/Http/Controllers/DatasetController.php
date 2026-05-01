<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\RosterDataset;
use App\Models\RosterDatasetOption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DatasetController extends Controller
{
    public function index($shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        $datasets = RosterDataset::where('faction_id', $faction->id)
            ->with('options')
            ->get();

        return response()->json($datasets);
    }

    public function store($shortname, Request $request)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $dataset = RosterDataset::create([
            'faction_id' => $faction->id,
            'name' => $request->name,
        ]);

        return response()->json($dataset->load('options'));
    }

    public function update(RosterDataset $dataset, Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'options' => 'array',
            'options.*.value' => 'required|string',
            'options.*.color' => 'nullable|string|max:7',
            'options.*.is_bold' => 'boolean',
            'options.*.order' => 'integer',
        ]);

        DB::transaction(function () use ($dataset, $request) {
            $dataset->update(['name' => $request->name]);

            if ($request->has('options')) {
                $optionIds = collect($request->options)->pluck('id')->filter();
                $dataset->options()->whereNotIn('id', $optionIds)->delete();

                foreach ($request->options as $index => $optionData) {
                    $data = [
                        'value' => $optionData['value'],
                        'color' => $optionData['color'] ?? null,
                        'is_bold' => $optionData['is_bold'] ?? false,
                        'order' => $optionData['order'] ?? $index,
                    ];

                    if (isset($optionData['id'])) {
                        RosterDatasetOption::where('id', $optionData['id'])->update($data);
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
        $dataset->delete();
        return response()->json(['message' => 'Dataset deleted']);
    }
}
