<?php

namespace App\Support;

use App\Models\Member;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/** Member birthdays: who is celebrating soon, and the daily admin reminder. */
class Birthdays
{
    /**
     * Members whose next birthday falls within $days (0 = today only).
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function upcoming(int $days = 30): Collection
    {
        $today = CarbonImmutable::today();
        $monthDays = self::monthDaysWithin($today, $days);

        return Member::query()
            ->whereNotNull('date_of_birth')
            ->whereNotIn('status', ['Inactive', 'Deceased', 'Rejected', 'Pending'])
            // Only members whose birthday (month + day) falls in the window leave the database.
            ->whereRaw(SqlDate::monthDay('date_of_birth').' in ('.implode(',', array_fill(0, count($monthDays), '?')).')', $monthDays)
            ->get(['id', 'first_name', 'last_name', 'middle_name', 'date_of_birth', 'email', 'phone', 'department', 'photo_url', 'user_id', 'status'])
            ->map(function (Member $m) use ($today) {
                $dob = CarbonImmutable::parse($m->date_of_birth);
                // 29 Feb birthdays are celebrated on 28 Feb in non-leap years.
                $next = self::onYear($dob, $today->year);
                if ($next->lt($today)) {
                    $next = self::onYear($dob, $today->year + 1);
                }

                return [
                    'id' => $m->id,
                    'name' => $m->full_name,
                    'first_name' => $m->first_name,
                    'initials' => $m->initials,
                    'photo_url' => $m->photo_url,
                    'department' => $m->department,
                    'email' => $m->email,
                    'has_account' => (bool) $m->user_id,
                    'date_of_birth' => $dob->toDateString(),
                    'next_birthday' => $next->toDateString(),
                    'days_until' => (int) $today->diffInDays($next),
                    'turning' => $next->year - $dob->year,
                ];
            })
            ->filter(fn ($b) => $b['days_until'] <= $days)
            ->sortBy([['days_until', 'asc'], ['name', 'asc']])
            ->values();
    }

    /**
     * Month * 100 + day for every date from $today through $days days later.
     * 29 February is included when 28 February is in range of a non-leap year.
     *
     * @return list<int>
     */
    private static function monthDaysWithin(CarbonImmutable $today, int $days): array
    {
        $values = [];
        foreach (range(0, max(0, min($days, 366))) as $offset) {
            $date = $today->addDays($offset);
            $values[] = $date->month * 100 + $date->day;
            if ($date->month === 2 && $date->day === 28 && ! $date->isLeapYear()) {
                $values[] = 229;
            }
        }

        return array_values(array_unique($values));
    }

    private static function onYear(CarbonImmutable $dob, int $year): CarbonImmutable
    {
        $day = ($dob->month === 2 && $dob->day === 29 && ! checkdate(2, 29, $year)) ? 28 : $dob->day;

        return CarbonImmutable::create($year, $dob->month, $day)->startOfDay();
    }

    /**
     * Tell staff about today's birthdays — at most once per day. Called by the
     * scheduler (members:birthdays) and, as a fallback, when the dashboard loads.
     */
    public static function notifyStaff(bool $force = false): int
    {
        if (! config('church.birthday_notifications', true)) {
            return 0;
        }
        $key = 'birthday-notice:'.now()->toDateString();
        if (! $force && Cache::has($key)) {
            return 0;
        }
        Cache::put($key, true, now()->endOfDay());

        $today = self::upcoming(0);
        if ($today->isEmpty()) {
            return 0;
        }

        $names = $today->map(fn ($b) => "{$b['name']} ({$b['turning']})")->implode(', ');
        Notifier::staff(
            $today->count() === 1 ? '🎂 Birthday today' : "🎂 {$today->count()} birthdays today",
            "Celebrating today: {$names}. Send them a birthday message.",
            'info',
            '/birthdays'
        );

        return $today->count();
    }
}
