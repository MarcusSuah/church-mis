<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Fills a TEST database with realistic volumes so query plans and page
 * timings can be measured at 100k / 1M / 10M rows (Phase 3, Phase 9).
 *
 *   php artisan perf:seed --members=100000 --gifts=1000000
 *
 * Refuses to run in production. Inserts in batches of 1,000 with raw
 * queries (no model events), so it is fast and creates no notifications,
 * audit rows or logins.
 */
class PerfSeedCommand extends Command
{
    protected $signature = 'perf:seed
        {--members=100000 : How many members to create}
        {--gifts=1000000 : How many tithes to create (offerings and donations get a third each)}
        {--expenses=50000 : How many expenses to create}
        {--years=5 : Spread dates over this many years}';

    protected $description = 'Seed a test database with large volumes for performance testing (never production)';

    private const FIRST = ['Kwame', 'Ama', 'Kofi', 'Abena', 'Yaw', 'Akua', 'Joseph', 'Grace', 'Samuel', 'Ruth', 'Peter', 'Esther', 'Daniel', 'Mary', 'John', 'Comfort'];

    private const LAST = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Johnson', 'Kollie', 'Toe', 'Weah', 'Doe', 'Sirleaf', 'Tubman', 'Kamara', 'Kpoto', 'Flomo'];

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('perf:seed is for test databases only. It will not run when APP_ENV=production.');

            return self::FAILURE;
        }

        $members = (int) $this->option('members');
        $gifts = (int) $this->option('gifts');
        $days = max(1, (int) $this->option('years')) * 365;

        $memberIds = [];
        $this->info("Members: {$members}");
        $this->batch($members, function (int $i) use (&$memberIds) {
            $id = (string) Str::uuid();
            if (count($memberIds) < 50000) {
                $memberIds[] = $id;
            }
            $first = self::FIRST[$i % count(self::FIRST)];
            $last = self::LAST[intdiv($i, count(self::FIRST)) % count(self::LAST)];

            return ['table' => 'members', 'row' => [
                'id' => $id, 'member_id' => 'PERF-M-'.str_pad((string) $i, 8, '0', STR_PAD_LEFT),
                'first_name' => $first, 'last_name' => "{$last}{$i}", 'email' => "perf{$i}@example.test",
                'status' => ['Active', 'Active', 'Active', 'Inactive', 'Pending'][$i % 5],
                'gender' => $i % 2 ? 'Male' : 'Female', 'created_at' => now(),
            ]];
        });

        $gift = function (string $table, string $dateColumn, string $prefix) use ($memberIds, $days) {
            return function (int $i) use ($table, $dateColumn, $prefix, $memberIds, $days) {
                $row = [
                    'id' => (string) Str::uuid(),
                    'amount' => random_int(100, 50000) / 100,
                    'currency' => $i % 4 ? 'USD' : 'LRD',
                    'exchange_rate' => 190,
                    'payment_method' => ['cash', 'momo', 'bank_transfer', 'check'][$i % 4],
                    'fund_name' => 'General Fund',
                    'receipt_number' => "{$prefix}-".str_pad((string) $i, 9, '0', STR_PAD_LEFT),
                    $dateColumn => now()->subDays($i % $days)->toDateString(),
                    'created_at' => now(), 'updated_at' => now(),
                ];
                $member = $memberIds ? $memberIds[$i % count($memberIds)] : null;
                if ($table === 'donations') {
                    $row['donor_name'] = 'Donor '.$i;
                } else {
                    $row['member_name'] = 'Giver '.$i;
                }
                if ($table === 'offerings') {
                    $row['offering_type'] = 'Regular Offering';
                    $row['service_type'] = 'Sunday Worship';
                    $row['is_collection'] = $i % 3 === 0;
                }
                $row['member_id'] = $member;

                return ['table' => $table, 'row' => $row];
            };
        };

        $this->info("Tithes: {$gifts}");
        $this->batch($gifts, $gift('tithes', 'tithe_date', 'PT'));
        $this->info('Offerings: '.intdiv($gifts, 3));
        $this->batch(intdiv($gifts, 3), $gift('offerings', 'offering_date', 'PO'));
        $this->info('Donations: '.intdiv($gifts, 3));
        $this->batch(intdiv($gifts, 3), $gift('donations', 'donation_date', 'PD'));

        $expenses = (int) $this->option('expenses');
        $this->info("Expenses: {$expenses}");
        $this->batch($expenses, fn (int $i) => ['table' => 'expenses', 'row' => [
            'id' => (string) Str::uuid(), 'title' => "Expense {$i}", 'category' => ['utilities', 'maintenance', 'outreach', 'other'][$i % 4],
            'amount' => random_int(100, 500000) / 100, 'currency' => 'USD', 'exchange_rate' => 190, 'payment_method' => 'cash',
            'fund_name' => 'General Fund', 'expense_date' => now()->subDays($i % $days)->toDateString(),
            'status' => ['Paid', 'Approved', 'Pending', 'Rejected'][$i % 4], 'created_at' => now(), 'updated_at' => now(),
        ]]);

        $this->info('Done. Now run: php artisan perf:explain');

        return self::SUCCESS;
    }

    private function batch(int $count, callable $make): void
    {
        $bar = $this->output->createProgressBar($count);
        $rows = [];
        $table = null;
        for ($i = 1; $i <= $count; $i++) {
            ['table' => $table, 'row' => $rows[]] = $make($i);
            if (count($rows) === 1000) {
                DB::table($table)->insert($rows);
                $bar->advance(1000);
                $rows = [];
            }
        }
        if ($rows) {
            DB::table($table)->insert($rows);
            $bar->advance(count($rows));
        }
        $bar->finish();
        $this->newLine();
    }
}
