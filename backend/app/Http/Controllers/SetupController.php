<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

class SetupController extends Controller
{
    public function status()
    {
        $isSetup = User::where('is_superadmin', true)->exists();
        
        return response()->json([
            'is_setup' => $isSetup,
        ]);
    }

    public function setup(Request $request)
    {
        // 1. Check if already setup
        if (User::where('is_superadmin', true)->exists()) {
            return response()->json(['message' => 'System is already setup.'], 403);
        }

        // 2. Validate request
        $request->validate([
            'username' => 'required|string|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        try {
            // 3. Run migrations
            Artisan::call('migrate', ['--force' => true]);

            // 4. Create superadmin user
            $user = User::create([
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'is_superadmin' => true,
            ]);

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
