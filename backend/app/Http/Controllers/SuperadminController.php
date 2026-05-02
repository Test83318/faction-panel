<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SuperadminController extends Controller
{
    private function checkSuperadmin(Request $request)
    {
        if (!$request->user() || !$request->user()->is_superadmin) {
            abort(403, 'Unauthorized access.');
        }
    }

    public function getUsers(Request $request)
    {
        $this->checkSuperadmin($request);
        // Include counts for display
        return User::withCount('factions')->get();
    }

    public function updateUser(Request $request, User $user)
    {
        $this->checkSuperadmin($request);
        
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'gtaw_id' => 'nullable|integer',
            'gtaw_username' => 'nullable|string|max:255',
            'is_superadmin' => 'boolean'
        ]);

        $user->update($validated);
        return response()->json(['message' => 'User updated successfully', 'user' => $user]);
    }

    public function deleteUser(Request $request, User $user)
    {
        $this->checkSuperadmin($request);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself.'], 400);
        }

        // Handle faction leaderships before deleting? 
        // For now just standard delete or set to null
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function getFactions(Request $request)
    {
        $this->checkSuperadmin($request);
        return Faction::with('leader')->withCount('users')->get();
    }

    public function updateFaction(Request $request, Faction $faction)
    {
        $this->checkSuperadmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'shortname' => 'required|string|alpha_dash|max:20|unique:factions,shortname,' . $faction->id,
            'faction_leader' => 'nullable|exists:users,id',
        ]);

        $faction->update($validated);

        // If leadership changed, ensure they are in the faction
        if ($request->has('faction_leader') && $request->faction_leader) {
            if (!$faction->users()->where('users.id', $request->faction_leader)->exists()) {
                $faction->users()->attach($request->faction_leader);
            }
        }

        return response()->json(['message' => 'Faction updated successfully', 'faction' => $faction->load('leader')]);
    }

    public function deleteFaction(Request $request, Faction $faction)
    {
        $this->checkSuperadmin($request);
        $faction->delete();
        return response()->json(['message' => 'Faction deleted successfully']);
    }

    public function impersonate(Request $request, User $user)
    {
        $this->checkSuperadmin($request);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot impersonate yourself.'], 400);
        }

        // Issue a token for the target user
        $token = $user->createToken('impersonation_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('groups', 'factions')
        ]);
    }
}
