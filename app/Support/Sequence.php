<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Gap-tolerant, race-free counters (Phase 3, F06 and F11).
 *
 * Receipt numbers, Member IDs and registration references used to be worked
 * out as MAX(existing) + 1, so two people saving at the same moment got the
 * same number, and string MAX broke after 9999. Each counter is now one row
 * in `sequences`, incremented under a row lock inside a transaction.
 *
 * The first time a counter is used, $initial() supplies the highest number
 * already in use, so existing numbering simply continues.
 */
class Sequence
{
    /** @param  callable(): int  $initial */
    public static function next(string $name, callable $initial): int
    {
        return DB::transaction(function () use ($name, $initial) {
            $row = DB::table('sequences')->where('name', $name)->lockForUpdate()->first();

            if (! $row) {
                DB::table('sequences')->insertOrIgnore([
                    'name' => $name,
                    'value' => max(0, (int) $initial()),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $row = DB::table('sequences')->where('name', $name)->lockForUpdate()->first();
            }

            $next = (int) $row->value + 1;
            DB::table('sequences')->where('name', $name)->update(['value' => $next, 'updated_at' => now()]);

            return $next;
        }, 3);
    }

    /** Highest number after $prefix among the values of $column in $tables (e.g. REC-2026-0042 → 42). */
    public static function highestIn(array $tables, string $column, string $prefix): int
    {
        $max = 0;
        foreach ($tables as $table) {
            DB::table($table)->where($column, 'like', $prefix.'%')->orderBy($column)
                ->select($column)->lazy(1000)->each(function ($row) use ($column, $prefix, &$max) {
                    $tail = substr((string) $row->{$column}, strlen($prefix));
                    if (ctype_digit($tail)) {
                        $max = max($max, (int) $tail);
                    }
                });
        }

        return $max;
    }
}
