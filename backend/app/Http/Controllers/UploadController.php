<?php

namespace App\Http\Controllers;

use App\Models\Faction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function uploadBranding(Request $request, string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        if (!User::hasFactionPermission($user, $faction, 'modify_faction_details')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'type' => 'required|string|in:icon,header_dark,header_light,favicon',
            'file' => 'required|mimes:jpeg,png,jpg,gif,svg,ico|max:2048',
        ]);

        $type = $request->input('type');

        // Check membership restrictions for header and favicon
        if (($type === 'header_dark' || $type === 'header_light' || $type === 'favicon') && !$user->allow_custom_branding) {
            return response()->json([
                'message' => 'Custom branding is a restricted feature.'
            ], 403);
        }

        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension();
        $filename = $shortname . '_' . $type . '_' . Str::random(10) . '.' . $extension;
        
        $path = $file->storeAs('branding', $filename, 'public');

        // Persist the relative path immediately to the database
        if ($type === 'icon') $faction->update(['image_url' => $path]);
        else if ($type === 'header_dark') $faction->update(['header_image_dark' => $path]);
        else if ($type === 'header_light') $faction->update(['header_image_light' => $path]);
        else if ($type === 'favicon') $faction->update(['favicon' => $path]);

        return response()->json([
            'message' => 'File uploaded successfully',
            'url' => Storage::disk('public')->url($path)
        ]);
    }
}
