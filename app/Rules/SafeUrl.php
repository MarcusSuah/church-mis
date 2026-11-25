<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A link or image address that can never run script when it lands in an
 * href or src (security review, finding F). Accepts:
 *
 *  - absolute http(s) URLs            https://example.org/photo.jpg
 *  - paths on this site               /storage/uploads/x.jpg, /member-portal
 *  - in-page anchors                  #service-times
 *  - mailto: and tel: links           mailto:office@church.org
 *
 * Rejects javascript:, data:, vbscript: and every other scheme, and
 * protocol-relative "//host" addresses (which point at another site).
 */
class SafeUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value) || ! self::isSafe($value)) {
            $fail('The :attribute must be a web address (https://…) or a path on this site (/…).');
        }
    }

    public static function isSafe(string $value): bool
    {
        // Control characters and whitespace are how "java\tscript:" tricks get past checks.
        if (preg_match('/[\x00-\x20\x7F]/', $value)) {
            return false;
        }

        if (str_starts_with($value, '#')) {
            return true;
        }

        // A single leading slash is this site; "//host" or "/\host" is another site.
        if (str_starts_with($value, '/')) {
            return ! preg_match('#^/[/\\\\]#', $value);
        }

        if (preg_match('/^(mailto|tel):.+/i', $value)) {
            return true;
        }

        return preg_match('#^https?://#i', $value) === 1
            && filter_var($value, FILTER_VALIDATE_URL) !== false;
    }
}
