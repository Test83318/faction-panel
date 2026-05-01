<?php

namespace App\Http\Controllers;

use App\Models\FactionRecordDatabase;
use App\Models\FactionRecordEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FactionRecordEntryController extends Controller
{
    public function index(string $shortname, FactionRecordDatabase $database)
    {
        if (!User::hasRecordPermission(Auth::user(), $database, 'view_database')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $entries = $database->entries()
            ->with('creator:id,username')
            ->orderBy('entry_id', 'desc')
            ->get();

        return response()->json($entries);
    }

    public function store(Request $request, string $shortname, FactionRecordDatabase $database)
    {
        if (!User::hasRecordPermission(Auth::user(), $database, 'make_entries')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($database->is_api_database) {
            return response()->json(['message' => 'Cannot manually create entries in an API database'], 403);
        }

        $validated = $request->validate([
            'data' => 'required|array',
            'is_active' => 'sometimes|boolean',
        ]);

        // Basic validation against structure
        $structure = $database->database_structure;
        foreach ($structure as $field) {
            if (($field['required'] ?? false) && (!isset($validated['data'][$field['name']]) || $validated['data'][$field['name']] === '')) {
                return response()->json([
                    'message' => "The {$field['name']} field is required.",
                    'errors' => [$field['name'] => ["The {$field['name']} field is required."]]
                ], 422);
            }
        }

        // Atomic increment for entry_id
        $nextEntryId = ($database->entries()->withTrashed()->max('entry_id') ?? 0) + 1;

        $entry = $database->entries()->create([
            'entry_id' => $nextEntryId,
            'data' => $validated['data'],
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => Auth::id(),
        ]);

        return response()->json($entry->load('creator:id,username'), 201);
    }

    public function show(string $shortname, FactionRecordDatabase $database, FactionRecordEntry $entry)
    {
        if (!User::hasRecordPermission(Auth::user(), $database, 'view_database')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($entry->database_id !== $database->id) {
            return response()->json(['message' => 'Entry does not belong to this database'], 404);
        }

        return response()->json($entry->load('creator:id,username'));
    }

    public function update(Request $request, string $shortname, FactionRecordDatabase $database, FactionRecordEntry $entry)
    {
        if (!User::hasRecordPermission(Auth::user(), $database, 'modify_entries')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($entry->database_id !== $database->id) {
            return response()->json(['message' => 'Entry does not belong to this database'], 404);
        }

        if ($database->is_api_database) {
            return response()->json(['message' => 'Cannot manually modify entries in an API database'], 403);
        }

        $validated = $request->validate([
            'data' => 'sometimes|required|array',
            'is_active' => 'sometimes|boolean',
        ]);

        // Basic validation against structure
        if (isset($validated['data'])) {
            $structure = $database->database_structure;
            foreach ($structure as $field) {
                if (($field['required'] ?? false) && (!isset($validated['data'][$field['name']]) || $validated['data'][$field['name']] === '')) {
                    return response()->json([
                        'message' => "The {$field['name']} field is required.",
                        'errors' => [$field['name'] => ["The {$field['name']} field is required."]]
                    ], 422);
                }
            }
        }

        $entry->update($validated);

        return response()->json($entry->load('creator:id,username'));
    }

    public function destroy(string $shortname, FactionRecordDatabase $database, FactionRecordEntry $entry)
    {
        if (!User::hasRecordPermission(Auth::user(), $database, 'delete_entries')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($entry->database_id !== $database->id) {
            return response()->json(['message' => 'Entry does not belong to this database'], 404);
        }

        $entry->delete();

        return response()->json(null, 204);
    }
}
