<?php

namespace App\Support;

/** The church logo as a data URI for PDFs (DomPDF never fetches URLs). */
class ChurchLogo
{
    public static function dataUri(): ?string
    {
        $url = config('church.logo_url');
        $path = null;
        if ($url) {
            $rel = ltrim((string) parse_url($url, PHP_URL_PATH), '/');
            foreach ([public_path($rel), storage_path('app/public/'.preg_replace('#^storage/#', '', $rel))] as $p) {
                if (is_file($p)) {
                    $path = $p;
                    break;
                }
            }
        }
        $path ??= collect([public_path('images/logo.png'), public_path('logo.png')])->first(fn ($p) => is_file($p));
        if (! $path) {
            return null;
        }
        $mime = mime_content_type($path) ?: 'image/png';
        if (! str_starts_with($mime, 'image/') || $mime === 'image/svg+xml') {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path));
    }
}
