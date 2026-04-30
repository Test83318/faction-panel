<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\FactionInvite;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class InviteController extends Controller
{
    public function index(Request $request, $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        if (!User::hasFactionPermission(Auth::user(), $faction, 'manage_invites')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $invites = $faction->invites()->with('creator:id,username')->latest()->get();

        return response()->json($invites);
    }

    public function store(Request $request, $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        
        if (!User::hasFactionPermission(Auth::user(), $faction, 'manage_invites')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'duration' => 'required|in:1h,3h,24h,48h,1w,never',
            'max_uses' => 'nullable|integer|min:0',
        ]);

        $expiresAt = null;
        if ($request->duration !== 'never') {
            $expiresAt = match($request->duration) {
                '1h' => Carbon::now()->addHour(),
                '3h' => Carbon::now()->addHours(3),
                '24h' => Carbon::now()->addDay(),
                '48h' => Carbon::now()->addDays(2),
                '1w' => Carbon::now()->addWeek(),
            };
        }

        $invite = $faction->invites()->create([
            'code' => Str::random(8),
            'expires_at' => $expiresAt,
            'max_uses' => $request->max_uses == 0 ? null : $request->max_uses,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($invite->load('creator:id,username'), 201);
    }

    public function destroy($id)
    {
        $invite = FactionInvite::findOrFail($id);
        $faction = $invite->faction;

        if (!User::hasFactionPermission(Auth::user(), $faction, 'manage_invites')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $invite->delete();

        return response()->json(['message' => 'Invite deleted successfully']);
    }

    public function show($code)
    {
        $invite = FactionInvite::where('code', $code)->firstOrFail();
        $faction = $invite->faction;

        if (!$invite->isValid()) {
            return response()->json(['message' => 'This invite has expired or reached its usage limit.'], 410);
        }

        if ($faction->access === 'private') {
            return response()->json(['message' => 'This organization is not accepting new members via invite links.'], 403);
        }

        return response()->json([
            'id' => $faction->id,
            'name' => $faction->name,
            'shortname' => $faction->shortname,
            'description' => $faction->description,
            'color' => $faction->color,
            'image_url' => $faction->image_url,
            'visibility' => $faction->visibility,
            'access' => $faction->access,
            'invite' => [
                'code' => $invite->code,
                'expires_at' => $invite->expires_at,
                'max_uses' => $invite->max_uses,
                'uses' => $invite->uses,
            ]
        ]);
    }

    public function join(Request $request, $code)
    {
        $invite = FactionInvite::where('code', $code)->firstOrFail();
        $faction = $invite->faction;

        if (!$invite->isValid()) {
            return response()->json(['message' => 'This invite has expired or reached its usage limit.'], 410);
        }

        if ($faction->access === 'private') {
            return response()->json(['message' => 'This organization is not accepting new members via invite links.'], 403);
        }

        $user = $request->user();

        if ($faction->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'You are already a member of this faction.'], 422);
        }

        $faction->users()->attach($user->id);
        $invite->increment('uses');

        // Assign default User role
        $userRole = $faction->roles()->where('name', 'User')->first();
        if ($userRole) {
            $user->roles()->attach($userRole->id);
        }

        return response()->json([
            'message' => 'Successfully joined ' . $faction->name,
            'shortname' => $faction->shortname,
        ]);
    }
}
