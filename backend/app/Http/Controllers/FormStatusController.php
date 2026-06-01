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
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'stage_ids' => 'nullable|array',
            'stage_ids.*' => 'exists:form_stages,id',
            'is_hidden' => 'boolean',
            'is_locked' => 'boolean',
            'is_closed' => 'boolean',
            'is_failed' => 'boolean',
            'is_passed' => 'boolean',
            'is_archived' => 'boolean',
        ]);

        $maxOrder = $form->statuses()->max('order') ?? -1;

        $status = $form->statuses()->create([
            'name' => $validated['name'],
            'is_hidden' => $validated['is_hidden'] ?? false,
            'is_locked' => $validated['is_locked'] ?? false,
            'is_closed' => $validated['is_closed'] ?? false,
            'is_failed' => $validated['is_failed'] ?? false,
            'is_passed' => $validated['is_passed'] ?? false,
            'is_archived' => $validated['is_archived'] ?? false,
            'order' => $maxOrder + 1,
        ]);

        if (isset($validated['stage_ids'])) {
            $status->stages()->sync($validated['stage_ids']);
        }

        $this->audit('form.status.create', "Created status '{$status->name}' in form '{$form->name}'", null, $status);

        return response()->json($status->load('stages'), 201);
    }

    public function update(Request $request, string $shortname, Form $form, FormStatus $status)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'stage_ids' => 'nullable|array',
            'stage_ids.*' => 'exists:form_stages,id',
            'is_hidden' => 'sometimes|boolean',
            'is_locked' => 'sometimes|boolean',
            'is_closed' => 'sometimes|boolean',
            'is_failed' => 'sometimes|boolean',
            'is_passed' => 'sometimes|boolean',
            'is_archived' => 'sometimes|boolean',
        ]);

        $isSubmitted = $status->system_key === 'submitted';
        $isPending = $status->system_key === 'pending';

        if ($isPending) {
            $flagKeys = ['is_hidden', 'is_locked', 'is_closed', 'is_failed', 'is_passed', 'is_archived', 'stage_ids'];
            foreach ($flagKeys as $key) {
                if (array_key_exists($key, $validated)) {
                    $currentVal = ($key === 'stage_ids') ? $status->stage_ids : $status->$key;
                    if ($key === 'stage_ids') {
                        $newStages = $validated['stage_ids'] ?? [];
                        if (array_diff($currentVal, $newStages) || array_diff($newStages, $currentVal)) {
                            return response()->json(['message' => 'System status flags and bindings cannot be modified.'], 422);
                        }
                    } else {
                        if ((bool) $validated[$key] !== (bool) $currentVal) {
                            return response()->json(['message' => 'System status flags and bindings cannot be modified.'], 422);
                        }
                    }
                }
            }
        }

        $oldValues = $status->getOriginal();
        $status->update(collect($validated)->except('stage_ids')->toArray());

        if (array_key_exists('stage_ids', $validated) && ! $isPending) {
            $status->stages()->sync($validated['stage_ids'] ?? []);
        }

        $this->audit('form.status.update', "Updated status '{$status->name}' in form '{$form->name}'", null, $status, $oldValues, $status->getDirty());

        return response()->json($status->load('stages'));
    }

    public function destroy(string $shortname, Form $form, FormStatus $status)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($status->system_key === 'submitted' || $status->name === 'Submitted' || $status->system_key === 'pending') {
            return response()->json(['message' => 'System statuses cannot be deleted.'], 422);
        }

        $this->audit('form.status.delete', "Deleted status '{$status->name}' of form '{$form->name}'", null, $status, $status->getAttributes());

        $status->delete();

        return response()->json(null, 204);
    }

    public function reorder(Request $request, string $shortname, Form $form)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
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

        $this->audit('form.status.reorder', "Reordered statuses of form '{$form->name}'", null, $form);

        return response()->json(['message' => 'Order updated']);
    }
}
