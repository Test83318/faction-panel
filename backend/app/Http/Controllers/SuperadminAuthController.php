<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class SuperadminAuthController extends Controller
{
    /**
     * Show the login form.
     */
    public function showLoginForm()
    {
        if (Auth::guard('web')->check() && Auth::guard('web')->user()->is_superadmin) {
            return redirect()->intended('/pulse');
        }

        return view('auth.login');
    }

    /**
     * Handle the login request.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $credentials['username'])->first();

        if ($user && Hash::check($credentials['password'], $user->password)) {
            if ($user->is_superadmin) {
                Auth::guard('web')->login($user, $request->has('remember'));
                $request->session()->regenerate();

                $this->audit('superadmin.web_login', "Superadmin logged in via web interface: '{$user->username}'", null, $user);

                return redirect()->intended('/pulse');
            }
        }

        return back()->withErrors([
            'username' => 'The provided credentials do not match our records or you do not have superadmin privileges.',
        ])->onlyInput('username');
    }

    /**
     * Log out the superadmin.
     */
    public function logout(Request $request)
    {
        $user = Auth::guard('web')->user();
        if ($user) {
            $this->audit('superadmin.web_logout', "Superadmin logged out: '{$user->username}'", null, $user);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/admin/login');
    }
}
