<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * The church logo for PDFs (DomPDF never fetches URLs, so images are data URIs).
 *
 *  - dataUri(): the logo as uploaded, for letterheads.
 *  - blurredDataUri(): a soft, blurred copy for certificate backgrounds.
 *    DomPDF cannot apply CSS blur, so it is made once with GD and cached
 *    until the logo file changes.
 */
class ChurchLogo
{
    public static function dataUri(): ?string
    {
        $path = self::path();
        if (! $path) {
            return null;
        }
        $mime = self::mime($path);

        return $mime ? 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path)) : null;
    }

    /** A blurred copy of the logo (PNG data URI), or null when there is no logo or GD is missing. */
    public static function blurredDataUri(int $size = 700, float $strength = 0.22): ?string
    {
        $path = self::path();
        if (! $path || ! self::mime($path) || ! function_exists('imagecreatefromstring')) {
            return null;
        }

        $key = 'church-logo-blurred:'.md5($path.'|'.filemtime($path).'|'.$size.'|'.$strength);

        return Cache::rememberForever($key, fn () => self::blur($path, $size, $strength));
    }

    /** Local file of the configured logo, falling back to public/images/logo.png or public/logo.png. */
    public static function path(): ?string
    {
        $url = config('church.logo_url');
        if ($url) {
            $rel = ltrim((string) parse_url($url, PHP_URL_PATH), '/');
            foreach ([public_path($rel), storage_path('app/public/'.preg_replace('#^storage/#', '', $rel))] as $p) {
                if (is_file($p)) {
                    return $p;
                }
            }
        }

        return collect([public_path('images/logo.png'), public_path('logo.png')])->first(fn ($p) => is_file($p));
    }

    private static function mime(string $path): ?string
    {
        $mime = mime_content_type($path) ?: 'image/png';

        return str_starts_with($mime, 'image/') && $mime !== 'image/svg+xml' ? $mime : null;
    }

    /**
     * Logos saved as JPG sit on a white square. Fade near-white pixels to
     * transparent so only the emblem itself shows through the blur.
     */
    private static function whiteToTransparent(\GdImage $image): void
    {
        imagealphablending($image, false);
        imagesavealpha($image, true);

        for ($x = 0, $w = imagesx($image); $x < $w; $x++) {
            for ($y = 0, $h = imagesy($image); $y < $h; $y++) {
                $rgba = imagecolorat($image, $x, $y);
                $alpha = ($rgba >> 24) & 0x7F;
                $r = ($rgba >> 16) & 0xFF;
                $g = ($rgba >> 8) & 0xFF;
                $b = $rgba & 0xFF;
                $lightness = min($r, $g, $b);
                // 0 (opaque) for darker colours, rising to 127 (clear) for white.
                $fade = (int) round(127 * max(0, min(1, ($lightness - 175) / 55)));
                imagesetpixel($image, $x, $y, imagecolorallocatealpha($image, $r, $g, $b, max($alpha, $fade)));
            }
        }
    }

    /** Scale every pixel's opacity by $strength (0..1), keeping full transparency where it already is. */
    private static function fade(\GdImage $image, float $strength): void
    {
        imagealphablending($image, false);
        imagesavealpha($image, true);

        for ($x = 0, $w = imagesx($image); $x < $w; $x++) {
            for ($y = 0, $h = imagesy($image); $y < $h; $y++) {
                $rgba = imagecolorat($image, $x, $y);
                $opacity = (127 - (($rgba >> 24) & 0x7F)) * $strength;
                imagesetpixel($image, $x, $y, imagecolorallocatealpha($image, ($rgba >> 16) & 0xFF, ($rgba >> 8) & 0xFF, $rgba & 0xFF, 127 - (int) round($opacity)));
            }
        }
    }

    private static function blur(string $path, int $size, float $strength): ?string
    {
        $source = @imagecreatefromstring((string) file_get_contents($path));
        if (! $source) {
            return null;
        }

        $width = imagesx($source);
        $height = imagesy($source);
        // 400px is plenty for a blurred background and keeps the pixel pass quick.
        $scale = min(1, min($size, 400) / max($width, $height));
        $w = max(1, (int) round($width * $scale));
        $h = max(1, (int) round($height * $scale));

        $canvas = imagecreatetruecolor($w, $h);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 255, 255, 255, 127));
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $w, $h, $width, $height);

        // A strong, even blur: shrink to a tenth, scale back up, then smooth.
        // Clear the white background at full size first, so thin lines keep their colour.
        self::whiteToTransparent($canvas);
        $small = imagescale($canvas, max(1, intdiv($w, 10)), max(1, intdiv($h, 10)), IMG_BICUBIC);
        $blurred = $small ? imagescale($small, $w, $h, IMG_BICUBIC) : $canvas;
        if ($blurred) {
            imagesavealpha($blurred, true);
            for ($i = 0; $i < 4; $i++) {
                imagefilter($blurred, IMG_FILTER_GAUSSIAN_BLUR);
            }
        }

        $result = $blurred ?: $canvas;
        // Bake the faintness into the image: DomPDF flattens CSS opacity onto white.
        self::fade($result, $strength);

        ob_start();
        imagepng($result);

        return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
    }
}
