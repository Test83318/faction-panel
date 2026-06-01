<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormAutomation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormAutomationController extends Controller
{
    public function index(string $shortname, Form $form)
    {
        $user = Auth::user();
        if (! User::hasFormPermission($user, $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('form.automation.index', "Viewed automations for form '{$form->name}'", null, $form);

        return response()->json(
            $form->automations()->orderBy('order')->with(['triggerStatus', 'triggerStage', 'actionStatus', 'actionGroup'])->get()
        );
    }

    public function store(Request $request, string $shortname, Form $form)
    {
        $user = Auth::user();
        if (! User::hasFormPermission($user, $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'trigger' => 'required|in:on_stage_submit,on_final_submit,on_status_change',
            'trigger_status_id' => 'nullable|exists:form_statuses,id',
            'trigger_stage_id' => 'nullable|exists:form_stages,id',
            'condition_logic' => 'in:all,any',
            'conditions' => 'nullable|array',
            'conditions.*.type' => 'nullable|string|in:field,field_points,field_correctness,points,status',
            'conditions.*.field_id' => 'nullable|integer',
            'conditions.*.operator' => 'required|in:equals,not_equals,contains,gt,lt,gte,lte,is_empty,is_not_empty',
            'conditions.*.value' => 'nullable|string',
            'action' => 'required|in:set_status,add_comment,give_group,continue_to_next_stage',
            'action_status_id' => 'nullable|exists:form_statuses,id',
            'action_comment' => 'nullable|string',
            'action_comment_internal' => 'boolean',
            'action_group_id' => 'nullable|exists:groups,id',
            'is_enabled' => 'boolean',
        ]);

        $automation = $form->automations()->create([
            ...$validated,
            'order' => $form->automations()->count(),
        ]);

        $this->audit('form.automation.create', "Created automation '".($automation->name ?? 'Unnamed Automation')."' for form '{$form->name}'", null, $automation);

        return response()->json($automation->load(['triggerStatus', 'triggerStage', 'actionStatus', 'actionGroup']), 201);
    }

    public function update(Request $request, string $shortname, Form $form, FormAutomation $automation)
    {
        $user = Auth::user();
        if (! User::hasFormPermission($user, $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'trigger' => 'in:on_stage_submit,on_final_submit,on_status_change',
            'trigger_status_id' => 'nullable|exists:form_statuses,id',
            'trigger_stage_id' => 'nullable|exists:form_stages,id',
            'condition_logic' => 'in:all,any',
            'conditions' => 'nullable|array',
            'conditions.*.type' => 'nullable|string|in:field,field_points,field_correctness,points,status',
            'conditions.*.field_id' => 'nullable|integer',
            'conditions.*.operator' => 'required|in:equals,not_equals,contains,gt,lt,gte,lte,is_empty,is_not_empty',
            'conditions.*.value' => 'nullable|string',
            'action' => 'in:set_status,add_comment,give_group,continue_to_next_stage',
            'action_status_id' => 'nullable|exists:form_statuses,id',
            'action_comment' => 'nullable|string',
            'action_comment_internal' => 'boolean',
            'action_group_id' => 'nullable|exists:groups,id',
            'is_enabled' => 'boolean',
        ]);

        $oldValues = $automation->getOriginal();
        $automation->update($validated);

        $this->audit('form.automation.update', "Updated automation '".($automation->name ?? 'Unnamed Automation')."' for form '{$form->name}'", null, $automation, $oldValues, $automation->getDirty());

        return response()->json($automation->load(['triggerStatus', 'triggerStage', 'actionStatus', 'actionGroup']));
    }

    public function destroy(string $shortname, Form $form, FormAutomation $automation)
    {
        $user = Auth::user();
        if (! User::hasFormPermission($user, $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('form.automation.delete', "Deleted automation '".($automation->name ?? 'Unnamed Automation')."' from form '{$form->name}'", null, $automation, $automation->getAttributes());

        $automation->delete();

        return response()->json(['message' => 'Automation deleted']);
    }
}
