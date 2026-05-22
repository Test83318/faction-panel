<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormField;
use App\Models\FormSection;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormFieldController extends Controller
{
    public function store(Request $request, string $shortname, Form $form, FormSection $section)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'type' => 'required|string',
            'label' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'options' => 'nullable|array',
            'validation_rules' => 'nullable|array',
            'points' => 'integer',
            'is_required' => 'boolean',
            'has_grading' => 'boolean',
            'is_automatic_scored' => 'boolean',
            'prefill_type' => 'nullable|string',
            'description' => 'nullable|string',
            'default_value' => 'nullable|string',
            'is_disabled' => 'boolean',
            'placeholder' => 'nullable|string',
            'is_multi' => 'boolean',
            'width' => 'integer|min:1|max:12',
        ]);

        $maxOrder = $section->fields()->max('order') ?? -1;

        $field = $section->fields()->create([
            ...$validated,
            'order' => $maxOrder + 1,
        ]);

        return response()->json($field, 201);
    }

    public function update(Request $request, string $shortname, Form $form, FormField $field)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'type' => 'sometimes|required|string',
            'label' => 'sometimes|required|string|max:255',
            'name' => 'sometimes|required|string|max:255',
            'options' => 'nullable|array',
            'validation_rules' => 'nullable|array',
            'points' => 'sometimes|integer',
            'is_required' => 'sometimes|boolean',
            'has_grading' => 'sometimes|boolean',
            'is_automatic_scored' => 'sometimes|boolean',
            'prefill_type' => 'nullable|string',
            'description' => 'nullable|string',
            'default_value' => 'nullable|string',
            'is_disabled' => 'sometimes|boolean',
            'placeholder' => 'nullable|string',
            'is_multi' => 'sometimes|boolean',
            'width' => 'sometimes|integer|min:1|max:12',
        ]);

        $field->update($validated);

        return response()->json($field);
    }

    public function destroy(string $shortname, Form $form, FormField $field)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $field->delete();

        return response()->json(null, 204);
    }

    public function reorder(Request $request, string $shortname, Form $form, FormSection $section)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'field_ids' => 'required|array',
            'field_ids.*' => 'exists:form_fields,id',
        ]);

        foreach ($request->field_ids as $index => $id) {
            FormField::where('id', $id)
                ->where('form_section_id', $section->id)
                ->update(['order' => $index]);
        }

        return response()->json(['message' => 'Order updated']);
    }

    public function move(Request $request, string $shortname, Form $form, FormField $field)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'form_section_id' => 'required|exists:form_sections,id',
        ]);

        // Ensure the section belongs to the same form (via stage)
        $targetSection = FormSection::where('id', $validated['form_section_id'])->firstOrFail();
        if ($targetSection->stage->form_id !== $form->id) {
            return response()->json(['message' => 'Invalid section'], 422);
        }

        $maxOrder = $targetSection->fields()->max('order') ?? -1;
        $field->update([
            'form_section_id' => $targetSection->id,
            'order' => $maxOrder + 1,
        ]);

        return response()->json($field);
    }
}
