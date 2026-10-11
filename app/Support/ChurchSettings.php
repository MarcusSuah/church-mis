<?php

namespace App\Support;

use App\Models\ChurchSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Church profile + money settings stored in church_settings. On boot the
 * stored values are copied over config('church.*'), so everything that reads
 * config (PDFs, emails, shared props) picks up what the admin saved.
 */
class ChurchSettings
{
    public const CURRENCIES = ['USD', 'LRD'];

    /** Keys an admin can edit, with their config fallbacks. */
    public const KEYS = ['name', 'short_name', 'address', 'email', 'phone', 'logo_url', 'currency', 'exchange_rate', 'birthday_notifications', 'lock_screen_minutes', 'senior_pastor', 'church_secretary',
        // Public website
        'tagline', 'description', 'mission', 'vision', 'story', 'pastor_message', 'city', 'country',
        'service_sunday_school', 'service_sunday_worship', 'service_bible_study', 'service_prayer_meeting',
        // About page (heading and three photos with captions) and Contact page intro
        'about_heading', 'about_image_1', 'about_image_2', 'about_image_3',
        'about_caption_1', 'about_caption_2', 'about_caption_3', 'contact_intro', ];

    public static function all(): array
    {
        try {
            $stored = Cache::rememberForever('church_settings', fn () => Schema::hasTable('church_settings')
                ? ChurchSetting::pluck('value', 'key')->all() : []);
        } catch (\Throwable) {
            $stored = [];
        }

        $s = [];
        foreach (self::KEYS as $k) {
            $s[$k] = array_key_exists($k, $stored) && $stored[$k] !== null && $stored[$k] !== '' ? $stored[$k] : config("church.{$k}");
        }
        $s['currency'] = in_array(strtoupper((string) $s['currency']), self::CURRENCIES, true) ? strtoupper($s['currency']) : 'USD';
        $s['exchange_rate'] = max(0.0001, (float) ($s['exchange_rate'] ?: 190));
        $s['lock_screen_minutes'] = max(0, min(480, (int) ($s['lock_screen_minutes'] ?? 10)));
        $s['birthday_notifications'] = filter_var($s['birthday_notifications'] ?? true, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? true;

        return $s;
    }

    public static function save(array $values): void
    {
        foreach ($values as $k => $v) {
            if (in_array($k, self::KEYS, true)) {
                ChurchSetting::updateOrCreate(['key' => $k], ['value' => is_bool($v) ? ($v ? '1' : '0') : $v]);
            }
        }
        Cache::forget('church_settings');
        self::apply();
    }

    /** Copy stored settings onto config('church.*'). */
    public static function apply(): void
    {
        foreach (self::all() as $k => $v) {
            config(["church.{$k}" => $v]);
        }
    }
}
