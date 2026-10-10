<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }
}
