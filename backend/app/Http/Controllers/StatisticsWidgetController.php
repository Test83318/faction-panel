<?php

namespace App\Http\Controllers;

use App\Models\StatisticsModel;
use App\Models\StatisticsWidget;
use App\Models\User;
use App\Services\StatisticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StatisticsWidgetController extends Controller
{
    protected $statisticsService;

    public function __construct(StatisticsService $statisticsService)
    {
        $this->statisticsService = $statisticsService;
    }

    public function store(Request $request, StatisticsModel $model)
    {
        $faction = $model->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_statistics_moderation') && 
            $model->created_by !== Auth::id()
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => ['required', Rule::in(['pie', 'bar', 'line', 'table'])],
            'configuration' => 'required|array',
            'width' => 'integer|min:1|max:12',
            'order' => 'integer',
        ]);

        $widget = $model->widgets()->create($validated);

        // Initial calculation
        $result = $this->statisticsService->calculate($widget);
        $widget->update([
            'cache_result' => $result['data'],
            'is_intensive' => $result['is_intensive'],
            'last_calculated_at' => now(),
        ]);

        return response()->json($widget, 201);
    }

    public function update(Request $request, StatisticsWidget $widget)
    {
        $model = $widget->statisticsModel;
        $faction = $model->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_statistics_moderation') && 
            $model->created_by !== Auth::id()
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => ['sometimes', Rule::in(['pie', 'bar', 'line', 'table'])],
            'configuration' => 'sometimes|array',
            'width' => 'sometimes|integer|min:1|max:12',
            'order' => 'sometimes|integer',
        ]);

        $widget->update($validated);

        // Recalculate
        $result = $this->statisticsService->calculate($widget);
        $widget->update([
            'cache_result' => $result['data'],
            'is_intensive' => $result['is_intensive'],
            'last_calculated_at' => now(),
        ]);

        return response()->json($widget);
    }

    public function destroy(StatisticsWidget $widget)
    {
        $model = $widget->statisticsModel;
        $faction = $model->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_statistics_moderation') && 
            $model->created_by !== Auth::id()
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $widget->delete();

        return response()->json(['message' => 'Widget deleted']);
    }

    public function recalculate(StatisticsWidget $widget)
    {
        $model = $widget->statisticsModel;
        $faction = $model->faction;
        $user = Auth::user();

        if (!$user->is_superadmin && 
            $faction->faction_leader !== $user->id && 
            !User::hasFactionPermission($user, $faction, 'global_statistics_moderation') &&
            !User::hasStatisticsPermission($user, $model, 'view_statistics')
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $result = $this->statisticsService->calculate($widget);
        $widget->update([
            'cache_result' => $result['data'],
            'is_intensive' => $result['is_intensive'],
            'last_calculated_at' => now(),
        ]);

        return response()->json($widget);
    }

    public function reorder(Request $request, StatisticsModel $model)
    {
        $faction = $model->faction;
        if (!User::hasFactionPermission(Auth::user(), $faction, 'global_statistics_moderation') && 
            $model->created_by !== Auth::id()
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'widget_ids' => 'required|array',
            'widget_ids.*' => 'exists:statistics_widgets,id'
        ]);

        foreach ($validated['widget_ids'] as $index => $id) {
            StatisticsWidget::where('id', $id)->where('statistics_model_id', $model->id)->update(['order' => $index]);
        }

        return response()->json(['message' => 'Order updated']);
    }
}
