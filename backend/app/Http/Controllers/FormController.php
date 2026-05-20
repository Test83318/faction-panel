<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\Form;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormController extends Controller
{
    public function index(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        $forms = Form::where('faction_id', $faction->id)
            ->with('creator:id,username')
            ->get();

        // Filter by 'view_form' permission
        $user = Auth::user();
        $forms = $forms->filter(function ($form) use ($user) {
            return User::hasFormPermission($user, $form, 'view_form');
        })->values();

        return response()->json($forms);
    }

    public function store(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!User::hasFactionPermission(Auth::user(), $faction, 'create_faction_forms')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:standard,quiz',
            'description' => 'nullable|string',
            'is_public' => 'boolean',
            'requires_gtaw_login' => 'boolean',
            'cooldown_seconds' => 'integer',
            'cooldown_only_on_fail' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        $form = $faction->forms()->create([
            ...$validated,
            'created_by' => Auth::id(),
            'is_enabled' => true,
        ]);

        // Create default status "Submitted"
        $form->statuses()->create([
            'name' => 'Submitted',
            'order' => 0,
            'is_hidden' => false,
            'is_locked' => false,
            'is_closed' => false,
            'is_failed' => false,
            'is_passed' => false,
            'is_archived' => false,
        ]);

        return response()->json($form->load('statuses'), 201);
    }

    public function show(string $shortname, Form $form)
    {
        if (!User::hasFormPermission(Auth::user(), $form, 'view_form')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($form->load(['creator:id,username', 'statuses', 'stages.sections.fields']));
    }

    public function update(Request $request, string $shortname, Form $form)
    {
        if (!User::hasFormPermission(Auth::user(), $form, 'form_editor')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_public' => 'sometimes|boolean',
            'requires_gtaw_login' => 'sometimes|boolean',
            'cooldown_seconds' => 'sometimes|integer',
            'cooldown_only_on_fail' => 'sometimes|boolean',
            'is_enabled' => 'sometimes|boolean',
            'metadata' => 'nullable|array',
        ]);

        $form->update($validated);

        return response()->json($form);
    }

    public function destroy(string $shortname, Form $form)
    {
        if (!User::hasFactionPermission(Auth::user(), $form->faction, 'global_faction_form_moderation') && $form->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $form->delete();
        return response()->json(null, 204);
    }
}
