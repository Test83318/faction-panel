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

        if (! User::hasFactionPermission(Auth::user(), $faction, 'view_audit_logs')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = AuditLog::with('user')
            ->where('faction_id', $faction->id)
            ->latest();

        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('auditable_type')) {
            $query->where('auditable_type', 'like', '%'.$request->auditable_type.'%');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('old_values', 'like', '%'.$search.'%')
                    ->orWhere('new_values', 'like', '%'.$search.'%')
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('username', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return $query->paginate($request->input('per_page', 50));
    }

    public function show(string $shortname, AuditLog $auditLog)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();

        if (! User::hasFactionPermission(Auth::user(), $faction, 'view_audit_logs')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($auditLog->faction_id !== $faction->id) {
            return response()->json(['message' => 'Not Found'], 404);
        }

        return $auditLog->load(['user', 'auditable']);
    }
}
