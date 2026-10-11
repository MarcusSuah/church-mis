<?php

namespace App\Http\Middleware\Api;

use App\Http\Responses\ApiResponse;
use App\Models\BlockedIp;
use App\Services\ActivityLogger;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * The API version of GuardAccess (Phase 4): blocked IP addresses get 403,
 * and a blocked, deactivated or rejected account is signed out — its
 * cookie session ends, or the token it used is deleted.
 */
class GuardApiAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (BlockedIp::isBlocked($request->ip())) {
            return ApiResponse::error('Access from your network has been blocked. Please contact the church office.', 403);
        }

        $user = Auth::guard('sanctum')->user();
        if ($user && ($user->blocked_at || $user->is_active === false || $user->isRejected())) {
            ActivityLogger::log($request, 'blocked', 'Blocked account tried to use the API', $user);

            $token = $user->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            } elseif ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return ApiResponse::error('Your account has been blocked. Please contact the church office.', 403);
        }

        return $next($request);
    }
}
