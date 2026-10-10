<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API routes (/api/...)
|--------------------------------------------------------------------------
| Every route needs a valid Sanctum token or first-party session, a verified
| email address, and stays under the "api" rate limit. Responses list their
| fields explicitly; models are never returned as-is.
*/
Route::middleware(['auth:sanctum', 'verified', 'throttle:api'])->group(function () {
    Route::get('/user', function (Request $request) {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames(),
        ]);
    })->name('api.user');
});
