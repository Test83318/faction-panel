<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Faction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogController extends Controller
{
    public function index(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!User::hasFactionPermission(Auth::user(), $faction, 'view_audit_logs')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = AuditLog::with('user')
            ->where('faction_id', $faction->id)
            ->latest();

        if ($request->has('event')) {
            $query->where('event', $request->event);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return $query->paginate($request->input('per_page', 50));
    }

    public function show(string $shortname, AuditLog $auditLog)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (!User::hasFactionPermission(Auth::user(), $faction, 'view_audit_logs')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($auditLog->faction_id !== $faction->id) {
            return response()->json(['message' => 'Not Found'], 404);
        }

        return $auditLog->load(['user', 'auditable']);
    }
}
