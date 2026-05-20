<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormStatusController extends Controller
{
    public function store(Request $request, string $shortname, Form $form)
    {
        if (!User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'form_stage_id' => 'nullable|exists:form_stages,id',
            'is_hidden' => 'boolean',
            'is_locked' => 'boolean',
            'is_closed' => 'boolean',
            'is_failed' => 'boolean',
            'is_passed' => 'boolean',
            'is_archived' => 'boolean',
        ]);

        $maxOrder = $form->statuses()->max('order') ?? -1;

        $status = $form->statuses()->create([
            ...$validated,
            'order' => $maxOrder + 1,
        ]);

        return response()->json($status, 201);
    }

    public function update(Request $request, string $shortname, Form $form, FormStatus $status)
    {
        if (!User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'form_stage_id' => 'sometimes|nullable|exists:form_stages,id',
            'is_hidden' => 'sometimes|boolean',
            'is_locked' => 'sometimes|boolean',
            'is_closed' => 'sometimes|boolean',
            'is_failed' => 'sometimes|boolean',
            'is_passed' => 'sometimes|boolean',
            'is_archived' => 'sometimes|boolean',
        ]);

        if ($status->name === 'Submitted' && isset($validated['name']) && $validated['name'] !== 'Submitted') {
            return response()->json(['message' => 'The default "Submitted" status name cannot be changed.'], 422);
        }

        $status->update($validated);

        return response()->json($status);
    }

    public function destroy(string $shortname, Form $form, FormStatus $status)
    {
        if (!User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($status->name === 'Submitted') {
            return response()->json(['message' => 'The default "Submitted" status cannot be deleted.'], 422);
        }

        $status->delete();

        return response()->json(null, 204);
    }

    public function reorder(Request $request, string $shortname, Form $form)
    {
        if (!User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status_ids' => 'required|array',
            'status_ids.*' => 'exists:form_statuses,id',
        ]);

        foreach ($request->status_ids as $index => $id) {
            FormStatus::where('id', $id)
                ->where('form_id', $form->id)
                ->update(['order' => $index]);
        }

        return response()->json(['message' => 'Order updated']);
    }
}
