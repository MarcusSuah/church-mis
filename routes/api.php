<?php

use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\PasswordController;
use App\Http\Controllers\Api\V1\Auth\SessionController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| JSON API — version 1 (Phase 4)
|--------------------------------------------------------------------------
| Prefix /api comes from bootstrap/app.php. Every route here already has:
|  - Sanctum's stateful middleware (cookie sessions + CSRF for the church's
|    own frontends, see config/sanctum.php),
|  - throttle:api (120/min per user, 60/min per IP),
|  - GuardApiAccess (blocked IPs and blocked accounts).
|
| Responses use App\Http\Responses\ApiResponse:
|   { "success": bool, "message": string, "data"?: …, "errors"?: …, "meta"?: … }
|
| A future /api/v2 gets its own group and controllers under Api\V2; v1 keeps
| working unchanged for existing clients.
*/

Route::prefix('v1')->name('api.v1.')->group(function () {

    Route::prefix('auth')->name('auth.')->group(function () {
        // Guests
        Route::post('login', LoginController::class)->middleware('throttle:api-login')->name('login');
        Route::post('forgot-password', [PasswordController::class, 'forgot'])->middleware('throttle:api-public')->name('password.forgot');
        Route::post('reset-password', [PasswordController::class, 'reset'])->middleware('throttle:api-public')->name('password.reset');

        // Signed in (cookie session or Bearer token)
        // password.changed: accounts flagged "must change password" can only use
        // me, password and logout until they do (same rule as the web app).
        Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
            Route::post('logout', [SessionController::class, 'logout'])->name('logout');

            // C4: everything else needs a verified email address.
            Route::middleware('verified')->group(function () {
                Route::get('me', [SessionController::class, 'me'])->name('me');
                Route::put('password', [PasswordController::class, 'update'])->middleware('throttle:6,1')->name('password.update');

                Route::get('tokens', [TokenController::class, 'index'])->name('tokens.index');
                Route::post('tokens', [TokenController::class, 'store'])->middleware('throttle:api-tokens')->name('tokens.store');
                Route::delete('tokens', [TokenController::class, 'destroyAll'])->name('tokens.destroy-all');
                Route::delete('tokens/{token}', [TokenController::class, 'destroy'])->whereNumber('token')->name('tokens.destroy');
            });
        });
    });

    // Resource endpoints (members, finance, reports, admin…) are added in
    // Phase 7 under: auth:sanctum + password.changed + verified + permission/policy checks.
});
