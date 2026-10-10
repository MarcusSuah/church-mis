<?php

namespace App\Support;

/**
 * Vector ornaments for the certificate templates, returned as SVG data URIs
 * so DomPDF can draw them without any image files.
 */
class CertificateArt
{
    private static function uri(string $svg): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    /** Scroll-work corner ornament (top-left orientation; rotate with $flip). */
    public static function corner(string $c = '#3f4f9a', string $flip = ''): string
    {
        $t = match ($flip) {
            'tr' => 'translate(120,0) scale(-1,1)',
            'bl' => 'translate(0,120) scale(1,-1)',
            'br' => 'translate(120,120) scale(-1,-1)',
            default => '',
        };

        return self::uri(<<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
<g transform="{$t}" fill="none" stroke="{$c}" stroke-width="2.4" stroke-linecap="round">
  <path d="M8 112 L8 8 L112 8"/>
  <path d="M16 96 L16 16 L96 16" stroke-width="1.2"/>
  <path d="M8 8 C30 22 34 34 22 44 C14 50 8 42 14 36 C20 30 30 36 28 48"/>
  <path d="M8 8 C22 30 34 34 44 22 C50 14 42 8 36 14 C30 20 36 30 48 28"/>
  <path d="M60 8 C66 18 74 18 80 8 M8 60 C18 66 18 74 8 80"/>
  <path d="M100 8 C104 2 110 4 112 8 M8 100 C2 104 4 110 8 112"/>
</g>
<g transform="{$t}" fill="{$c}">
  <circle cx="22" cy="22" r="4"/><circle cx="34" cy="10" r="2.4"/><circle cx="10" cy="34" r="2.4"/>
  <circle cx="70" cy="14" r="2"/><circle cx="14" cy="70" r="2"/>
  <path d="M40 40 C48 34 56 38 54 46 C52 54 44 52 40 40 Z"/>
</g>
</svg>
SVG);
    }

    public static function cross(string $c = '#7b84a8'): string
    {
        return self::uri(<<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="80" viewBox="0 0 60 80">
<path d="M24 4 H36 V24 H56 V36 H36 V76 H24 V36 H4 V24 H24 Z" fill="none" stroke="{$c}" stroke-width="2.5"/>
<path d="M27 8 H33 V27 H52 V33 H33 V72 H27 V33 H8 V27 H27 Z" fill="{$c}" opacity="0.35"/>
<circle cx="30" cy="30" r="5" fill="{$c}"/>
</svg>
SVG);
    }

    /** Gold crucifix-style cross for the "Royal" template. */
    public static function goldCross(): string
    {
        return self::uri(<<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" viewBox="0 0 60 90">
<path d="M25 2 H35 V24 H58 V34 H35 V88 H25 V34 H2 V24 H25 Z" fill="#c9a227" stroke="#8a6d12" stroke-width="1.5"/>
<path d="M28 6 H32 V27 H54 V31 H32 V84 H28 V31 H6 V27 H28 Z" fill="#f1d77a"/>
<circle cx="30" cy="29" r="6" fill="#8a6d12"/>
</svg>
SVG);
    }

    /** Simple dove carrying an olive branch (facing right; mirror with $flip). */
    public static function dove(string $c = '#3f4f9a', bool $flip = false): string
    {
        $t = $flip ? 'translate(140,0) scale(-1,1)' : '';

        return self::uri(<<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="140" height="110" viewBox="0 0 140 110">
<g transform="{$t}" fill="none" stroke="{$c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 30 C30 20 52 30 62 48 C70 40 84 38 96 44 C104 40 112 42 118 48 L108 52 C106 66 92 80 70 82 C50 84 34 76 24 64 C30 64 38 62 44 58 C30 56 18 46 10 30 Z"/>
  <path d="M18 34 C30 36 40 44 46 54"/>
  <path d="M26 30 C36 34 46 42 52 52"/>
  <path d="M70 82 L60 100 M78 82 L76 102"/>
  <path d="M118 48 C124 50 128 56 130 64"/>
  <path d="M122 56 C128 52 134 54 136 58 M126 62 C132 62 134 66 134 70"/>
</g>
<circle cx="108" cy="47" r="2" fill="{$c}"/>
</svg>
SVG);
    }

    /** Blue rosette with gold rim and ribbon tails. */
    public static function seal(): string
    {
        $points = [];
        for ($i = 0; $i < 48; $i++) {
            $r = $i % 2 ? 46 : 50;
            $a = deg2rad($i * 7.5);
            $points[] = round(60 + $r * cos($a), 1).','.round(56 + $r * sin($a), 1);
        }
        $star = implode(' ', $points);

        return self::uri(<<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="170" viewBox="0 0 120 170">
<polygon points="34,90 18,166 38,152 52,170 62,96" fill="#1d4ed8"/>
<polygon points="86,90 102,166 82,152 68,170 58,96" fill="#1e3a8a"/>
<polygon points="{$star}" fill="#1e40af"/>
<circle cx="60" cy="56" r="38" fill="#c9a227"/>
<circle cx="60" cy="56" r="33" fill="#2563eb"/>
<circle cx="60" cy="56" r="27" fill="#1e3a8a"/>
<circle cx="60" cy="56" r="27" fill="none" stroke="#f1d77a" stroke-width="2"/>
<path d="M44 46 C50 38 70 38 76 46" fill="none" stroke="#93c5fd" stroke-width="3" stroke-linecap="round"/>
</svg>
SVG);
    }

    /** Blue + gold sweep for the corners of the "Royal" template. */
    public static function sweep(bool $bottomLeft = false): string
    {
        $t = $bottomLeft ? 'translate(260,200) scale(-1,-1)' : '';

        return self::uri(<<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="200" viewBox="0 0 260 200">
<g transform="{$t}">
  <path d="M60 0 H260 V200 C230 120 170 40 60 0 Z" fill="#1e3a8a"/>
  <path d="M110 0 H260 V150 C236 90 186 30 110 0 Z" fill="#2563eb"/>
  <path d="M60 0 C170 40 230 120 260 200 L260 186 C226 112 166 38 74 0 Z" fill="#c9a227"/>
  <path d="M150 0 H260 V100 C240 56 204 20 150 0 Z" fill="#1d4ed8"/>
</g>
</svg>
SVG);
    }

    /** Gold laurel sprig used by the "Heritage" template. */
    public static function laurel(bool $flip = false): string
    {
        $t = $flip ? 'translate(120,0) scale(-1,1)' : '';
        $leaves = '';
        for ($i = 0; $i < 7; $i++) {
            $y = 14 + $i * 12;
            $x = 60 - $i * 5;
            $leaves .= "<ellipse cx='".($x - 10)."' cy='{$y}' rx='9' ry='4' transform='rotate(-35 ".($x - 10)." {$y})'/>";
            $leaves .= "<ellipse cx='".($x + 8)."' cy='".($y + 5)."' rx='9' ry='4' transform='rotate(35 ".($x + 8).' '.($y + 5).")'/>";
        }

        return self::uri("<svg xmlns='http://www.w3.org/2000/svg' width='120' height='110' viewBox='0 0 120 110'><g transform='{$t}'><path d='M64 6 C50 40 40 70 28 104' fill='none' stroke='#a8841c' stroke-width='2'/><g fill='#c9a227'>{$leaves}</g></g></svg>");
    }
}
