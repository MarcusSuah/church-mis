<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Caches whole-table figures (record counts, all-time totals) that list pages
 * show above the table. On large tables these scan every row, so they are
 * computed once and reused until a record of that model changes.
 *
 * Invalidation: models call StatsCache::flush() when saved, deleted or
 * restored (see RecordsMoney), which bumps a version number in the key.
 * Totals depend on the base currency and exchange rate, so both are part of
 * the key as well. Only figures that are the same for every viewer belong here.
 */
final class StatsCache
{
    private const TTL_SECONDS = 3600;

    /**
     * @template TValue
     *
     * @param  class-string  $model
     * @param  Closure(): TValue  $compute
     * @return TValue
     */
    public static function remember(string $model, string $key, Closure $compute): mixed
    {
        $version = (int) Cache::get(self::versionKey($model), 0);
        $money = Money::base().':'.Money::rate();

        return Cache::remember("stats:{$model}:v{$version}:{$money}:{$key}", self::TTL_SECONDS, $compute);
    }

    /** @param  class-string  $model */
    public static function flush(string $model): void
    {
        $key = self::versionKey($model);
        if (! Cache::add($key, 1)) {
            Cache::increment($key);
        }
    }

    /** @param  class-string  $model */
    private static function versionKey(string $model): string
    {
        return "stats-version:{$model}";
    }
}
