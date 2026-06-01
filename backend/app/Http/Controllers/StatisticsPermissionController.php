<?php

namespace App\Http\Controllers;

use App\Models\StatisticsModel;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StatisticsPermissionController extends Controller
{
    public function index(StatisticsModel $model)
    {
        $faction = $model->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_statistics_moderation') && $model->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->audit('statistics_permission.index', "Viewed permissions for statistics model '{$model->name}'", $faction->id, $model);

        return response()->json($model->statisticsPermissions()->with(['group', 'role'])->get());
    }

    public function update(Request $request, StatisticsModel $model)
    {
        $faction = $model->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_statistics_moderation') && $model->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'nullable|exists:groups,id',
            'role_id' => 'nullable|exists:roles,id',
            'permissions' => 'required|array',
        ]);

        $existingPermission = $model->statisticsPermissions()
            ->where('group_id', $validated['group_id'] ?? null)
            ->where('role_id', $validated['role_id'] ?? null)
            ->first();
        $oldValues = $existingPermission ? $existingPermission->getOriginal() : null;

        $permission = $model->statisticsPermissions()->updateOrCreate(
            [
                'group_id' => $validated['group_id'],
                'role_id' => $validated['role_id'],
            ],
            ['permissions' => $validated['permissions']]
        );

        $this->audit(
            $existingPermission ? 'statistics_permission.update' : 'statistics_permission.create',
            $existingPermission ? "Updated permissions on statistics model '{$model->name}'" : "Created permissions on statistics model '{$model->name}'",
            $faction->id,
            $permission,
            $oldValues,
            $permission->getDirty()
        );

        return response()->json($permission->load(['group', 'role']));
    }

    public function destroy(StatisticsModel $model, $permissionId)
    {
        $faction = $model->faction;
        if (! User::hasFactionPermission(Auth::user(), $faction, 'global_statistics_moderation') && $model->created_by !== Auth::id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $permission = $model->statisticsPermissions()->findOrFail($permissionId);
        $this->audit('statistics_permission.delete', "Deleted permissions on statistics model '{$model->name}'", $faction->id, $permission, $permission->getAttributes());
        $permission->delete();

        return response()->json(['message' => 'Permission removed']);
    }
}
