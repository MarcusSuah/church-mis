<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Support\PublicFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Backs the ImageUploadField component (member photos etc.). Stores the file
 * on the public disk and returns its URL; run `php artisan storage:link`
 * once so /storage URLs resolve.
 */
class UploadController extends Controller
{
    public function image(Request $request): JsonResponse
    {
        // F22: image uploads back staff forms only. Member-only accounts (and
        // accounts with no role) can't push files onto the public disk.
        $user = $request->user();
        abort_if($user->isMemberOnly() || $user->getRoleNames()->isEmpty(), 403);

        $request->validate([
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
        ]);

        $path = $request->file('file')->store('uploads/images', 'public');

        // Root-relative, so the saved URL works on every host (see PublicFile).
        return response()->json(['url' => PublicFile::url($path)]);
    }
}
