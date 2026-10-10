<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for the finance summary figures (offerings, donations, finance
 * overview). Each one holds every column its query reads, so MySQL scans the
 * narrow index instead of every row of a large table:
 *
 *  - offerings: basket-collection count, total and daily chart (is_collection).
 *  - donations: number of distinct donors, recurring donations.
 *  - tithes / offerings / donations: totals per fund (fund balances).
 */
return new class extends Migration
{
    private const BY_FUND = ['tithes', 'offerings', 'donations'];

    public function up(): void
    {
        Schema::table('offerings', function (Blueprint $t) {
            $t->index(['deleted_at', 'is_collection', 'offering_date', 'currency', 'amount', 'exchange_rate'], 'offerings_collections_cover_index');
        });

        Schema::table('donations', function (Blueprint $t) {
            $t->index(['deleted_at', 'donor_name'], 'donations_donor_name_index');
            $t->index(['deleted_at', 'is_recurring'], 'donations_recurring_index');
        });

        foreach (self::BY_FUND as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                $t->index(['deleted_at', 'fund_name', 'currency', 'amount', 'exchange_rate'], "{$table}_fund_totals_index");
            });
        }
    }

    public function down(): void
    {
        Schema::table('offerings', fn (Blueprint $t) => $t->dropIndex('offerings_collections_cover_index'));

        Schema::table('donations', function (Blueprint $t) {
            $t->dropIndex('donations_donor_name_index');
            $t->dropIndex('donations_recurring_index');
        });

        foreach (self::BY_FUND as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex("{$table}_fund_totals_index"));
        }
    }
};
