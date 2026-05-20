<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormPermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormPermissionController extends Controller
{
    public function index(string $shortname, Form $form)
    {
        $faction = $form->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_faction_form_moderation') && $form->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($form->formPermissions()->with(['group', 'role'])->get());
    }

    public function update(Request $request, string $shortname, Form $form)
    {
        $faction = $form->faction;
        if (!User::hasFormPermission(Auth::user(), $form, 'modify_form_permissions')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'nullable|exists:groups,id',
            'role_id' => 'nullable|exists:roles,id',
            'permissions' => 'required|array',
        ]);

        $formPermission = $form->formPermissions()->updateOrCreate(
            [
                'group_id' => $validated['group_id'],
                'role_id' => $validated['role_id']
            ],
            ['permissions' => $validated['permissions']]
        );

        return response()->json($formPermission->load(['group', 'role']));
    }

    public function destroy(string $shortname, Form $form, $permissionId)
    {
        if (!User::hasFormPermission(Auth::user(), $form, 'modify_form_permissions')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $permission = $form->formPermissions()->findOrFail($permissionId);
        $permission->delete();

        return response()->json(['message' => 'Permission removed']);
    }
}
