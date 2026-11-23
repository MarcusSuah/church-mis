<?php

namespace App\Enums;

enum ServiceType: string
{
    case SundayWorship = 'sunday_worship';
    case BibleStudy = 'bible_study';
    case PrayerMeeting = 'prayer_meeting';
    case Revival = 'revival';
    case SpecialService = 'special_service';
    case YouthService = 'youth_service';

    public function label(): string
    {
        return match ($this) {
            self::SundayWorship => 'Sunday Worship',
            self::BibleStudy => 'Bible Study',
            self::PrayerMeeting => 'Prayer Meeting',
            self::Revival => 'Revival',
            self::SpecialService => 'Special Service',
            self::YouthService => 'Youth Service',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $type) => [
                $type->value => $type->label(),
            ])
            ->all();
    }
}