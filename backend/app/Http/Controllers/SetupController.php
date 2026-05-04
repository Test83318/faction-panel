<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class SetupController extends Controller
{
    private function isSystemSetup(): bool
    {
        if (!Schema::hasTable('users')) {
            return false;
        }

        return User::where('is_superadmin', true)->exists();
    }

    public function status()
    {
        return response()->json([
            'is_setup' => $this->isSystemSetup(),
        ]);
    }

    public function setup(Request $request)
    {
        // 1. Check if already setup
        if ($this->isSystemSetup()) {
            return response()->json(['message' => 'System is already setup.'], 403);
        }

        try {
            // 2. Run migrations first so tables exist for validation
            Artisan::call('migrate', ['--force' => true]);

            // 3. Validate request
            $request->validate([
                'username' => 'required|string|max:255|unique:users',
                'password' => 'required|string|min:8|confirmed',
            ]);

            // 4. Create superadmin user
            $user = User::create([
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'is_superadmin' => true,
            ]);

            // 5. Initialize default settings
            \App\Models\SiteSetting::updateOrCreate(['key' => 'allow_registration'], ['value' => 'true']);
            \App\Models\SiteSetting::updateOrCreate(['key' => 'version'], ['value' => '1.0.0']);

            return response()->json([
                'message' => 'Setup completed successfully.',
                'user' => $user,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Setup failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
