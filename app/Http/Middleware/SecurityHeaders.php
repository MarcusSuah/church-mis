<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Browser security headers on every response (security review, finding E).
 *
 *  - X-Frame-Options: other sites can't frame our pages (clickjacking); the
 *    site's own document viewer frames same-origin files, so SAMEORIGIN.
 *  - X-Content-Type-Options: browsers never guess a file is HTML or script.
 *  - Referrer-Policy: other sites see only our origin, never full URLs.
 *  - Permissions-Policy: no camera, microphone or location (unused here).
 *  - Strict-Transport-Security: once on HTTPS, browsers stay on HTTPS.
 *
 * A header a response already set (e.g. the document viewer) is kept.
 */
class SecurityHeaders
{
    /** @var array<string, string> */
    private const HEADERS = [
        'X-Frame-Options' => 'SAMEORIGIN',
        'X-Content-Type-Options' => 'nosniff',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach (self::HEADERS as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        if ($request->isSecure() && ! $response->headers->has('Strict-Transport-Security')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        return $response;
    }
}
