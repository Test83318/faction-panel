<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormSection;
use App\Models\FormStage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormSectionController extends Controller
{
    public function store(Request $request, string $shortname, Form $form, FormStage $stage)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $maxOrder = $stage->sections()->max('order') ?? -1;

        $section = $stage->sections()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'order' => $maxOrder + 1,
        ]);

        $this->audit('form.section.create', "Created section '{$section->name}' in stage '{$stage->name}' of form '{$form->name}'", null, $section);

        return response()->json($section, 201);
    }

    public function update(Request $request, string $shortname, Form $form, FormSection $section)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $oldValues = $section->getOriginal();
        $section->update($validated);

        $this->audit('form.section.update', "Updated section '{$section->name}' of form '{$form->name}'", null, $section, $oldValues, $section->getDirty());

        return response()->json($section);
    }

    public function destroy(string $shortname, Form $form, FormSection $section)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('form.section.delete', "Deleted section '{$section->name}' of form '{$form->name}'", null, $section, $section->getAttributes());

        $section->delete();

        return response()->json(null, 204);
    }

    public function reorder(Request $request, string $shortname, Form $form, FormStage $stage)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'section_ids' => 'required|array',
            'section_ids.*' => 'exists:form_sections,id',
        ]);

        foreach ($request->section_ids as $index => $id) {
            FormSection::where('id', $id)
                ->where('form_stage_id', $stage->id)
                ->update(['order' => $index]);
        }

        $this->audit('form.section.reorder', "Reordered sections in stage '{$stage->name}' of form '{$form->name}'", null, $stage);

        return response()->json(['message' => 'Order updated']);
    }

    public function move(Request $request, string $shortname, Form $form, FormSection $section)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'form_stage_id' => 'required|exists:form_stages,id',
        ]);

        // Ensure the stage belongs to the same form
        $targetStage = FormStage::where('id', $validated['form_stage_id'])->where('form_id', $form->id)->firstOrFail();

        $maxOrder = $targetStage->sections()->max('order') ?? -1;
        $oldValues = $section->getOriginal();
        $section->update([
            'form_stage_id' => $targetStage->id,
            'order' => $maxOrder + 1,
        ]);

        $this->audit('form.section.move', "Moved section '{$section->name}' to stage '{$targetStage->name}' in form '{$form->name}'", null, $section, $oldValues, $section->getDirty());

        return response()->json($section);
    }
}
