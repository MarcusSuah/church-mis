<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\Member;
use App\Models\Notification;
use App\Models\Tithe;
use App\Models\User;
use App\Support\Money;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Shows how the database runs the busiest queries, and how long they take
 * (Phase 3). Run it on a staging copy after `perf:seed` or on a copy of
 * production data:
 *
 *   php artisan perf:explain
 *   php artisan perf:explain --runs=5 --search=kof
 *
 * MySQL / MariaDB: prints EXPLAIN. Look at the "key" column — it should name
 * an index — and "rows", which should be small. "type = ALL" means a full
 * table scan, which is only fine on tiny tables.
 * SQLite: prints EXPLAIN QUERY PLAN. "SEARCH ... USING INDEX" is good;
 * "SCAN <table>" without an index means every row is read.
 *
 * Read-only: it never changes data.
 */
class PerfExplainCommand extends Command
{
    protected $signature = 'perf:explain
        {--runs=3 : Run each query this many times and report the median}
        {--search=kof : Search term for the member search query}
        {--plans : Print the full plan for every query, not only the summary}';

    protected $description = 'EXPLAIN and time the busiest queries (member search, finance lists and totals, notification bell, audit log)';

    public function handle(): int
    {
        $driver = DB::connection()->getDriverName();
        $this->info("Database driver: {$driver}");
        $this->line('Rows: members '.Member::count().', tithes '.Tithe::count().', expenses '.Expense::count().', notifications '.Notification::count());
        $this->newLine();

        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateTimeString();
        $user = User::query()->orderBy('id')->first();

        $queries = [
            'Tithes page (latest 20)' => fn () => Tithe::query()->orderByDesc('tithe_date')->orderByDesc('id')->limit(20),
            'Tithes count for pagination' => fn () => Tithe::query()->selectRaw('count(*) as aggregate'),
            'Tithes total this month (base currency)' => fn () => Tithe::query()->whereBetween('tithe_date', [$monthStart, $monthEnd])
                ->selectRaw('SUM('.Money::sql().') as total'),
            'Expenses pending, newest first' => fn () => Expense::query()->where('status', 'Pending')->orderByDesc('expense_date')->limit(20),
            'Member search "'.$this->option('search').'"' => fn () => Member::query()->search((string) $this->option('search'))
                ->orderBy('last_name')->limit(20),
            'Members list (Active, by name)' => fn () => Member::query()->where('status', 'Active')->orderBy('last_name')->orderBy('first_name')->limit(20),
            'Audit log (Finance, newest first)' => fn () => AuditLog::query()->where('module', 'Finance')->orderByDesc('created_at')->limit(25),
        ];

        if ($user) {
            $queries["Notification bell (user {$user->id})"] = fn () => Notification::query()->visibleTo($user)->latest('sent_at')->latest()->limit(8);
        } else {
            $this->warn('No users yet, so the notification bell query is skipped.');
        }

        $rows = [];
        foreach ($queries as $label => $make) {
            /** @var Builder $query */
            $query = $make();
            $plan = $this->plan($driver, $query);
            $rows[] = [$label, $this->time($query), $this->summary($driver, $plan)];

            if ($this->option('plans')) {
                $this->line("<comment>{$label}</comment>");
                $this->line($query->toRawSql());
                if ($plan) {
                    $this->table(array_keys($plan[0]), $plan);
                }
                $this->newLine();
            }
        }

        $this->table(['Query', 'Median ms', 'Plan'], $rows);
        $this->line('A plan that reads every row (SCAN / type=ALL / no key) on a large table needs an index. Run with --plans for detail.');

        return self::SUCCESS;
    }

    /** @return list<array<string, mixed>> */
    private function plan(string $driver, Builder $query): array
    {
        $sql = $query->toSql();
        $bindings = $query->getBindings();

        $prefix = match ($driver) {
            'sqlite' => 'EXPLAIN QUERY PLAN ',
            // Newer MySQL defaults explain_format to TREE, which returns one text
            // column instead of the table/key/type/rows columns the summary reads.
            'mysql' => 'EXPLAIN FORMAT=TRADITIONAL ',
            'mariadb', 'pgsql' => 'EXPLAIN ',
            default => null,
        };

        if (! $prefix) {
            return [];
        }

        return array_map(fn ($r) => (array) $r, DB::select($prefix.$sql, $bindings));
    }

    private function time(Builder $query): string
    {
        $runs = max(1, (int) $this->option('runs'));
        $times = [];
        for ($i = 0; $i < $runs; $i++) {
            $start = hrtime(true);
            $query->toBase()->get();
            $times[] = (hrtime(true) - $start) / 1e6;
        }
        sort($times);

        return number_format($times[intdiv(count($times), 2)], 2);
    }

    /** One line per plan: which index each table uses, or a warning if none. */
    private function summary(string $driver, array $plan): string
    {
        if (! $plan) {
            return '(plan not available for this driver)';
        }

        if ($driver === 'sqlite') {
            return collect($plan)->pluck('detail')->map(function ($d) {
                $d = (string) $d;

                return preg_match('/^SCAN \w+$/', $d) ? "{$d}  <-- full scan" : $d;
            })->implode(' | ');
        }

        if ($driver === 'pgsql') {
            return (string) (array_values($plan[0])[0] ?? '');
        }

        return collect($plan)->map(function ($r) {
            $key = $r['key'] ?? null;
            $type = $r['type'] ?? '';
            $line = ($r['table'] ?? '?').': '.($key ? "key={$key}" : 'no index').", type={$type}, rows=".($r['rows'] ?? '?');

            return $type === 'ALL' ? $line.'  <-- full scan' : $line;
        })->implode(' | ');
    }
}
