<?php

namespace App\Http\Controllers;

use App\Models\ChangelogEntry;
use Illuminate\Http\Request;

class ChangelogController extends Controller
{
    public function index()
    {
        return response()->json(
            ChangelogEntry::orderBy('order', 'asc')->orderBy('released_at', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'version' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'released_at' => 'required|date',
            'order' => 'sometimes|integer|min:0',
        ]);

        $entry = ChangelogEntry::create($data);
        return response()->json($entry, 201);
    }

    public function update(Request $request, ChangelogEntry $entry)
    {
        $data = $request->validate([
            'version' => 'sometimes|string|max:50',
            'title' => 'sometimes|string|max:255',
            'body' => 'sometimes|string',
            'released_at' => 'sometimes|date',
            'order' => 'sometimes|integer|min:0',
        ]);

        $entry->update($data);
        return response()->json($entry->fresh());
    }

    public function destroy(ChangelogEntry $entry)
    {
        $entry->delete();
        return response()->json(null, 204);
    }
}
