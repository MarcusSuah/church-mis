<?php

namespace App\Support;

use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Limits how many devices one account can be signed in on. When a new
 * sign-in goes over the limit, the oldest sessions are ended.
 */
class SessionLimiter
{
    public static function enforce(User $user, Request $request): int
    {
        $max = (int) config('church.max_sessions', 3);
        if ($max < 1 || config('session.driver') !== 'database') {
            return 0;
        }

        $table = config('session.table', 'sessions');
        $current = $request->hasSession() ? $request->session()->getId() : null;
        $others = DB::table($table)->where('user_id', $user->id)->when($current, fn ($q) => $q->where('id', '!=', $current))
            ->orderByDesc('last_activity')->pluck('id');

        // Keep the newest ($max - 1) other sessions plus this one.
        $remove = $others->slice(max(0, $max - 1));
        if ($remove->isEmpty()) {
            return 0;
        }
        DB::table($table)->whereIn('id', $remove)->delete();
        ActivityLogger::log($request, 'logout', "Signed out of {$remove->count()} older device(s) — limit is {$max} active sessions", $user);

        return $remove->count();
    }
}
