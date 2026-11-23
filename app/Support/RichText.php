<?php

namespace App\Support;

use Stevebauman\Purify\Facades\Purify;

class RichText
{
    public static function clean(?string $html): ?string
    {
        if (blank($html)) {
            return null;
        }

        $clean = trim(Purify::clean($html));
        $text = html_entity_decode(strip_tags($clean), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/[\s\x{00A0}]+/u', ' ', $text)) === '' ? null : $clean;
    }
}