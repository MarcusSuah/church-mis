<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Users still on a default/temporary password (must_change_credentials) can
 * only reach the change-password page and sign out until they change it.
 */
class EnsurePasswordChanged
{
    private const ALLOWED_ROUTES = ['password.change', 'password.change.update', 'logout'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->must_change_credentials && ! $request->routeIs(...self::ALLOWED_ROUTES)) {
            return $request->expectsJson()
                ? response()->json(['message' => 'You must change your password first.'], 403)
                : redirect()->route('password.change');
        }

        return $next($request);
    }
}
