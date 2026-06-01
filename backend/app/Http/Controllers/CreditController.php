<?php

namespace App\Http\Controllers;

use App\Models\Credit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CreditController extends Controller
{
    public function index()
    {
        $this->audit('credit.index', 'Viewed credits');

        return response()->json(Credit::orderBy('order')->get());
    }

    public function store(Request $request)
    {
        if (! Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'integer',
        ]);

        $credit = Credit::create($validated);

        $this->audit('credit.create', "Created credit for '{$credit->name}' as '{$credit->role}'", null, $credit);

        return response()->json($credit, 201);
    }

    public function update(Request $request, Credit $credit)
    {
        if (! Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'integer',
        ]);

        $oldValues = $credit->getOriginal();
        $credit->update($validated);

        $this->audit('credit.update', "Updated credit for '{$credit->name}'", null, $credit, $oldValues, $credit->getDirty());

        return response()->json($credit);
    }

    public function destroy(Credit $credit)
    {
        if (! Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('credit.delete', "Deleted credit for '{$credit->name}'", null, $credit, $credit->getAttributes());

        $credit->delete();

        return response()->json(['message' => 'Credit deleted']);
    }

    public function reorder(Request $request)
    {
        if (! Auth::user()->is_superadmin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:credits,id',
        ]);

        foreach ($request->ids as $index => $id) {
            Credit::where('id', $id)->update(['order' => $index]);
        }

        $this->audit('credit.reorder', 'Reordered credits');

        return response()->json(['message' => 'Order updated']);
    }
}
