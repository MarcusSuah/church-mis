<?php

use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Laravel\Sanctum\Sanctum;

/*
| Sanctum (Phase 4)
|
| Two ways to call /api/v1:
|
| 1. The church's own React app (same site): cookie sessions. The browser
|    first calls GET /sanctum/csrf-cookie, then POST /api/v1/auth/login.
|    Sanctum treats a request as "first-party" only when its Origin/Referer
|    host is listed in `stateful`. Those requests get a session cookie
|    (HttpOnly, Secure in production, SameSite=Lax) and CSRF protection.
|    No token is ever sent to the browser.
|
| 2. Other clients (a future mobile app, integrations): personal access
|    tokens from POST /api/v1/auth/login with a device_name. Each token has
|    abilities (a subset of the user's permissions) and an expiry date.
*/
return [

    // Hosts (with port when not 80/443) of the church's own frontends. Never "*".
    // Production example: SANCTUM_STATEFUL_DOMAINS=portal.ssbc.org,admin.ssbc.org
    'stateful' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'SANCTUM_STATEFUL_DOMAINS',
        env('APP_ENV') === 'production'
            ? Sanctum::currentApplicationUrlWithPort()
            : 'localhost,localhost:3000,localhost:5173,127.0.0.1,127.0.0.1:8000'.Sanctum::currentApplicationUrlWithPort()
    ))))),

    // Cookie sessions use the normal web guard (same users, same Fortify login rules).
    'guard' => ['web'],

    // Hard upper limit for every personal access token, in minutes (default 30 days).
    // Each token also gets its own expires_at, which may be shorter.
    'expiration' => (int) env('SANCTUM_TOKEN_EXPIRATION', 60 * 24 * 30),

    // A recognisable prefix lets GitHub and other secret scanners spot leaked tokens.
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', 'ssbc_'),

    'middleware' => [
        // Signs other cookie sessions out when the password changes (F09).
        'authenticate_session' => AuthenticateSession::class,
        'encrypt_cookies' => EncryptCookies::class,
        'validate_csrf_token' => ValidateCsrfToken::class,
    ],

];
