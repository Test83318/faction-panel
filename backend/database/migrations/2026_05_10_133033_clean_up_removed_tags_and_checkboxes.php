<?php

use App\Models\Roster;
use App\Models\RosterContent;
use App\Models\RosterSection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // This is a data migration to ensure that if a tag or checkbox was removed from a column definition,
        // it is also removed from any roster content that might still have it.
        
        $rosters = Roster::all();
        foreach ($rosters as $roster) {
            $this->cleanUpTarget($roster);
        }

        $sections = RosterSection::whereNotNull('columns')->get();
        foreach ($sections as $section) {
            $this->cleanUpTarget($section);
        }
    }

    private function cleanUpTarget($target)
    {
        $columns = $target->columns;
        if (!$columns || !is_array($columns)) return;

        // Map of colId => [valid_checkboxes, valid_tags]
        $validMap = [];
        foreach ($columns as $col) {
            $cbLabels = collect($col['checkboxes'] ?? [])->map(function($cb) {
                return is_string($cb) ? $cb : ($cb['label'] ?? null);
            })->filter()->toArray();

            $tagLabels = collect($col['tags'] ?? [])->map(function($tag) {
                return is_string($tag) ? $tag : ($tag['label'] ?? null);
            })->filter()->toArray();

            $validMap[$col['id']] = [
                'checkboxes' => $cbLabels,
                'tags' => $tagLabels
            ];
        }

        // Get all content for this target
        $contents = [];
        if ($target instanceof Roster) {
            // Roster columns apply to all sections that use_roster_columns
            $sectionIds = RosterSection::where('roster_id', $target->id)
                ->where(function($q) {
                    $q->where('use_roster_columns', true)->orWhereNull('columns');
                })
                ->pluck('id');
            $contents = RosterContent::whereIn('section_id', $sectionIds)->get();
        } else {
            $contents = RosterContent::where('section_id', $target->id)->get();
        }

        foreach ($contents as $content) {
            $data = $content->content;
            if (!$data || !is_array($data)) continue;

            $changed = false;
            foreach ($validMap as $colId => $valids) {
                $cbKey = "{$colId}_cb";
                if (isset($data[$cbKey]) && is_array($data[$cbKey])) {
                    $original = $data[$cbKey];
                    $data[$cbKey] = array_values(array_intersect($data[$cbKey], $valids['checkboxes']));
                    if (count($original) !== count($data[$cbKey])) $changed = true;
                }

                $tagKey = "{$colId}_tags";
                if (isset($data[$tagKey]) && is_array($data[$tagKey])) {
                    $original = $data[$tagKey];
                    $data[$tagKey] = array_values(array_intersect($data[$tagKey], $valids['tags']));
                    if (count($original) !== count($data[$tagKey])) $changed = true;
                }
            }

            if ($changed) {
                $content->content = $data;
                $content->save();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal for data cleanup
    }
};
