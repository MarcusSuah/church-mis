<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Users still on a default/temporary password (must_change_credentials) can
 * only reach the change-password page and sign out until they change it.
 * On the API (alias "password.changed") they can only use me, password and logout.
 */
class EnsurePasswordChanged
{
    private const ALLOWED_ROUTES = [
        'password.change', 'password.change.update', 'logout',
        // A locked screen must be unlocked first (EnsureScreenUnlocked), or the two would redirect in a loop.
        'lock-screen', 'lock-screen.lock', 'lock-screen.unlock',
        'api.v1.auth.me', 'api.v1.auth.password.update', 'api.v1.auth.logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->must_change_credentials && ! $request->routeIs(...self::ALLOWED_ROUTES)) {
            if ($request->is('api/*')) {
                return ApiResponse::error('You must change your password first.', 403, [], ['password_change_required' => true]);
            }

            return $request->expectsJson()
                ? response()->json(['message' => 'You must change your password first.'], 403)
                : redirect()->route('password.change');
        }

        return $next($request);
    }
}
