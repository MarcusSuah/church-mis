<?php

namespace App\Console\Commands;

use App\Models\Donation;
use App\Models\Expense;
use App\Models\Offering;
use App\Models\Tithe;
use App\Support\StatsCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Removes the load-test rows that `perf:seed` inserted, and nothing else.
 * Only rows carrying perf:seed's markers are touched:
 *
 *   members    member_id LIKE 'PERF-M-%'
 *   tithes     receipt_number LIKE 'PT-%'
 *   offerings  receipt_number LIKE 'PO-%'
 *   donations  receipt_number LIKE 'PD-%'
 *   expenses   title "Expense <n>", General Fund, cash, USD at rate 190
 *
 *   php artisan perf:purge          # shows what would be deleted
 *   php artisan perf:purge --force  # deletes it
 *
 * Refuses to run in production. Deletes in batches so the database stays responsive.
 */
class PerfPurgeCommand extends Command
{
    protected $signature = 'perf:purge {--force : Delete the rows instead of only counting them}';

    protected $description = 'Remove the load-test data created by perf:seed (never production)';

    private const BATCH = 5000;

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('perf:purge will not run when APP_ENV=production.');

            return self::FAILURE;
        }

        $targets = [
            'tithes' => fn () => DB::table('tithes')->where('receipt_number', 'like', 'PT-%'),
            'offerings' => fn () => DB::table('offerings')->where('receipt_number', 'like', 'PO-%'),
            'donations' => fn () => DB::table('donations')->where('receipt_number', 'like', 'PD-%'),
            'expenses' => fn () => DB::table('expenses')
                ->where('title', 'like', 'Expense %')
                ->where('fund_name', 'General Fund')->where('payment_method', 'cash')
                ->where('currency', 'USD')->where('exchange_rate', 190)
                ->whereRaw("title REGEXP '^Expense [0-9]+$'"),
            'members' => fn () => DB::table('members')->where('member_id', 'like', 'PERF-M-%'),
        ];

        $counts = array_map(fn ($query) => $query()->count(), $targets);
        $this->table(['Table', 'Load-test rows'], collect($counts)->map(fn ($n, $t) => [$t, number_format($n)])->values()->all());

        if (! $this->option('force')) {
            $this->info('Nothing deleted. Run with --force to remove these rows.');

            return self::SUCCESS;
        }

        foreach ($targets as $table => $query) {
            $deleted = 0;
            do {
                $ids = $query()->limit(self::BATCH)->pluck('id');
                $deleted += $ids->isEmpty() ? 0 : DB::table($table)->whereIn('id', $ids)->delete();
            } while ($ids->isNotEmpty());
            $this->line("{$table}: deleted ".number_format($deleted));
        }

        foreach ([Tithe::class, Offering::class, Donation::class, Expense::class] as $model) {
            StatsCache::flush($model);
        }
        Cache::forget('birthdays-today:'.now()->toDateString());

        $this->info('Load-test data removed. Run "php artisan optimize:clear" if pages still show old totals.');

        return self::SUCCESS;
    }
}
