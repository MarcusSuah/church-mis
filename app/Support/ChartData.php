<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Chart series for the finance dashboards and reports, aggregated in SQL so
 * only one row per period or group reaches PHP.
 *
 * Every method returns plain arrays: results are cached in StatsCache, and
 * the cache refuses to rebuild objects (cache.serializable_classes = false).
 */
final class ChartData
{
    /** Spans longer than this are charted per year instead of per month. */
    private const MAX_MONTHS = 24;

    /**
     * The periods between two dates: every month, or every year for long spans.
     *
     * @return array{yearly: bool, buckets: array<string, string>} bucket key => label
     */
    public static function periods(CarbonInterface $from, CarbonInterface $to): array
    {
        $start = CarbonImmutable::parse($from)->startOfMonth();
        $end = CarbonImmutable::parse($to)->startOfMonth();
        $yearly = $start->diffInMonths($end) >= self::MAX_MONTHS;

        $buckets = [];
        for ($d = $yearly ? $start->startOfYear() : $start; $d->lte($end); $d = $yearly ? $d->addYear() : $d->addMonth()) {
            $buckets[$d->format($yearly ? 'Y' : 'Y-m')] = $d->format($yearly ? 'Y' : 'M Y');
        }

        return ['yearly' => $yearly, 'buckets' => $buckets];
    }

    /**
     * The last N months up to the end of this month.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public static function lastMonths(int $months = 12): array
    {
        $now = CarbonImmutable::now();

        return [$now->subMonthsNoOverflow($months - 1)->startOfMonth(), $now->endOfMonth()];
    }

    /**
     * One aggregate per period (e.g. "sum(amount)" or "count(*)").
     *
     * @param  string  $dateColumn  column name from code, never from input
     * @param  string  $aggregateSql  SQL from code, never from input
     * @return array<string, float> bucket key => value
     */
    public static function perPeriod(Builder|QueryBuilder $query, string $dateColumn, string $aggregateSql, bool $yearly): array
    {
        $bucket = $yearly ? SqlDate::year($dateColumn) : SqlDate::yearMonth($dateColumn);
        $base = $query instanceof Builder ? $query->toBase() : $query;

        return $base->selectRaw("{$bucket} as bucket, {$aggregateSql} as total")
            ->groupByRaw($bucket)
            ->pluck('total', 'bucket')
            ->mapWithKeys(fn ($total, $bucket) => [(string) $bucket => round((float) $total, 2)])
            ->all();
    }

    /**
     * Rows for a time-series chart: one row per period with a value for each
     * series, zero where a period has no records.
     *
     * @param  array<string, string>  $buckets  bucket key => label (from periods())
     * @param  array<string, array<string, float>>  $series  series name => perPeriod() result
     * @return list<array<string, string|float>>
     */
    public static function timeline(array $buckets, array $series): array
    {
        $rows = [];
        foreach ($buckets as $key => $label) {
            $row = ['period' => $key, 'label' => $label];
            foreach ($series as $name => $values) {
                $row[$name] = $values[$key] ?? 0.0;
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * One aggregate per value of a column, biggest first. Groups past $limit
     * are added together as "Other" so pie charts stay readable.
     *
     * @param  string  $column  column name from code, never from input
     * @param  string  $aggregateSql  SQL from code, never from input
     * @param  (callable(string): string)|null  $label  turns a stored value into a display label
     * @return list<array{label: string, value: float}>
     */
    public static function byColumn(Builder|QueryBuilder $query, string $column, string $aggregateSql, int $limit = 6, ?callable $label = null): array
    {
        $base = $query instanceof Builder ? $query->toBase() : $query;
        $rows = $base->selectRaw("{$column} as grp, {$aggregateSql} as total")
            ->groupBy($column)
            ->orderByDesc('total')
            ->get();

        $label ??= fn (string $value) => $value;
        $data = $rows->take($limit)->map(fn ($r) => [
            'label' => filled($r->grp) ? $label((string) $r->grp) : 'Not recorded',
            'value' => round((float) $r->total, 2),
        ])->values()->all();

        $rest = round((float) $rows->skip($limit)->sum('total'), 2);
        if ($rest > 0) {
            $data[] = ['label' => 'Other', 'value' => $rest];
        }

        return $data;
    }

    /** "bank_transfer" → "Bank Transfer", "momo" → "Mobile Money". */
    public static function headline(string $value): string
    {
        return $value === 'momo' ? 'Mobile Money' : str($value)->replace('_', ' ')->title()->toString();
    }
}
