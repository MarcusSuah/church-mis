<?php

namespace App\Enums;

enum ServiceType: string
{
    case SundayWorship = 'sunday_worship';
    case BibleStudy = 'bible_study';
    case PrayerMeeting = 'prayer_meeting';
    case Revival = 'revival';

    public function label(): string
    {
        return match ($this) {
            self::SundayWorship => 'Sunday Worship',
            self::BibleStudy => 'Bible Study',
            self::PrayerMeeting => 'Prayer Meeting',
            self::Revival => 'Revival',
        };
    }
}
