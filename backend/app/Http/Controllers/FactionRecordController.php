<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionRecordDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FactionRecordController extends Controller
{
    public function index(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        $databases = FactionRecordDatabase::where('faction_id', $faction->id)
            ->with('creator:id,username')
            ->get();

        return response()->json($databases);
    }

    public function store(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'allow_details_view' => 'boolean',
            'data_overview_display' => 'required|string',
            'data_entry_display' => 'required|string',
            'record_shortcode' => 'nullable|string|max:10',
            'database_structure' => 'present|array',
            'detail_customization' => 'nullable|array',
            'permissions' => 'nullable|array',
        ]);

        $database = $faction->recordDatabases()->create([
            ...$validated,
            'is_api_database' => false,
            'created_by' => Auth::id(),
        ]);

        return response()->json($database, 201);
    }

    public function show(string $shortname, FactionRecordDatabase $database)
    {
        return response()->json($database->load('creator:id,username'));
    }

    public function update(Request $request, string $shortname, FactionRecordDatabase $database)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'allow_details_view' => 'sometimes|boolean',
            'data_overview_display' => 'sometimes|required|string',
            'data_entry_display' => 'sometimes|required|string',
            'record_shortcode' => 'nullable|string|max:10',
            'database_structure' => 'sometimes|array',
            'detail_customization' => 'sometimes|nullable|array',
            'permissions' => 'nullable|array',
            'is_published' => 'sometimes|boolean',
        ]);

        if ($database->is_api_database) {
            // Restrictions for API-managed databases
            unset($validated['name']);
            unset($validated['description']);
            unset($validated['database_structure']);
        }

        $database->update($validated);

        return response()->json($database);
    }

    public function destroy(string $shortname, FactionRecordDatabase $database)
    {
        $database->delete();
        return response()->json(null, 204);
    }
}
