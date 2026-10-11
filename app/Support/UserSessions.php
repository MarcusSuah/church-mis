<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Ending a user's sessions and API tokens (Phase 4, F09).
 *
 * - After a password change or reset, every OTHER browser session and every
 *   OTHER API token stops working; the device that made the change stays
 *   signed in.
 * - When an account is blocked, deactivated, deleted or signed out by an
 *   administrator, everything stops working.
 *
 * Browser sessions: with SESSION_DRIVER=database the rows are deleted
 * straight away. With any driver, the AuthenticateSession middleware (web
 * and Sanctum) signs a session out on its next request once the password
 * hash it remembers no longer matches. Remember-me cookies are invalidated
 * by rotating remember_token.
 */
class UserSessions
{
    /** Password changed or reset: end everything except the current session/token. */
    public static function passwordChanged(User $user, ?Request $request = null): void
    {
        $currentToken = $user->currentAccessToken();
        $keepTokenId = $currentToken instanceof PersonalAccessToken ? $currentToken->getKey() : null;
        $keepSession = $request && $request->hasSession() ? $request->session()->getId() : null;

        self::rotateRememberToken($user);
        self::deleteSessions($user, $keepSession);
        self::revokeTokens($user, $keepTokenId);

        if ($request) {
            self::refreshRememberCookie($user, $request);
        }
    }

    /**
     * The device that changed the password keeps its "remember me" cookie:
     * re-issue it with the new remember token and password hash (as
     * SessionGuard::logoutOtherDevices does). Other devices' cookies no
     * longer match and stop working.
     */
    private static function refreshRememberCookie(User $user, Request $request): void
    {
        $guard = auth()->guard('web');
        if (! $guard instanceof SessionGuard || ! $request->cookies->has($guard->getRecallerName())) {
            return;
        }

        $value = $user->getAuthIdentifier().'|'.$user->getRememberToken().'|'.$guard->hashPasswordForCookie($user->getAuthPassword());
        // 576000 minutes (400 days) is the framework's own remember-me lifetime.
        $guard->getCookieJar()->queue($guard->getCookieJar()->make($guard->getRecallerName(), $value, 576000));
    }

    /** Block, deactivate, delete, "sign out everywhere": end everything. Returns the number of sessions + tokens ended. */
    public static function endAll(User $user): int
    {
        self::rotateRememberToken($user);

        return self::deleteSessions($user) + self::revokeTokens($user);
    }

    public static function revokeTokens(User $user, int|string|null $exceptId = null): int
    {
        return $user->tokens()->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))->delete();
    }

    private static function deleteSessions(User $user, ?string $exceptId = null): int
    {
        if (config('session.driver') !== 'database') {
            return 0;
        }

        return DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->getKey())
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->delete();
    }

    private static function rotateRememberToken(User $user): void
    {
        $user->forceFill(['remember_token' => Str::random(60)])->saveQuietly();
    }
}
