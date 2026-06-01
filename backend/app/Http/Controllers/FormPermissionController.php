<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormPermissionController extends Controller
{
    public function index(string $shortname, Form $form)
    {
        $faction = $form->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_faction_form_moderation') && $form->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('form.permission.index', "Viewed permissions for form '{$form->name}'", null, $form);

        return response()->json($form->formPermissions()->with(['group', 'role'])->get());
    }

    public function update(Request $request, string $shortname, Form $form)
    {
        $faction = $form->faction;
        if (! User::hasFormPermission(Auth::user(), $form, 'modify_form_permissions')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'nullable|exists:groups,id',
            'role_id' => 'nullable|exists:roles,id',
            'permissions' => 'required|array',
        ]);

        $existingPermission = $form->formPermissions()->where([
            'group_id' => $validated['group_id'],
            'role_id' => $validated['role_id'],
        ])->first();
        $oldValues = $existingPermission ? $existingPermission->getOriginal() : null;

        $formPermission = $form->formPermissions()->updateOrCreate(
            [
                'group_id' => $validated['group_id'],
                'role_id' => $validated['role_id'],
            ],
            ['permissions' => $validated['permissions']]
        );

        $formPermission->load(['group', 'role']);
        $targetName = $formPermission->group ? "group '{$formPermission->group->name}'" : ($formPermission->role ? "role '{$formPermission->role->name}'" : 'all');
        $this->audit('form.permission.update', "Updated form permissions for {$targetName} in form '{$form->name}'", null, $formPermission, $oldValues, $formPermission->getDirty());

        return response()->json($formPermission);
    }

    public function destroy(string $shortname, Form $form, $permissionId)
    {
        if (! User::hasFormPermission(Auth::user(), $form, 'modify_form_permissions')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $permission = $form->formPermissions()->findOrFail($permissionId);
        $permission->load(['group', 'role']);
        $targetName = $permission->group ? "group '{$permission->group->name}'" : ($permission->role ? "role '{$permission->role->name}'" : 'all');

        $this->audit('form.permission.delete', "Deleted form permissions for {$targetName} in form '{$form->name}'", null, $permission, $permission->getAttributes());

        $permission->delete();

        return response()->json(['message' => 'Permission removed']);
    }
}
