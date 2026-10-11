<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Account\LockScreenController;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * While a signed-in user's screen is locked (after the idle time set in
 * Church Settings, or the "Lock screen" button), every page sends them to
 * the lock screen until they type their password. They stay signed in;
 * this only stops someone else from using an unattended screen.
 *
 * The lock lives in the session, so reloading the page or typing another
 * address does not get past it, and the locked page's data is never sent.
 */
class EnsureScreenUnlocked
{
    private const ALLOWED_ROUTES = ['lock-screen', 'lock-screen.lock', 'lock-screen.unlock', 'logout'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! $request->hasSession() || ! LockScreenController::isLocked($request)
            || $request->routeIs(...self::ALLOWED_ROUTES)) {
            return $next($request);
        }

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['message' => 'Your screen is locked. Unlock it to continue.'], 423);
        }

        // Come back here after unlocking (normal page visits only).
        if ($request->isMethod('GET')) {
            $request->session()->put(LockScreenController::INTENDED_KEY, $request->fullUrl());
        }

        return redirect()->route('lock-screen');
    }
}
