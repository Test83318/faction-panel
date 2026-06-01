<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RosterRevision extends Model
{
    protected $fillable = [
        'roster_id',
        'user_id',
        'description',
        'snapshot',
    ];

    protected $casts = [
        'snapshot' => 'array',
    ];

    private static $captured = [];

    public function roster()
    {
        return $this->belongsTo(Roster::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Clear captured cache (useful for testing or long-lived processes).
     */
    public static function clearCaptured(): void
    {
        self::$captured = [];
    }

    /**
     * Log a new revision if not already logged during this request.
     */
    public static function logRevision(int $rosterId, string $description, ?int $userId = null): void
    {
        if (in_array($rosterId, self::$captured)) {
            return;
        }
        self::$captured[] = $rosterId;

        $snapshot = self::captureState($rosterId);

        self::create([
            'roster_id' => $rosterId,
            'user_id' => $userId ?? Auth::id(),
            'description' => $description,
            'snapshot' => $snapshot,
        ]);
    }

    /**
     * Capture the complete state of a roster including its sections and contents.
     */
    public static function captureState(int $rosterId): array
    {
        $roster = Roster::findOrFail($rosterId);

        return [
            'roster' => $roster->makeHidden(['id', 'faction_id', 'created_at', 'updated_at', 'deleted_at'])->toArray(),
            'permissions' => $roster->rosterPermissions->map(fn ($p) => $p->makeHidden(['id', 'roster_id', 'created_at', 'updated_at'])->toArray())->toArray(),
            'sections' => self::captureSections($rosterId, null),
        ];
    }

    private static function captureSections(int $rosterId, ?int $parentId): array
    {
        return RosterSection::where('roster_id', $rosterId)
            ->where('parent_id', $parentId)
            ->get()
            ->map(function ($section) use ($rosterId) {
                return [
                    'old_id' => $section->id,
                    'section' => $section->makeHidden(['roster_id', 'parent_id', 'created_by', 'created_at', 'updated_at', 'deleted_at'])->toArray(),
                    'contents' => $section->contents->map(fn ($c) => $c->makeHidden(['section_id', 'created_by', 'created_at', 'updated_at', 'deleted_at', 'editing_by', 'editing_at', 'editing_col'])->toArray())->toArray(),
                    'children' => self::captureSections($rosterId, $section->id),
                ];
            })->toArray();
    }

    /**
     * Restore the roster state from a snapshot.
     */
    public static function restoreState(int $rosterId, array $state): void
    {
        $roster = Roster::findOrFail($rosterId);

        DB::transaction(function () use ($roster, $state) {
            $currentUserId = Auth::id();

            // 1. Wipe existing sections and contents
            $roster->sections()->each(function ($section) {
                $section->contents()->forceDelete();
                $section->forceDelete();
            });

            // 2. Recreate sections and build the section ID mapping
            $sectionIdMap = [];
            self::restoreSections($roster, $state['sections'] ?? [], null, $currentUserId, $sectionIdMap);

            // 3. Remap layout settings and counts in the roster settings and section counts
            $rosterData = $state['roster'];
            self::remapSectionIds($rosterData, $sectionIdMap);

            // 4. Update the roster itself
            $roster->update($rosterData);

            // 5. Restore section-level remapped counts/attributes in database
            $recreatedSections = RosterSection::where('roster_id', $roster->id)->get();
            foreach ($recreatedSections as $section) {
                $counts = $section->counts;
                if (! empty($counts)) {
                    self::remapSectionIds($counts, $sectionIdMap);
                    $section->update(['counts' => $counts]);
                }
            }

            // 6. Wipe and restore Roster Permissions
            $roster->rosterPermissions()->delete();
            foreach ($state['permissions'] ?? [] as $pData) {
                $roster->rosterPermissions()->create($pData);
            }
        });
    }

    private static function restoreSections($roster, array $sections, ?int $parentId, ?int $userId, array &$sectionIdMap): void
    {
        foreach ($sections as $sData) {
            $sectionInfo = array_merge($sData['section'], [
                'roster_id' => $roster->id,
                'parent_id' => $parentId,
                'created_by' => $userId,
            ]);

            $section = $roster->sections()->create($sectionInfo);

            if (isset($sData['old_id'])) {
                $sectionIdMap[$sData['old_id']] = $section->id;
            }

            foreach ($sData['contents'] ?? [] as $cData) {
                $section->contents()->create(array_merge($cData, [
                    'created_by' => $userId,
                ]));
            }

            if (! empty($sData['children'])) {
                self::restoreSections($roster, $sData['children'], $section->id, $userId, $sectionIdMap);
            }
        }
    }

    private static function remapSectionIds(&$value, array $idMap): void
    {
        if (is_array($value)) {
            foreach ($value as $key => &$val) {
                if ($key === 'section_ids' && is_array($val)) {
                    foreach ($val as &$id) {
                        if (isset($idMap[$id])) {
                            $id = $idMap[$id];
                        }
                    }
                } elseif ($key === 'section_id' && is_numeric($val)) {
                    if (isset($idMap[$val])) {
                        $val = $idMap[$val];
                    }
                } else {
                    self::remapSectionIds($val, $idMap);
                }
            }
        }
    }
}
