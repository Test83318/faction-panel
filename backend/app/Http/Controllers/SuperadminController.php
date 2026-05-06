<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\User;
use App\Models\MembershipTier;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SuperadminController extends Controller
{
    private function checkSuperadmin(Request $request)
    {
        if (!$request->user() || !$request->user()->is_superadmin) {
            abort(403, 'Unauthorized access.');
        }
    }

    public function getSettings(Request $request)
    {
        $this->checkSuperadmin($request);
        return SiteSetting::all()->pluck('value', 'key');
    }

    public function getPublicSettings()
    {
        return SiteSetting::whereIn('key', ['version', 'allow_registration'])->pluck('value', 'key');
    }

    public function updateSettings(Request $request)
    {
        $this->checkSuperadmin($request);
        
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string'
        ]);

        foreach ($validated['settings'] as $key => $value) {
            SiteSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function getUsers(Request $request)
    {
        $this->checkSuperadmin($request);
        // Include counts and membership tier for display
        return User::with(['membershipTier'])->withCount('factions')->get();
    }

    public function storeUser(Request $request)
    {
        $this->checkSuperadmin($request);
        
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users,username',
            'gtaw_id' => 'nullable|integer|unique:users,gtaw_id',
            'gtaw_username' => 'nullable|string|max:255',
            'is_superadmin' => 'boolean',
            'membership_tier_id' => 'nullable|exists:membership_tiers,id',
            'password' => 'nullable|string|min:8'
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user = User::create($validated);
        return response()->json(['message' => 'User created successfully', 'user' => $user->load('membershipTier')], 201);
    }

    public function updateUser(Request $request, User $user)
    {
        $this->checkSuperadmin($request);
        
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'gtaw_id' => 'nullable|integer',
            'gtaw_username' => 'nullable|string|max:255',
            'is_superadmin' => 'boolean',
            'membership_tier_id' => 'nullable|exists:membership_tiers,id'
        ]);

        $user->update($validated);
        return response()->json(['message' => 'User updated successfully', 'user' => $user->load('membershipTier')]);
    }

    public function getMembershipTiers(Request $request)
    {
        $this->checkSuperadmin($request);
        return MembershipTier::withCount('users')->get();
    }

    public function storeMembershipTier(Request $request)
    {
        $this->checkSuperadmin($request);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'max_factions' => 'required|integer|min:0',
            'allow_custom_branding' => 'boolean'
        ]);

        $tier = MembershipTier::create($validated);
        return response()->json($tier, 201);
    }

    public function updateMembershipTier(Request $request, MembershipTier $tier)
    {
        $this->checkSuperadmin($request);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'max_factions' => 'required|integer|min:0',
            'allow_custom_branding' => 'boolean'
        ]);

        $tier->update($validated);
        return response()->json($tier);
    }

    public function deleteMembershipTier(Request $request, MembershipTier $tier)
    {
        $this->checkSuperadmin($request);
        $tier->delete();
        return response()->json(['message' => 'Membership tier deleted successfully']);
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
