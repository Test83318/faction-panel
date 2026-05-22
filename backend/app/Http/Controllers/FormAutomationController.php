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

        return response()->json(
            $form->automations()->orderBy('order')->with(['triggerStatus', 'actionStatus'])->get()
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
            'trigger' => 'required|in:on_submit,on_status_change',
            'trigger_status_id' => 'nullable|exists:form_statuses,id',
            'condition_logic' => 'in:all,any',
            'conditions' => 'nullable|array',
            'conditions.*.field_id' => 'required|integer',
            'conditions.*.operator' => 'required|in:equals,not_equals,contains,gt,lt,gte,lte,is_empty,is_not_empty',
            'conditions.*.value' => 'nullable|string',
            'action' => 'required|in:set_status,add_comment',
            'action_status_id' => 'nullable|exists:form_statuses,id',
            'action_comment' => 'nullable|string',
            'action_comment_internal' => 'boolean',
            'is_enabled' => 'boolean',
        ]);

        $automation = $form->automations()->create([
            ...$validated,
            'order' => $form->automations()->count(),
        ]);

        return response()->json($automation->load(['triggerStatus', 'actionStatus']), 201);
    }

    public function update(Request $request, string $shortname, Form $form, FormAutomation $automation)
    {
        $user = Auth::user();
        if (! User::hasFormPermission($user, $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'trigger' => 'in:on_submit,on_status_change',
            'trigger_status_id' => 'nullable|exists:form_statuses,id',
            'condition_logic' => 'in:all,any',
            'conditions' => 'nullable|array',
            'conditions.*.field_id' => 'required|integer',
            'conditions.*.operator' => 'required|in:equals,not_equals,contains,gt,lt,gte,lte,is_empty,is_not_empty',
            'conditions.*.value' => 'nullable|string',
            'action' => 'in:set_status,add_comment',
            'action_status_id' => 'nullable|exists:form_statuses,id',
            'action_comment' => 'nullable|string',
            'action_comment_internal' => 'boolean',
            'is_enabled' => 'boolean',
        ]);

        $automation->update($validated);

        return response()->json($automation->load(['triggerStatus', 'actionStatus']));
    }

    public function destroy(string $shortname, Form $form, FormAutomation $automation)
    {
        $user = Auth::user();
        if (! User::hasFormPermission($user, $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $automation->delete();

        return response()->json(['message' => 'Automation deleted']);
    }
}
