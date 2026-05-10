<?php

namespace App\Http\Controllers;

use App\Models\Credit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CreditController extends Controller
{
    public function index()
    {
        return response()->json(Credit::orderBy('order')->get());
    }

    public function store(Request $request)
    {
        if (!Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'integer'
        ]);

        $credit = Credit::create($validated);

        return response()->json($credit, 201);
    }

    public function update(Request $request, Credit $credit)
    {
        if (!Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'integer'
        ]);

        $credit->update($validated);

        return response()->json($credit);
    }

    public function destroy(Credit $credit)
    {
        if (!Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $credit->delete();

        return response()->json(['message' => 'Credit deleted']);
    }

    public function reorder(Request $request)
    {
        if (!Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:credits,id'
        ]);

        foreach ($request->ids as $index => $id) {
            Credit::where('id', $id)->update(['order' => $index]);
        }

        return response()->json(['message' => 'Order updated']);
    }
}
