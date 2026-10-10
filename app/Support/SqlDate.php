<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Date expressions that differ between MySQL/MariaDB (production) and
 * SQLite (tests). Column names passed in come from code only, never input.
 */
final class SqlDate
{
    /** "YYYY-MM" for a date or datetime column. */
    public static function yearMonth(string $column): string
    {
        return self::isSqlite()
            ? "strftime('%Y-%m', {$column})"
            : "DATE_FORMAT({$column}, '%Y-%m')";
    }

    /** Month * 100 + day (e.g. 1231 for 31 December) for a date column. */
    public static function monthDay(string $column): string
    {
        return self::isSqlite()
            ? "(CAST(strftime('%m', {$column}) AS INTEGER) * 100 + CAST(strftime('%d', {$column}) AS INTEGER))"
            : "(MONTH({$column}) * 100 + DAY({$column}))";
    }

    private static function isSqlite(): bool
    {
        return DB::connection()->getDriverName() === 'sqlite';
    }
}
