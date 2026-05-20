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
            if (empty($s['source_id']) && $s['source_type'] !== 'count') continue;
            
            // Handle Count source type separately as it's not a pool of rows
            if ($s['source_type'] === 'count') {
                $val = $this->evaluateCount($s['count_config'] ?? [], $s['count_parent_type'] ?? 'roster', $s['count_parent_id'] ?? null, $totalRowsProcessed);
                $result[] = [
                    'name' => $s['name'],
                    'value' => $val,
                    'color' => $s['color'] ?? null
                ];
                continue;
            }

            $pool = $this->getSourcePool($s['source_type'], $s['source_id'], $totalRowsProcessed, $s);
            
            // Handle Logic Groups
            if (isset($s['logic_groups']) && !empty($s['logic_groups'])) {
                $totalValue = 0;
                foreach ($s['logic_groups'] as $group) {
                    $groupPool = $this->applyConditions($pool, $group['conditions'] ?? [], $s['source_type'], $group['operator'] ?? 'AND');
                    
                    $operation = $group['operation'] ?? 'count';
                    $targetCol = $group['target_col'] ?? null;
                    
                    $groupValue = $this->aggregatePool($groupPool, $operation, $targetCol, $s['source_type']);
                    
                    $math = $group['math_operator'] ?? '+';
                    if ($math === '+') $totalValue += $groupValue;
                    else if ($math === '-') $totalValue -= $groupValue;
                    else if ($math === '*') $totalValue *= $groupValue;
                    else if ($math === '/' && $groupValue != 0) $totalValue /= $groupValue;
                }
                
                $result[] = [
                    'name' => $s['name'],
                    'value' => $totalValue,
                    'color' => $s['color'] ?? null
                ];
            } else {
                // Simple series
                $filtered = $this->applyConditions($pool, $s['conditions'] ?? [], $s['source_type'], 'AND');
                
                $operation = $s['operation'] ?? 'count';
                $targetCol = $s['target_col'] ?? null;
                
                $result[] = [
                    'name' => $s['name'],
                    'value' => $this->aggregatePool($filtered, $operation, $targetCol, $s['source_type']),
                    'color' => $s['color'] ?? null
                ];
            }
        }

        return $result;
    }

    protected function aggregatePool(Collection $pool, string $operation, $targetCol, string $sourceType)
    {
        if ($operation === 'count' || !$targetCol) {
            return $pool->count();
        }

        $dataKey = $sourceType === 'database' ? 'data' : 'content';

        $values = $pool->map(function($item) use ($dataKey, $targetCol) {
            $data = $item->$dataKey ?? [];
            $val = $data[$targetCol] ?? 0;
            return is_numeric($val) ? (float)$val : 0;
        });

        switch ($operation) {
            case 'sum':
                return $values->sum();
            case 'avg':
                return $values->count() > 0 ? round($values->average(), 2) : 0;
            case 'min':
                return $values->count() > 0 ? $values->min() : 0;
            case 'max':
                return $values->count() > 0 ? $values->max() : 0;
            default:
                return $pool->count();
        }
    }

    protected function calculateGrouped(StatisticsWidget $widget, array $config, &$totalRowsProcessed): array
    {
        $groupBy = $config['group_by'];
        $pool = $this->getSourcePool($groupBy['source_type'], $groupBy['source_id'], $totalRowsProcessed, $config);
        
        // Apply global filters if any
        if (isset($config['filters'])) {
            $pool = $this->applyConditions($pool, $config['filters'], $groupBy['source_type']);
        }

        $colKey = $groupBy['column'];
        $dataKey = $groupBy['source_type'] === 'database' ? 'data' : 'content';

        $grouped = $pool->groupBy(function ($item) use ($dataKey, $colKey) {
            $data = $item->$dataKey ?? [];
            $val = $data[$colKey] ?? 'Unknown';
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

    protected function getSourcePool(string $type, $id, &$totalRowsProcessed, array $config = []): Collection
    {
        if ($type === 'roster') {
            $roster = Roster::with('rootSections')->find($id);
            if (!$roster) return collect();

            $sectionIds = [];
            if (!empty($config['section_ids'])) {
                $sections = RosterSection::whereIn('id', $config['section_ids'])->get();
                $sectionIds = $this->getAllSectionIds($sections);
            } else {
                $sectionIds = $this->getAllSectionIds($roster->rootSections);
            }

            $contents = RosterContent::whereIn('section_id', $sectionIds)->get();
            $totalRowsProcessed += $contents->count();
            return $contents;
        } elseif ($type === 'section') {
            $section = RosterSection::with('children')->find($id);
            if (!$section) return collect();

            $sectionIds = $this->getAllSectionIds([$section]);
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

    protected function evaluateCount(array $count, string $parentType, $parentId, &$totalRowsProcessed): float
    {
        if (empty($count['conditions']) || !is_array($count['conditions'])) {
            return 0;
        }

        $result = 0;

        foreach ($count['conditions'] as $idx => $cond) {
            $condMatchedValue = 0;

            if (($cond['type'] ?? '') === 'value') {
                $condMatchedValue = (float)($cond['settings']['value'] ?? 0);
            } elseif (($cond['type'] ?? '') === 'count') {
                $targetCountId = $cond['settings']['count_id'] ?? null;
                if ($targetCountId) {
                    $otherCounts = [];
                    if ($parentType === 'roster') {
                        $roster = Roster::find($parentId);
                        $otherCounts = $roster ? ($roster->counts ?? []) : [];
                    } else {
                        $section = RosterSection::find($parentId);
                        $otherCounts = $section ? ($section->counts ?? []) : [];
                    }
                    $targetCount = collect($otherCounts)->first(fn($c) => (string)($c['id'] ?? '') === (string)$targetCountId);
                    if ($targetCount) {
                        $condMatchedValue = $this->evaluateCount($targetCount, $parentType, $parentId, $totalRowsProcessed);
                    }
                }
            } else {
                // Determine pool for this condition
                $scope = $cond['scope'] ?? 'default';
                $pool = collect();

                if ($scope === 'roster' && !empty($cond['roster_id'])) {
                    $pool = $this->getSourcePool('roster', $cond['roster_id'], $totalRowsProcessed);
                } elseif ($scope === 'specific_sections' && !empty($cond['section_ids'])) {
                    $sections = RosterSection::whereIn('id', $cond['section_ids'])->get();
                    $sectionIds = $this->getAllSectionIds($sections);
                    $pool = RosterContent::whereIn('section_id', $sectionIds)->get();
                    $totalRowsProcessed += $pool->count();
                } elseif ($scope === 'section' && $parentType === 'section') {
                    $pool = $this->getSourcePool('section', $parentId, $totalRowsProcessed);
                } else {
                    // Default behavior
                    if ($parentType === 'roster') {
                        $pool = $this->getSourcePool('roster', $parentId, $totalRowsProcessed);
                    } else {
                        $pool = $this->getSourcePool('section', $parentId, $totalRowsProcessed);
                    }
                }

                $filtered = $this->applyConditions($pool, $cond['filters'] ?? [$cond], 'roster');
                $condMatchedValue = $filtered->count();
            }

            // Apply arithmetic/logic sequentially
            $op = $idx === 0 ? '+' : ($cond['operator'] ?? ($cond['arithmetic_operator'] ?? '+'));

            if ($op === '+') $result += $condMatchedValue;
            elseif ($op === '-') $result -= $condMatchedValue;
            elseif ($op === '*') $result *= $condMatchedValue;
            elseif ($op === '/' && $condMatchedValue != 0) $result /= $condMatchedValue;
            elseif ($op === 'AND') $result = min((float)$result, (float)$condMatchedValue);
            elseif ($op === 'OR') $result = max((float)$result, (float)$condMatchedValue);
        }

        return $result;
    }

    protected function applyConditions(Collection $pool, array $conditions, string $sourceType, string $operator = 'AND'): Collection
    {
        if (empty($conditions)) return $pool;

        $dataKey = $sourceType === 'database' ? 'data' : 'content';

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
        $targetCol = $cond['target_col'] ?? null;
        if (!$targetCol) return true;

        $val = $data[$targetCol] ?? null;
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
