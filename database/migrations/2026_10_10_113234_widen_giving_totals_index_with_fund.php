<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds fund_name to the giving totals covering index, so period totals per
 * fund (finance overview: year-to-date fund balances; reports: income by fund)
 * are read from the index alone instead of every matching row.
 */
return new class extends Migration
{
    /** @var array<string, string> table => date column */
    private const GIVING = [
        'tithes' => 'tithe_date',
        'offerings' => 'offering_date',
        'donations' => 'donation_date',
    ];

    public function up(): void
    {
        foreach (self::GIVING as $table => $date) {
            Schema::table($table, function (Blueprint $t) use ($table, $date) {
                $t->index(['deleted_at', $date, 'currency', 'amount', 'exchange_rate', 'fund_name'], "{$table}_period_totals_index");
            });
            // The narrower index is now a prefix of the new one.
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex("{$table}_totals_cover_index"));
        }
    }

    public function down(): void
    {
        foreach (self::GIVING as $table => $date) {
            Schema::table($table, function (Blueprint $t) use ($table, $date) {
                $t->index(['deleted_at', $date, 'currency', 'amount', 'exchange_rate'], "{$table}_totals_cover_index");
            });
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex("{$table}_period_totals_index"));
        }
    }
};
