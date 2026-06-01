<?php

namespace App\Http\Controllers;

use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        Auth::setUser($user);
        $this->audit('auth.login', "Logged in user '{$user->username}'", null, $user);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('groups', 'membershipTier'),
        ]);
    }

    public function register(Request $request)
    {
        $allowRegistration = SiteSetting::where('key', 'allow_registration')->first();
        if ($allowRegistration && $allowRegistration->value === 'false') {
            return response()->json(['message' => 'Registration is currently disabled.'], 403);
        }

        if (! config('features.allow_registration')) {
            return response()->json(['message' => 'Registration is currently disabled.'], 403);
        }

        $request->validate([
            'username' => 'required|string|unique:users|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'username' => $request->username,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        Auth::setUser($user);
        $this->audit('auth.register', "Registered new user '{$user->username}'", null, $user);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('groups', 'membershipTier'),
        ]);
    }

    public function registrationStatus()
    {
        $allowRegistrationSetting = SiteSetting::where('key', 'allow_registration')->first();
        $allowRegistration = $allowRegistrationSetting ? ($allowRegistrationSetting->value === 'true') : (bool) config('features.allow_registration');

        $this->audit('auth.registration_status', 'Viewed registration status');

        return response()->json([
            'allow_registration' => $allowRegistration,
            'gtaw_oauth_enabled' => (bool) config('features.gtaw_oauth_enabled'),
            'gtaw_client_id' => config('features.gtaw_client_id'),
            'gtaw_redirect_uri' => config('features.gtaw_redirect_uri'),
        ]);
    }

    public function gtawRedirect()
    {
        if (! config('features.gtaw_oauth_enabled')) {
            return response()->json(['message' => 'GTA:W OAuth is disabled.'], 403);
        }

        $query = http_build_query([
            'client_id' => config('features.gtaw_client_id'),
            'redirect_uri' => config('features.gtaw_redirect_uri'),
            'response_type' => 'code',
            'scope' => '',
        ]);

        $baseUrl = rtrim(config('features.gtaw_base_url'), '/');

        $this->audit('auth.gtaw_redirect', 'Initiated GTA:W OAuth redirect');

        return response()->json([
            'url' => "{$baseUrl}/oauth/authorize?".$query,
        ]);
    }

    public function gtawCallback(Request $request)
    {
        if (! config('features.gtaw_oauth_enabled')) {
            return response()->json(['message' => 'GTA:W OAuth is disabled.'], 403);
        }

        $code = $request->input('code');

        if (! $code) {
            return response()->json(['message' => 'Authorization code missing.'], 400);
        }

        $baseUrl = rtrim(config('features.gtaw_base_url'), '/');

        // Exchange code for token
        $response = Http::asForm()->post("{$baseUrl}/oauth/token", [
            'grant_type' => 'authorization_code',
            'client_id' => config('features.gtaw_client_id'),
            'client_secret' => config('features.gtaw_client_secret'),
            'redirect_uri' => config('features.gtaw_redirect_uri'),
            'code' => $code,
        ]);

        if ($response->failed()) {
            Log::error('GTA:W Token Exchange Failed', [
                'status' => $response->status(),
                'body' => $response->json(),
                'code' => $code,
                'redirect_uri' => config('features.gtaw_redirect_uri'),
                'client_id' => config('features.gtaw_client_id'),
            ]);

            return response()->json([
                'message' => 'Failed to exchange code for token.',
                'debug' => $response->json(),
            ], 500);
        }

        $accessToken = $response->json('access_token');

        // Get user info
        $userResponse = Http::withToken($accessToken)->get("{$baseUrl}/api/user");

        if ($userResponse->failed()) {
            return response()->json(['message' => 'Failed to fetch user data from GTA:W.'], 500);
        }

        $gtawUser = $userResponse->json();

        if (! isset($gtawUser['id']) || ! isset($gtawUser['username'])) {
            // Some API responses wrap the data in a 'user' or 'data' key
            $data = $gtawUser['user'] ?? $gtawUser['data'] ?? $gtawUser;

            if (! isset($data['id']) || ! isset($data['username'])) {
                return response()->json([
                    'message' => 'Invalid user data received from GTA:W.',
                    'debug' => $gtawUser,
                ], 500);
            }

            $gtawUser = $data;
        }

        $gtawId = $gtawUser['id'];
        $gtawUsername = $gtawUser['username'];
        $avatarUrl = $gtawUser['avatar_url'] ?? $gtawUser['avatar'] ?? null;

        // Check if there is an authenticated user (linking from settings)
        $currentUser = auth('sanctum')->user();

        if ($currentUser) {
            // Case 1: Linking GTA:W account to logged-in user
            // Ensure this GTA:W account isn't already linked to a different user
            $existingLink = User::where('gtaw_id', $gtawId)
                ->where('id', '!=', $currentUser->id)
                ->first();

            if ($existingLink) {
                return response()->json([
                    'message' => 'This GTA:W account is already linked to another user.',
                ], 400);
            }

            $oldValues = $currentUser->getOriginal();
            $currentUser->update([
                'gtaw_id' => $gtawId,
                'gtaw_username' => $gtawUsername,
                'gtaw_access_token' => $accessToken,
                'avatar_url' => $avatarUrl,
            ]);

            $user = $currentUser;
        } else {
            // Case 2: Not logged in (creating an account / logging in)
            $user = User::where('gtaw_id', $gtawId)->first();

            if (! $user) {
                // Check if registration is allowed
                $allowRegistrationSetting = SiteSetting::where('key', 'allow_registration')->first();
                $allowRegistration = $allowRegistrationSetting ? ($allowRegistrationSetting->value === 'true') : (bool) config('features.allow_registration');

                if (! $allowRegistration) {
                    return response()->json(['message' => 'Registration is currently disabled. No account found for this GTA:W user.'], 403);
                }

                // Check if a user with the same GTA:W username or internal username already exists
                $collisionExists = User::where('gtaw_username', $gtawUsername)
                    ->orWhere('username', $gtawUsername)
                    ->exists();

                $usernameToUse = $gtawUsername;
                if ($collisionExists) {
                    do {
                        $randomDigits = strval(rand(1000, 9999));
                        $candidateUsername = $gtawUsername.$randomDigits;
                    } while (User::where('username', $candidateUsername)
                        ->orWhere('gtaw_username', $candidateUsername)
                        ->exists());

                    $usernameToUse = $candidateUsername;
                }

                // Create new user
                $user = User::create([
                    'username' => $usernameToUse,
                    'gtaw_id' => $gtawId,
                    'gtaw_username' => $gtawUsername,
                    'gtaw_access_token' => $accessToken,
                    'avatar_url' => $avatarUrl,
                    'password' => null, // No password for GTA:W users
                ]);
                $isNew = true;
            } else {
                $isNew = false;
                // User found by ID, update token and ensure username/avatar is synced
                $oldValues = $user->getOriginal();
                $user->update([
                    'gtaw_access_token' => $accessToken,
                    'gtaw_username' => $gtawUsername,
                    'avatar_url' => $avatarUrl,
                ]);
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        Auth::setUser($user);
        if ($currentUser) {
            $this->audit('auth.gtaw_link', "Linked GTA:W account '{$gtawUsername}' to user '{$user->username}'", null, $user, $oldValues, $user->getDirty());
        } elseif (isset($isNew) && $isNew) {
            $this->audit('auth.gtaw_register', "Registered new user '{$user->username}' via GTA:W", null, $user);
        } else {
            $this->audit('auth.gtaw_login', "Logged in via GTA:W as '{$user->username}'", null, $user, $oldValues ?? null, $user->getDirty());
        }

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('groups', 'membershipTier'),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $this->audit('auth.logout', "Logged out user '{$user->username}'", null, $user);
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $this->audit('auth.me', "Fetched authenticated user profile for '{$user->username}'", null, $user);

        return response()->json($user->load('groups', 'factions', 'membershipTier', 'roles'));
    }

    public function unlinkGtaw(Request $request)
    {
        $user = $request->user();

        if (! $user->password) {
            return response()->json(['message' => 'You must set a password before unlinking your GTA:W account.'], 400);
        }

        $oldValues = $user->getOriginal();
        $user->update([
            'gtaw_id' => null,
            'gtaw_username' => null,
        ]);
        $this->audit('auth.unlink_gtaw', "Unlinked GTA:W account from user '{$user->username}'", null, $user, $oldValues, $user->getDirty());

        return response()->json(['message' => 'GTA:W account unlinked successfully.']);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required_with:password|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        // If the user has a password set, they must provide the current one
        if ($user->password && ! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match our records.'],
            ]);
        }

        $oldValues = $user->getOriginal();
        $user->update([
            'password' => Hash::make($request->password),
        ]);
        $this->audit('auth.change_password', "Changed password for user '{$user->username}'", null, $user, $oldValues, $user->getDirty());

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function updateSettings(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'always_match_row_height' => 'sometimes|boolean',
        ]);

        $oldValues = $user->getOriginal();
        $user->update($validated);
        $this->audit('auth.update_settings', "Updated settings for user '{$user->username}'", null, $user, $oldValues, $user->getDirty());

        return response()->json([
            'message' => 'Settings updated successfully.',
            'user' => $user->fresh(['groups', 'membershipTier']),
        ]);
    }
}
