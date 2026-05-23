<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormStage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormStageController extends Controller
{
    public function store(Request $request, string $shortname, Form $form)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'submit_status_id' => 'nullable|exists:form_statuses,id',
            'required_points' => 'nullable|integer|min:0',
        ]);

        $maxOrder = $form->stages()->max('order') ?? -1;

        $stage = $form->stages()->create([
            'name' => $validated['name'],
            'submit_status_id' => $validated['submit_status_id'] ?? null,
            'required_points' => $validated['required_points'] ?? 0,
            'order' => $maxOrder + 1,
        ]);

        return response()->json($stage, 201);
    }

    public function update(Request $request, string $shortname, Form $form, FormStage $stage)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'submit_status_id' => 'sometimes|nullable|exists:form_statuses,id',
            'required_points' => 'sometimes|integer|min:0',
        ]);

        $stage->update($validated);

        return response()->json($stage);
    }

    public function destroy(string $shortname, Form $form, FormStage $stage)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Optional: Check if it's the only stage if we want to enforce at least one

        $stage->delete();

        return response()->json(null, 204);
    }

    public function reorder(Request $request, string $shortname, Form $form)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'stage_ids' => 'required|array',
            'stage_ids.*' => 'exists:form_stages,id',
        ]);

        foreach ($request->stage_ids as $index => $id) {
            FormStage::where('id', $id)
                ->where('form_id', $form->id)
                ->update(['order' => $index]);
        }

        return response()->json(['message' => 'Order updated']);
    }
}
