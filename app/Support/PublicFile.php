<?php

namespace App\Support;

/**
 * URLs for files on the public disk (photos, banners, gallery images).
 *
 * They are root-relative ("/storage/uploads/images/x.jpg") instead of
 * Storage::url()'s absolute form, which bakes in APP_URL: an image uploaded on
 * a laptop (http://localhost:8000/…) then broke on the live site, and one
 * uploaded live broke locally. A relative URL works on whatever host serves
 * the page. Requires `php artisan storage:link` (public/storage).
 */
final class PublicFile
{
    /** "/storage/{path}" for a path on the public disk. */
    public static function url(string $path): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $path), '/');
    }

    /**
     * Strips the host from a stored URL that points at this app's storage
     * ("https://any-host/storage/x.jpg" → "/storage/x.jpg"). Other URLs
     * (external images, already-relative paths) come back unchanged.
     */
    public static function normalize(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return $url;
        }

        return preg_match('#^https?://[^/]+(/storage/.+)$#i', $url, $m) ? $m[1] : $url;
    }
}
