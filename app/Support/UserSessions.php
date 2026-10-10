<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Signs a user out everywhere (F09): used after a password reset, when the
 * old password may be known to someone else.
 *
 *  - every database session for the user is deleted;
 *  - every Sanctum API token is revoked;
 *  - the "remember me" token is rotated, so remember-me cookies stop working.
 */
final class UserSessions
{
    /** @return int Number of sessions and tokens ended. */
    public static function endAll(User $user): int
    {
        $ended = 0;

        if (config('session.driver') === 'database') {
            $ended += DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
        }

        $ended += $user->tokens()->delete();

        $user->forceFill(['remember_token' => Str::random(60)])->saveQuietly();

        return $ended;
    }
}
