<?php

namespace App\Support;

/**
 * Two currencies: USD and LRD. Each record keeps the currency it was paid
 * in; totals are converted to the church's default ("base") currency with
 * the exchange rate from Church Settings (LRD per 1 USD).
 */
class Money
{
    public static function base(): string
    {
        return config('church.currency', 'USD') === 'LRD' ? 'LRD' : 'USD';
    }

    public static function other(): string
    {
        return self::base() === 'USD' ? 'LRD' : 'USD';
    }

    /** LRD per 1 USD. */
    public static function rate(): float
    {
        return max(0.0001, (float) config('church.exchange_rate', 190));
    }

    /**
     * Convert between USD and LRD. $rate is LRD per 1 USD; pass the rate
     * stored on a record so history keeps the rate of its day (Phase 3, F06).
     * Without one, today's rate from Church Settings is used.
     */
    public static function convert(float $amount, string $from, ?string $to = null, ?float $rate = null): float
    {
        $to ??= self::base();
        if ($from === $to) {
            return $amount;
        }
        $rate = $rate !== null && $rate > 0 ? $rate : self::rate();

        return $from === 'USD' ? $amount * $rate : $amount / $rate;
    }

    public static function toBase(float $amount, ?string $currency, ?float $rate = null): float
    {
        return self::convert($amount, $currency ?: self::base(), null, $rate);
    }

    /**
     * SQL expression: amount converted to the base currency.
     * $rateColumn: the per-row stored rate (null for tables that have none,
     * such as fund targets and budgets, which are plans rather than history).
     * Only column names from code reach this — never user input.
     */
    public static function sql(string $amount = 'amount', string $currency = 'currency', ?string $rateColumn = 'exchange_rate'): string
    {
        $current = number_format(self::rate(), 6, '.', '');
        $rate = $rateColumn ? "COALESCE(NULLIF({$rateColumn}, 0), {$current})" : $current;

        return self::base() === 'USD'
            ? "(CASE WHEN {$currency} = 'LRD' THEN {$amount} / {$rate} ELSE {$amount} END)"
            : "(CASE WHEN {$currency} = 'USD' THEN {$amount} * {$rate} ELSE {$amount} END)";
    }

    /** SUM(...) in base currency for a query builder. */
    public static function sum($query, string $amount = 'amount', ?string $rateColumn = 'exchange_rate'): float
    {
        return round((float) $query->sum(\Illuminate\Support\Facades\DB::raw(self::sql($amount, 'currency', $rateColumn))), 2);
    }

    public static function format(float $amount, ?string $currency = null): string
    {
        $currency ??= self::base();

        return ($amount < 0 ? '-' : '').($currency === 'LRD' ? 'L$' : '$').number_format(abs($amount), 2);
    }

    /** "$1,200.00 (≈ L$228,000.00)" */
    public static function dual(float $baseAmount): string
    {
        return self::format($baseAmount).' (≈ '.self::format(self::convert($baseAmount, self::base(), self::other()), self::other()).')';
    }
}
