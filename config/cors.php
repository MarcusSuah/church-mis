<?php

/*
| CORS (Phase 4)
|
| Only the church's own frontends may call the API from a browser, and only
| they may send cookies with the request. "*" is never used: with
| credentials, a wildcard origin would let any website act as a signed-in
| user.
|
| CORS_ALLOWED_ORIGINS is a comma-separated list of full origins
| (scheme + host + port), for example:
|   CORS_ALLOWED_ORIGINS=https://portal.ssbc.org,https://admin.ssbc.org
| When it is not set, only APP_URL is allowed.
*/

$origins = array_values(array_filter(array_map(
    fn ($o) => rtrim(trim($o), '/'),
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', (string) env('APP_URL', 'http://localhost')))
), fn ($o) => $o !== '' && $o !== '*'));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-XSRF-TOKEN', 'X-CSRF-TOKEN'],

    // Lets the frontend read the rate-limit headers (to show "try again in N seconds").
    'exposed_headers' => ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],

    // Browsers may cache the preflight answer for 10 minutes.
    'max_age' => 600,

    // Needed for cookie (SPA) authentication.
    'supports_credentials' => true,

];
