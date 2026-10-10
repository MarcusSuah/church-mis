<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3, F06 — financial records keep their history.
 *
 *  1. exchange_rate on tithes, offerings, donations and expenses: the
 *     LRD-per-USD rate when the row was saved. Existing rows are stamped
 *     with the rate configured today (the true historical rate was never
 *     stored); from now on each new row keeps its own.
 *  2. Soft deletes on the same four tables.
 *  3. Unique receipt numbers per table. Duplicates made by the old
 *     MAX()+1 race are renamed REC-2026-0042-D2, -D3… first, and logged.
 *  4. One index per table on (deleted_at, date, id). With soft deletes every
 *     query has "deleted_at IS NULL", so this single index serves the list
 *     pages (newest first, no sort step) and the date-range totals.
 */
return new class extends Migration
{
    private const TABLES = [
        'tithes' => 'tithe_date',
        'offerings' => 'offering_date',
        'donations' => 'donation_date',
        'expenses' => 'expense_date',
    ];

    private const RECEIPT_TABLES = ['tithes', 'offerings', 'donations'];

    public function up(): void
    {
        $rate = $this->currentRate();

        foreach (self::TABLES as $table => $dateColumn) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                if (! Schema::hasColumn($table, 'exchange_rate')) {
                    $t->decimal('exchange_rate', 18, 6)->nullable()->after('currency');
                }
                if (! Schema::hasColumn($table, 'deleted_at')) {
                    $t->softDeletes();
                }
            });

            DB::table($table)->whereNull('exchange_rate')->update(['exchange_rate' => $rate]);

            Schema::table($table, function (Blueprint $t) use ($table, $dateColumn) {
                $t->index(['deleted_at', $dateColumn, 'id'], "{$table}_live_date_index");
            });
        }

        Schema::table('expenses', fn (Blueprint $t) => $t->index(['status', 'expense_date']));

        foreach (self::RECEIPT_TABLES as $table) {
            DB::table($table)->where('receipt_number', '')->update(['receipt_number' => null]);
            $this->renameDuplicateReceipts($table);
            Schema::table($table, fn (Blueprint $t) => $t->unique('receipt_number'));
        }
    }

    public function down(): void
    {
        foreach (self::RECEIPT_TABLES as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropUnique(['receipt_number']));
        }
        Schema::table('expenses', fn (Blueprint $t) => $t->dropIndex(['status', 'expense_date']));

        foreach (array_keys(self::TABLES) as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex("{$table}_live_date_index"));
            Schema::table($table, function (Blueprint $t) {
                $t->dropSoftDeletes();
                $t->dropColumn('exchange_rate');
            });
        }
    }

    private function renameDuplicateReceipts(string $table): void
    {
        $duplicates = DB::table($table)->select('receipt_number')->whereNotNull('receipt_number')
            ->groupBy('receipt_number')->havingRaw('count(*) > 1')->pluck('receipt_number');

        foreach ($duplicates as $receipt) {
            $rows = DB::table($table)->where('receipt_number', $receipt)->orderBy('created_at')->orderBy('id')->pluck('id');
            foreach ($rows->slice(1)->values() as $i => $id) {
                $new = $receipt.'-D'.($i + 2);
                DB::table($table)->where('id', $id)->update(['receipt_number' => $new]);
                Log::warning("Duplicate receipt number {$receipt} in {$table} renamed to {$new}", ['id' => $id]);
            }
        }
    }

    private function currentRate(): float
    {
        $stored = Schema::hasTable('church_settings')
            ? DB::table('church_settings')->where('key', 'exchange_rate')->value('value')
            : null;

        return max(0.0001, (float) ($stored ?: config('church.exchange_rate', 190)));
    }
};
