<?php

namespace App\Services;

use App\Models\Faction;
use App\Models\FactionRecordEntry;
use App\Models\Notification;
use App\Models\NotificationScheme;
use App\Models\RosterContent;

class NotificationService
{
    public static function triggerDatabaseEntryEvent(FactionRecordEntry $entry, string $eventType)
    {
        $database = $entry->database;
        if (! $database) {
            return;
        }

        $faction = $database->faction;
        if (! $faction) {
            return;
        }

        $triggerType = 'database_entry_'.$eventType; // database_entry_created or database_entry_updated

        $schemes = NotificationScheme::where('faction_id', $faction->id)
            ->where('trigger_type', $triggerType)
            ->where('target_id', $database->id)
            ->get();

        foreach ($schemes as $scheme) {
            if (self::evaluateConditions($entry->data ?? [], $scheme->conditions)) {
                $title = $eventType === 'created' ? "New entry in {$database->name}" : "Entry updated in {$database->name}";

                $allowBranding = $faction->allow_branding;
                $message = ($allowBranding && ! empty($scheme->text_template))
                    ? self::parseTemplate($scheme->text_template, $triggerType, $entry, $database)
                    : ($eventType === 'created'
                        ? "A new entry has been created in the database '{$database->name}' (#{$entry->entry_id})."
                        : "An entry has been updated in the database '{$database->name}' (#{$entry->entry_id}).");

                Notification::create([
                    'faction_id' => $faction->id,
                    'notification_scheme_id' => $scheme->id,
                    'type' => 'faction',
                    'title' => $title,
                    'message' => $message,
                    'data' => [
                        'database_id' => $database->id,
                        'entry_id' => $entry->id,
                        'entry_uid' => $entry->entry_id,
                        'trigger_type' => $triggerType,
                    ],
                ]);
            }
        }
    }

    public static function triggerRosterContentEvent(RosterContent $content, string $eventType)
    {
        $section = $content->section;
        if (! $section) {
            return;
        }

        $roster = $section->roster;
        if (! $roster) {
            return;
        }

        $faction = $roster->faction;
        if (! $faction) {
            return;
        }

        $triggerType = 'roster_row_'.$eventType; // roster_row_created or roster_row_updated

        $schemes = NotificationScheme::where('faction_id', $faction->id)
            ->where('trigger_type', $triggerType)
            ->where('target_id', $roster->id)
            ->get();

        foreach ($schemes as $scheme) {
            if (self::evaluateConditions($content->content ?? [], $scheme->conditions)) {
                $title = $eventType === 'created' ? "New row in roster {$roster->name}" : "Row updated in roster {$roster->name}";

                $allowBranding = $faction->allow_branding;
                $message = ($allowBranding && ! empty($scheme->text_template))
                    ? self::parseTemplate($scheme->text_template, $triggerType, $content, $roster)
                    : ($eventType === 'created'
                        ? "A new row has been added to roster '{$roster->name}' under section '{$section->name}'."
                        : "A row has been updated in roster '{$roster->name}' under section '{$section->name}'.");

                Notification::create([
                    'faction_id' => $faction->id,
                    'notification_scheme_id' => $scheme->id,
                    'type' => 'faction',
                    'title' => $title,
                    'message' => $message,
                    'data' => [
                        'roster_id' => $roster->id,
                        'section_id' => $section->id,
                        'content_id' => $content->id,
                        'trigger_type' => $triggerType,
                    ],
                ]);
            }
        }
    }

    public static function triggerFactionEvent(Faction $faction, string $eventType)
    {
        $triggerType = 'faction_'.$eventType; // faction_updated

        $schemes = NotificationScheme::where('faction_id', $faction->id)
            ->where('trigger_type', $triggerType)
            ->get();

        foreach ($schemes as $scheme) {
            $title = 'Faction settings updated';

            $allowBranding = $faction->allow_branding;
            $message = ($allowBranding && ! empty($scheme->text_template))
                ? self::parseTemplate($scheme->text_template, $triggerType, $faction)
                : "The faction settings for '{$faction->name}' have been updated.";

            Notification::create([
                'faction_id' => $faction->id,
                'notification_scheme_id' => $scheme->id,
                'type' => 'faction',
                'title' => $title,
                'message' => $message,
                'data' => [
                    'faction_shortname' => $faction->shortname,
                    'trigger_type' => $triggerType,
                ],
            ]);
        }
    }

    public static function evaluateConditions(array $data, ?array $conditions): bool
    {
        if (empty($conditions)) {
            return true;
        }

        foreach ($conditions as $cond) {
            $columnId = $cond['column_id'] ?? null;
            if (! $columnId) {
                continue;
            }

            $operator = $cond['operator'] ?? 'equals';
            $targetValue = $cond['value'] ?? null;
            $actualValue = $data[$columnId] ?? null;

            switch ($operator) {
                case 'equals':
                    if (strval($actualValue) !== strval($targetValue)) {
                        return false;
                    }
                    break;
                case 'not_equals':
                    if (strval($actualValue) === strval($targetValue)) {
                        return false;
                    }
                    break;
                case 'contains':
                    if (strpos(strval($actualValue), strval($targetValue)) === false) {
                        return false;
                    }
                    break;
                default:
                    if (strval($actualValue) !== strval($targetValue)) {
                        return false;
                    }
                    break;
            }
        }

        return true;
    }

    public static function parseTemplate(string $template, string $triggerType, $entity, $parent = null): string
    {
        $text = $template;

        if ($triggerType === 'database_entry_created' || $triggerType === 'database_entry_updated') {
            $text = str_replace('{database.name}', $parent->name ?? '', $text);
            $text = str_replace('{faction.name}', $parent->faction->name ?? '', $text);

            preg_match_all('/\{([^}]+)\}/', $text, $matches);
            foreach ($matches[1] as $placeholder) {
                $key = $placeholder;
                if (str_starts_with($placeholder, 'entry.')) {
                    $key = substr($placeholder, 6);
                }
                if (isset($entity->data[$key])) {
                    $val = $entity->data[$key];
                    $valStr = is_array($val) ? json_encode($val) : strval($val);
                    $text = str_replace('{'.$placeholder.'}', $valStr, $text);
                }
            }
        } elseif ($triggerType === 'roster_row_created' || $triggerType === 'roster_row_updated') {
            $text = str_replace('{roster.name}', $parent->name ?? '', $text);
            $text = str_replace('{faction.name}', $parent->faction->name ?? '', $text);

            preg_match_all('/\{([^}]+)\}/', $text, $matches);
            foreach ($matches[1] as $placeholder) {
                $key = $placeholder;
                if (str_starts_with($placeholder, 'roster.')) {
                    $key = substr($placeholder, 7);
                }
                if (isset($entity->content[$key])) {
                    $val = $entity->content[$key];
                    $valStr = is_array($val) ? json_encode($val) : strval($val);
                    $text = str_replace('{'.$placeholder.'}', $valStr, $text);
                }
            }
        } elseif ($triggerType === 'faction_updated') {
            $text = str_replace('{faction.name}', $entity->name ?? '', $text);
            $text = str_replace('{faction.description}', $entity->description ?? '', $text);
        }

        return $text;
    }
}
