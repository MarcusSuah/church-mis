<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Covering indexes for the giving totals and member counts that the
 * dashboard, finance pages and reports run on every load.
 *
 *  - Giving: WHERE deleted_at IS NULL AND <date> BETWEEN ? AND ?, then
 *    SUM(amount converted with currency/exchange_rate). With every column in
 *    the index, MySQL reads only the index instead of each table row.
 *  - Members: WHERE status IN (...) with created_at / date_joined (new this
 *    month, membership growth) and date_of_birth (birthdays).
 */
return new class extends Migration
{
    /** @var array<string, string> table => date column */
    private const GIVING = [
        'tithes' => 'tithe_date',
        'offerings' => 'offering_date',
        'donations' => 'donation_date',
        'expenses' => 'expense_date',
    ];

    public function up(): void
    {
        foreach (self::GIVING as $table => $date) {
            Schema::table($table, function (Blueprint $t) use ($table, $date) {
                $t->index(['deleted_at', $date, 'currency', 'amount', 'exchange_rate'], "{$table}_totals_cover_index");
            });
        }

        Schema::table('members', function (Blueprint $t) {
            $t->index(['status', 'created_at', 'date_joined'], 'members_status_joined_index');
            $t->index(['status', 'date_of_birth'], 'members_status_birth_index');
        });
    }

    public function down(): void
    {
        foreach (array_keys(self::GIVING) as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex("{$table}_totals_cover_index"));
        }

        Schema::table('members', function (Blueprint $t) {
            $t->dropIndex('members_status_joined_index');
            $t->dropIndex('members_status_birth_index');
        });
    }
};
