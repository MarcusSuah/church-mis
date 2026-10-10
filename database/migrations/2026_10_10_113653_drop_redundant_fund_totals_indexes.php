<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The (deleted_at, fund_name, ...) indexes are covered by *_period_totals_index,
 * and MySQL was choosing them for date-range totals, which then read every live
 * row. Dropping them lets date-range sums use the period index.
 */
return new class extends Migration
{
    private const TABLES = ['tithes', 'offerings', 'donations'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex("{$table}_fund_totals_index"));
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->index(['deleted_at', 'fund_name', 'currency', 'amount', 'exchange_rate'], "{$table}_fund_totals_index"));
        }
    }
};
