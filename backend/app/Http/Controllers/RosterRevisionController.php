<?php

namespace App\Http\Controllers;

use App\Models\Roster;
use App\Models\RosterRevision;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class RosterRevisionController extends Controller
{
    public function index(Roster $roster)
    {
        $faction = $roster->faction;
        $user = Auth::user();

        if (! User::hasRosterPermission($user, $roster, 'revision_history')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $revisions = RosterRevision::where('roster_id', $roster->id)
            ->select(['id', 'roster_id', 'user_id', 'description', 'created_at', 'updated_at'])
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        $this->audit('roster_revision.index', "Viewed revision history for roster '{$roster->name}'", $faction->id, $roster);

        return response()->json($revisions);
    }

    public function show(Roster $roster, RosterRevision $revision)
    {
        $faction = $roster->faction;
        $user = Auth::user();

        if (! User::hasRosterPermission($user, $roster, 'revision_history')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($revision->roster_id !== $roster->id) {
            return response()->json(['message' => 'Revision not found for this roster'], 404);
        }

        $this->audit('roster_revision.show', "Viewed revision #{$revision->id} for roster '{$roster->name}'", $faction->id, $revision);

        return response()->json($revision->load('user'));
    }

    public function restore(Roster $roster, RosterRevision $revision)
    {
        $faction = $roster->faction;
        $user = Auth::user();

        if (! User::hasRosterPermission($user, $roster, 'revision_history')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($revision->roster_id !== $roster->id) {
            return response()->json(['message' => 'Revision not found for this roster'], 404);
        }

        $oldValues = RosterRevision::captureState($roster->id);

        RosterRevision::restoreState($roster->id, $revision->snapshot);

        // Capture a new revision showing we restored to a specific revision
        $this->audit(
            'roster_revision.restore',
            "Restored roster '{$roster->name}' to version from ".$revision->created_at->format('Y-m-d H:i:s'),
            $faction->id,
            $roster,
            $oldValues,
            $revision->snapshot
        );

        return response()->json(['message' => 'Roster restored successfully']);
    }
}
