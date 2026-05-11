<?php

namespace App\Services;

use App\Models\StatisticsWidget;
use App\Models\Roster;
use App\Models\RosterContent;
use App\Models\RosterSection;
use App\Models\FactionRecordDatabase;
use App\Models\FactionRecordEntry;
use Illuminate\Support\Collection;

class StatisticsService
{
    public function calculate(StatisticsWidget $widget): array
    {
        $config = $widget->configuration;
        $intensive = false;
        $totalRowsProcessed = 0;

        $data = [];

        if ($widget->type === 'table') {
            $data = $this->calculateTable($widget, $config, $totalRowsProcessed);
        } elseif (isset($config['group_by']) && $config['group_by']['source_id']) {
            $data = $this->calculateGrouped($widget, $config, $totalRowsProcessed);
        } else {
            $data = $this->calculateSeries($widget, $config['series'] ?? [], $totalRowsProcessed);
        }

        if ($totalRowsProcessed > 1000) {
            $intensive = true;
        }

        return [
            'data' => $data,
            'is_intensive' => $intensive
        ];
    }

    protected function calculateSeries(StatisticsWidget $widget, array $series, &$totalRowsProcessed): array
    {
        $result = [];

        foreach ($series as $s) {
            if (empty($s['source_id'])) continue;
            
            $pool = $this->getSourcePool($s['source_type'], $s['source_id'], $totalRowsProcessed);
            
            // Handle Logic Groups
            if (isset($s['logic_groups']) && !empty($s['logic_groups'])) {
                $totalValue = 0;
                foreach ($s['logic_groups'] as $group) {
                    $groupPool = $this->applyConditions($pool, $group['conditions'] ?? [], $s['source_type'], $group['operator'] ?? 'AND');
                    $groupCount = $groupPool->count();
                    
                    $math = $group['math_operator'] ?? '+';
                    if ($math === '+') $totalValue += $groupCount;
                    else if ($math === '-') $totalValue -= $groupCount;
                }
                
                $result[] = [
                    'name' => $s['name'],
                    'value' => max(0, $totalValue),
                    'color' => $s['color'] ?? null
                ];
            } else {
                // Backward compatibility or simple series
                $filtered = $this->applyConditions($pool, $s['conditions'] ?? [], $s['source_type'], 'AND');
                $result[] = [
                    'name' => $s['name'],
                    'value' => $filtered->count(),
                    'color' => $s['color'] ?? null
                ];
            }
        }

        return $result;
    }

    protected function calculateGrouped(StatisticsWidget $widget, array $config, &$totalRowsProcessed): array
    {
        $groupBy = $config['group_by'];
        $pool = $this->getSourcePool($groupBy['source_type'], $groupBy['source_id'], $totalRowsProcessed);
        
        // Apply global filters if any
        if (isset($config['filters'])) {
            $pool = $this->applyConditions($pool, $config['filters'], $groupBy['source_type']);
        }

        $colKey = $groupBy['column'];
        $dataKey = $groupBy['source_type'] === 'roster' ? 'content' : 'data';

        $grouped = $pool->groupBy(function ($item) use ($dataKey, $colKey) {
            $val = $item->$dataKey[$colKey] ?? 'Unknown';
            return is_array($val) ? json_encode($val) : (string)$val;
        });

        $result = [];
        foreach ($grouped as $key => $items) {
            $result[] = [
                'name' => $key,
                'value' => $items->count()
            ];
        }

        return $result;
    }

    protected function calculateTable(StatisticsWidget $widget, array $config, &$totalRowsProcessed): array
    {
        // Table can be multiple series as columns
        $series = $config['series'] ?? [];
        return $this->calculateSeries($widget, $series, $totalRowsProcessed);
    }

    protected function getSourcePool(string $type, $id, &$totalRowsProcessed): Collection
    {
        if ($type === 'roster') {
            $roster = Roster::with('rootSections')->find($id);
            if (!$roster) return collect();

            $sectionIds = $this->getAllSectionIds($roster->rootSections);
            $contents = RosterContent::whereIn('section_id', $sectionIds)->get();
            $totalRowsProcessed += $contents->count();
            return $contents;
        } elseif ($type === 'database') {
            $db = FactionRecordDatabase::find($id);
            if (!$db) return collect();

            $entries = $db->entries()->where('is_active', true)->get();
            $totalRowsProcessed += $entries->count();
            return $entries;
        }

        return collect();
    }

    protected function getAllSectionIds($sections): array
    {
        $ids = [];
        foreach ($sections as $s) {
            $ids[] = $s->id;
            if ($s->children) {
                $ids = array_merge($ids, $this->getAllSectionIds($s->children));
            }
        }
        return $ids;
    }

    protected function applyConditions(Collection $pool, array $conditions, string $sourceType, string $operator = 'AND'): Collection
    {
        if (empty($conditions)) return $pool;

        $dataKey = $sourceType === 'roster' ? 'content' : 'data';

        if ($operator === 'OR') {
            return $pool->filter(function ($item) use ($conditions, $dataKey) {
                $data = $item->$dataKey ?? [];
                foreach ($conditions as $cond) {
                    if ($this->matchCondition($data, $cond)) return true;
                }
                return false;
            });
        }

        // Default AND
        return $pool->filter(function ($item) use ($conditions, $dataKey) {
            $data = $item->$dataKey ?? [];
            foreach ($conditions as $cond) {
                if (!$this->matchCondition($data, $cond)) return false;
            }
            return true;
        });
    }

    protected function matchCondition(array $data, array $cond): bool
    {
        $val = $data[$cond['target_col']] ?? null;
        $matchVal = $cond['match_value'] ?? null;
        $matchType = $cond['match_type'] ?? 'equals';

        switch ($matchType) {
            case 'exists':
                return !empty($val);
            case 'equals':
                return strtolower((string)$val) === strtolower((string)$matchVal);
            case 'not_equals':
                return strtolower((string)$val) !== strtolower((string)$matchVal);
            case 'contains':
                return str_contains(strtolower((string)$val), strtolower((string)$matchVal));
            case 'is_null':
                return empty($val);
            default:
                return false;
        }
    }
}
