<?php

namespace App\Support;

use App\Http\Responses\ApiResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Rate limits for /api/v1 (Phase 4). Each limit answers with the standard
 * JSON envelope and a Retry-After header.
 *
 *  api        — every API call: 120/min per signed-in user, 60/min per IP for guests.
 *  api-login  — sign-in: 5/min per email + IP, and 30/hour per IP (same
 *               numbers as the web login, from config/church.php).
 *  api-public — password-reset emails and resets: 5/min and 20/hour per IP.
 *  api-tokens — creating tokens: 10/hour per user.
 */
class ApiRateLimits
{
    public static function register(): void
    {
        RateLimiter::for('api', fn (Request $request) => $request->user()
            ? Limit::perMinute(120)->by('user:'.$request->user()->getAuthIdentifier())->response(self::tooMany(...))
            : Limit::perMinute(60)->by('ip:'.$request->ip())->response(self::tooMany(...)));

        RateLimiter::for('api-login', function (Request $request) {
            $email = is_string($request->input('email')) ? $request->input('email') : '';
            $key = Str::transliterate(Str::lower($email).'|'.$request->ip());

            return [
                Limit::perMinute((int) config('church.login_attempts_per_minute', 5))->by('api-login:'.$key)->response(self::tooMany(...)),
                Limit::perHour((int) config('church.login_attempts_per_hour', 30))->by('api-login-ip:'.$request->ip())->response(self::tooMany(...)),
            ];
        });

        RateLimiter::for('api-public', fn (Request $request) => [
            Limit::perMinute(5)->by('api-public:'.$request->ip())->response(self::tooMany(...)),
            Limit::perHour(20)->by('api-public-h:'.$request->ip())->response(self::tooMany(...)),
        ]);

        RateLimiter::for('api-tokens', fn (Request $request) => Limit::perHour(10)
            ->by('api-tokens:'.($request->user()?->getAuthIdentifier() ?? $request->ip()))->response(self::tooMany(...)));
    }

    public static function tooMany(Request $request, array $headers)
    {
        $wait = (int) ($headers['Retry-After'] ?? 60);

        return ApiResponse::error("Too many requests. Please wait {$wait} seconds and try again.", 429, [], ['retry_after' => $wait], $headers);
    }
}
