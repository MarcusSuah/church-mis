<?php

namespace App\Services;

use App\Enums\ServiceType;
use App\Http\Controllers\Finance\BudgetController;
use App\Models\AttendanceSession;
use App\Models\Baptism;
use App\Models\Budget;
use App\Models\Communion;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Funeral;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Offering;
use App\Models\PastoralCare;
use App\Models\PrayerRequest;
use App\Models\Sermon;
use App\Models\Tithe;
use App\Models\Wedding;
use App\Support\ChartData;
use App\Support\Money;
use App\Support\ReportFilters;
use App\Support\SqlDate;
use App\Support\StatsCache;
use Carbon\CarbonImmutable;

/**
 * Chart datasets, the financial ledger and extra KPI values for the Reports
 * page and its PDF. Every figure is aggregated in SQL from the church's own
 * tables (money in the base currency, via Money::sql()), narrowed by the
 * report's filters (ReportFilters); the page only draws what is sent here.
 * Data contract: resources/js/components/ssbcms/reports/types.ts.
 *
 * Everything returned is a plain array: some of it is cached, and the cache
 * refuses to rebuild objects (cache.serializable_classes = false).
 */
class ReportDatasets
{
    /** Expenses that count as money spent. */
    public const SPENT = ['Paid', 'Approved'];

    /** @var list<array{0: string, 1: class-string, 2: string, 3: string}> source, model, date column, label */
    private const GIVING = [
        ['tithes', Tithe::class, 'tithe_date', 'Tithes'],
        ['offerings', Offering::class, 'offering_date', 'Offerings'],
        ['donations', Donation::class, 'donation_date', 'Donations'],
    ];

    /** @var list<class-string> Money tables: a change to any of them refreshes the cached finance figures. */
    private const MONEY_MODELS = [Tithe::class, Offering::class, Donation::class, Expense::class];

    /** Ledger rows are grouped per month instead of per day for periods longer than this. */
    private const LEDGER_DAILY_MAX_DAYS = 92;

    /**
     * Charts for one report type, or null when the report has none.
     *
     * @return array<string, mixed>|null
     */
    public function charts(string $type, CarbonImmutable $from, CarbonImmutable $to, ?ReportFilters $filters = null): ?array
    {
        $f = $filters ?? ReportFilters::none($type);

        return match ($type) {
            'membership' => $this->membershipCharts($from, $to, $f),
            'finance' => $this->financeCharts($from, $to, $f),
            'full' => $this->combine($this->membershipCharts($from, $to, $f), $this->financeCharts($from, $to, $f)),
            'attendance' => $this->attendanceCharts($from, $to, $f),
            'sacraments' => $this->sacramentCharts($from, $to, $f),
            'ministry' => $this->ministryCharts($from, $to, $f),
            'events' => $this->eventCharts($from, $to, $f),
            default => null,
        };
    }

    /**
     * Extra figures for the KPI cards.
     *
     * Growth counts members who joined in the period: members are never
     * deleted when they leave, and no leaving date is recorded.
     *
     * @param  array{closing_balance: float}|null  $ledger
     * @return array{members_new: int, members_growth: int, members_growth_pct: float|null, attendance_avg: float|null, closing_balance: float|null}
     */
    public function overviewExtras(CarbonImmutable $from, CarbonImmutable $to, ?array $ledger = null, ?ReportFilters $filters = null): array
    {
        $f = $filters ?? ReportFilters::none();
        $opening = $f->members(Member::where('created_at', '<', $from))->count();
        $new = $f->members(Member::whereBetween('created_at', [$from, $to]))->count();
        $average = $f->sessions(AttendanceSession::whereBetween('service_date', [$from->toDateString(), $to->toDateString()]))->avg('total_present');

        return [
            'members_new' => $new,
            'members_growth' => $new,
            'members_growth_pct' => $opening > 0 ? round($new / $opening * 100, 1) : null,
            'attendance_avg' => $average !== null ? round((float) $average, 1) : null,
            'closing_balance' => $ledger['closing_balance'] ?? null,
        ];
    }

    /**
     * Income and spending in date order with a running balance. Gifts are
     * grouped per day and type (per month for long periods) so a year of
     * tithes stays a readable table; expenses are grouped by category.
     *
     * @return array{opening_balance: float, closing_balance: float, total_income: float, total_expense: float, grouping: string, rows: list<array{date: string, ref: string, description: string, income: float, expense: float, balance: float}>}
     */
    public function ledger(CarbonImmutable $from, CarbonImmutable $to, ?ReportFilters $filters = null): array
    {
        $f = $filters ?? ReportFilters::none('finance');
        $key = "ledger-v3:{$from->toDateString()}:{$to->toDateString()}:{$f->hash()}";

        return StatsCache::rememberFor(self::MONEY_MODELS, $key, fn () => $this->buildLedger($from, $to, $f));
    }

    /**
     * Every chart of a report flattened to label / value rows, for the PDF
     * (DomPDF cannot run the browser charts, so it draws them as bars).
     *
     * @param  array<string, mixed>|null  $charts
     * @return list<array{title: string, money: bool, series: list<string>, rows: list<array{label: string, values: list<float>}>, max: float}>
     */
    public function forPdf(?array $charts): array
    {
        if (! $charts) {
            return [];
        }

        $typed = [
            'membership_growth' => ['Membership growth', false, ['members' => 'Members']],
            'gender' => ['Male and female membership', false, ['value' => 'Members']],
            'age_groups' => ['Membership by age group', false, ['value' => 'Members']],
            'departments' => ['Membership by department', false, ['value' => 'Members']],
            'attendance_trend' => ['Monthly attendance trend', false, ['attendance' => 'Attendance']],
            'income_by_category' => ['Income distribution', true, ['value' => 'Amount']],
            'expense_by_category' => ['Expenditure distribution', true, ['value' => 'Amount']],
            'monthly_financials' => ['Monthly income vs expenditure', true, ['income' => 'Income', 'expense' => 'Expenditure']],
            'budget_vs_actual' => ['Budget vs actual expenditure', true, ['budget' => 'Budget', 'actual' => 'Actual']],
        ];

        $specs = [];
        foreach ($typed as $key => [$title, $money, $series]) {
            if (! empty($charts[$key])) {
                $specs[] = [$title, $money, $series, $charts[$key]];
            }
        }
        foreach ($charts['extra'] ?? [] as $chart) {
            if (! empty($chart['data'])) {
                $series = collect($chart['series'])->mapWithKeys(fn ($s) => [$s['key'] => $s['name']])->all();
                $specs[] = [$chart['title'], (bool) ($chart['money'] ?? false), $series, $chart['data']];
            }
        }

        return array_map(function (array $spec) {
            [$title, $money, $series, $data] = $spec;
            $rows = array_map(fn (array $row) => [
                'label' => (string) $row['label'],
                'values' => array_map(fn (string $key) => (float) ($row[$key] ?? 0), array_keys($series)),
            ], $data);
            $max = max(1.0, ...array_merge([0.0], ...array_map(fn ($r) => $r['values'], $rows)));

            return ['title' => $title, 'money' => $money, 'series' => array_values($series), 'rows' => $rows, 'max' => $max];
        }, $specs);
    }

    /* ------------------------------------------------------------ membership */

    /** @return array<string, mixed> */
    private function membershipCharts(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $members = fn () => $f->members(Member::query());
        $start = $this->chartStart($from, $to, $members()->min('created_at'));
        ['yearly' => $yearly, 'buckets' => $buckets] = ChartData::periods($start, $to);
        $joined = ChartData::perPeriod($members()->whereBetween('created_at', [$start, $to]), 'created_at', 'count(*)', $yearly);

        // Running total: members on record before the chart starts, plus each period's new members.
        $running = $members()->where('created_at', '<', $start)->count();
        $growth = [];
        foreach ($buckets as $key => $label) {
            $running += (int) ($joined[$key] ?? 0);
            $growth[] = ['label' => $label, 'members' => $running];
        }

        return [
            'membership_growth' => $growth,
            'gender' => $this->counts(ChartData::byColumn($members(), 'gender', 'count(*)', 4, fn (string $g) => ucfirst($g))),
            'age_groups' => $this->ageGroups($f),
            'departments' => $this->counts(ChartData::byColumn($members()->whereNotNull('department')->where('department', '!=', ''), 'department', 'count(*)', 8)),
            'attendance_trend' => $this->attendanceTrend($from, $to, $f),
            'extra' => [
                $this->chart('members_by_status', 'Members by status', 'donut', $this->counts(ChartData::byColumn($members(), 'status', 'count(*)', 6))),
                $this->chart('new_members', 'New members per '.($yearly ? 'year' : 'month'), 'bars', $this->timelineRows($buckets, ['value' => $joined]), [['key' => 'value', 'name' => 'New members']]),
            ],
        ];
    }

    /**
     * Members per age band, worked out in SQL from the birth year.
     *
     * @return list<array{label: string, value: int}>
     */
    private function ageGroups(ReportFilters $f): array
    {
        $age = '('.now()->year.' - '.SqlDate::year('date_of_birth').')';
        $bands = ['0-12' => 13, '13-17' => 18, '18-29' => 30, '30-44' => 45, '45-59' => 60];
        $case = 'CASE';
        foreach ($bands as $band => $below) {
            $case .= " WHEN {$age} < {$below} THEN '{$band}'";
        }
        $case .= " ELSE '60+' END";

        $counts = $f->members(Member::whereNotNull('date_of_birth'))->toBase()
            ->selectRaw("{$case} as band, count(*) as n")->groupByRaw($case)
            ->pluck('n', 'band');

        return collect([...array_keys($bands), '60+'])
            ->map(fn (string $band) => ['label' => $band, 'value' => (int) ($counts[$band] ?? 0)])
            ->all();
    }

    /* ------------------------------------------------------------ attendance */

    /** @return array<string, mixed> */
    private function attendanceCharts(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $sessions = fn () => $f->sessions(AttendanceSession::whereBetween('service_date', [$from->toDateString(), $to->toDateString()]));
        $byService = $sessions()->toBase()
            ->selectRaw('service_type, avg(total_present) as average')->groupBy('service_type')->orderByDesc('average')->get()
            ->map(fn ($r) => ['label' => ServiceType::tryFrom((string) $r->service_type)?->label() ?? (string) $r->service_type, 'value' => round((float) $r->average, 1)])
            ->all();
        $totals = $sessions()->toBase()->selectRaw('sum(total_present) as present, sum(total_late) as late, sum(total_absent) as absent')->first();

        return [
            'attendance_trend' => $this->attendanceTrend($from, $to, $f),
            'extra' => [
                $this->chart('attendance_by_service', 'Average attendance by service', 'bars', $byService, [['key' => 'value', 'name' => 'Average present']], horizontal: true),
                $this->chart('attendance_breakdown', 'Present, late and absent', 'donut', [
                    ['label' => 'Present', 'value' => (int) ($totals->present ?? 0)],
                    ['label' => 'Late', 'value' => (int) ($totals->late ?? 0)],
                    ['label' => 'Absent', 'value' => (int) ($totals->absent ?? 0)],
                ]),
            ],
        ];
    }

    /** @return list<array{label: string, attendance: int}> */
    private function attendanceTrend(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $start = $this->chartStart($from, $to, $f->sessions(AttendanceSession::query())->min('service_date'));
        ['yearly' => $yearly, 'buckets' => $buckets] = ChartData::periods($start, $to);
        $totals = ChartData::perPeriod(
            $f->sessions(AttendanceSession::whereBetween('service_date', [$start->toDateString(), $to->toDateString()])),
            'service_date', 'sum(total_present)', $yearly,
        );

        return collect(ChartData::timeline($buckets, ['attendance' => $totals]))
            ->map(fn ($row) => ['label' => $row['label'], 'attendance' => (int) $row['attendance']])
            ->all();
    }

    /* --------------------------------------------------------------- finance */

    /** @return array<string, mixed> */
    private function financeCharts(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $r = [$from->toDateString(), $to->toDateString()];
        $cached = StatsCache::rememberFor(self::MONEY_MODELS, "finance-charts-v3:{$r[0]}:{$r[1]}:{$f->hash()}", function () use ($from, $to, $r, $f) {
            $sum = 'sum('.Money::sql().')';
            $sources = array_values(array_filter(self::GIVING, fn ($g) => $f->includesIncome($g[0])));
            $gifts = fn (array $g, array $range) => $f->gifts($g[1]::whereBetween($g[2], $range), $g[0]);
            $spent = fn () => $f->expenses(Expense::whereIn('status', self::SPENT));
            $start = $this->chartStart($from, $to, ...[...array_map(fn ($g) => $f->gifts($g[1]::query(), $g[0])->min($g[2]), $sources), $spent()->min('expense_date')]);
            ['yearly' => $yearly, 'buckets' => $buckets] = ChartData::periods($start, $to);
            $range = [$start->toDateString(), $to->toDateString()];

            $income = [];
            $byFund = [];
            foreach ($sources as $g) {
                foreach (ChartData::perPeriod($gifts($g, $range), $g[2], $sum, $yearly) as $key => $total) {
                    $income[$key] = round(($income[$key] ?? 0) + $total, 2);
                }
                foreach (ChartData::byColumn($gifts($g, $r), 'fund_name', $sum, 50) as $row) {
                    $byFund[$row['label']] = round(($byFund[$row['label']] ?? 0) + $row['value'], 2);
                }
            }
            arsort($byFund);

            return [
                'income_by_category' => array_map(fn ($g) => ['label' => $g[3], 'value' => Money::sum($gifts($g, $r))], $sources),
                'expense_by_category' => ChartData::byColumn($spent()->whereBetween('expense_date', $r), 'category', $sum, 6, ChartData::headline(...)),
                'monthly_financials' => collect(ChartData::timeline($buckets, [
                    'income' => $income,
                    'expense' => ChartData::perPeriod($spent()->whereBetween('expense_date', $range), 'expense_date', $sum, $yearly),
                ]))->map(fn ($row) => ['label' => $row['label'], 'income' => $row['income'], 'expense' => $row['expense']])->all(),
                'extra' => [
                    $this->chart('income_by_fund', 'Income by fund', 'bars', collect($byFund)->take(8)->map(fn ($v, $k) => ['label' => $k, 'value' => $v])->values()->all(), [['key' => 'value', 'name' => 'Income']], money: true, horizontal: true),
                ],
            ];
        });

        return [...$cached, 'budget_vs_actual' => $this->budgetVsActual((int) $to->year, $f)];
    }

    /**
     * Each category's yearly budget beside what was spent in that fiscal year
     * (only the chosen category when the report is filtered by one).
     *
     * @return list<array{label: string, budget: float, actual: float}>
     */
    private function budgetVsActual(int $year, ReportFilters $f): array
    {
        $spent = BudgetController::spentByCategory($year);

        return Budget::where('fiscal_year', $year)
            ->when($f->get('category'), fn ($q, $category) => $q->where('category', $category))
            ->orderBy('category')->get()
            ->map(function (Budget $b) use ($spent) {
                $category = $b->category instanceof \BackedEnum ? $b->category->value : (string) $b->category;

                return ['label' => ChartData::headline($category), 'budget' => BudgetController::annualBase($b), 'actual' => round($spent[$category] ?? 0.0, 2)];
            })
            ->values()->all();
    }

    /** @return array{opening_balance: float, closing_balance: float, total_income: float, total_expense: float, grouping: string, rows: list<array<string, string|float>>} */
    private function buildLedger(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $sum = 'sum('.Money::sql().')';
        $before = $from->toDateString();
        $range = [$from->toDateString(), $to->toDateString()];
        $monthly = $from->diffInDays($to) > self::LEDGER_DAILY_MAX_DAYS;
        $bucket = fn (string $column) => $monthly ? SqlDate::yearMonth($column) : "DATE({$column})";
        $dateOf = fn (string $key) => $monthly ? "{$key}-01" : substr($key, 0, 10);
        $sources = array_values(array_filter(self::GIVING, fn ($g) => $f->includesIncome($g[0])));
        $spent = fn () => $f->expenses(Expense::whereIn('status', self::SPENT));

        $opening = array_sum(array_map(fn ($g) => Money::sum($f->gifts($g[1]::where($g[2], '<', $before), $g[0])), $sources))
            - Money::sum($spent()->where('expense_date', '<', $before));

        $rows = [];
        foreach ($sources as [$source, $class, $field, $label]) {
            $groups = $f->gifts($class::whereBetween($field, $range), $source)->toBase()
                ->selectRaw("{$bucket($field)} as day, count(*) as gifts, {$sum} as total")
                ->groupByRaw($bucket($field))->get();
            foreach ($groups as $g) {
                $rows[] = [
                    'date' => $dateOf((string) $g->day), 'ref' => strtoupper($label), 'order' => 0,
                    'description' => "{$label} received ({$g->gifts} ".($g->gifts == 1 ? 'gift' : 'gifts').')',
                    'income' => round((float) $g->total, 2), 'expense' => 0.0,
                ];
            }
        }
        $expenses = $spent()->whereBetween('expense_date', $range)->toBase()
            ->selectRaw("{$bucket('expense_date')} as day, category, count(*) as items, {$sum} as total")
            ->groupByRaw("{$bucket('expense_date')}, category")->get();
        foreach ($expenses as $e) {
            $category = ChartData::headline((string) $e->category);
            $rows[] = [
                'date' => $dateOf((string) $e->day), 'ref' => 'EXP-'.strtoupper(str_replace(' ', '-', $category)), 'order' => 1,
                'description' => "{$category} expenses ({$e->items} ".($e->items == 1 ? 'item' : 'items').')',
                'income' => 0.0, 'expense' => round((float) $e->total, 2),
            ];
        }

        usort($rows, fn ($a, $b) => [$a['date'], $a['order'], $a['ref']] <=> [$b['date'], $b['order'], $b['ref']]);
        $balance = $opening;
        $rows = array_map(function (array $row) use (&$balance) {
            $balance += $row['income'] - $row['expense'];
            unset($row['order']);

            return [...$row, 'balance' => round($balance, 2)];
        }, $rows);

        return [
            'opening_balance' => round($opening, 2),
            'closing_balance' => round($balance, 2),
            'total_income' => round(array_sum(array_column($rows, 'income')), 2),
            'total_expense' => round(array_sum(array_column($rows, 'expense')), 2),
            'grouping' => $monthly ? 'month' : 'day',
            'rows' => $rows,
        ];
    }

    /* ------------------------------------------------------------ sacraments */

    /** @return array<string, mixed> */
    private function sacramentCharts(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $kinds = array_filter([
            'baptisms' => ['Baptisms', Baptism::class, 'baptism_date'],
            'weddings' => ['Weddings', Wedding::class, 'wedding_date'],
            'funerals' => ['Funerals', Funeral::class, 'funeral_date'],
            'communions' => ['Communion services', Communion::class, 'service_date'],
        ], fn (string $kind) => $f->includesSacrament($kind), ARRAY_FILTER_USE_KEY);
        $start = $this->chartStart($from, $to, ...array_map(fn ($k) => $k[1]::min($k[2]), array_values($kinds)));
        ['yearly' => $yearly, 'buckets' => $buckets] = ChartData::periods($start, $to);

        $series = [];
        $mix = [];
        foreach ($kinds as $key => [$label, $class, $field]) {
            $series[$key] = ChartData::perPeriod($class::whereBetween($field, [$start->toDateString(), $to->toDateString()]), $field, 'count(*)', $yearly);
            $mix[] = ['label' => $label, 'value' => $class::whereBetween($field, [$from->toDateString(), $to->toDateString()])->count()];
        }

        return ['extra' => array_values(array_filter([
            $this->chart('sacraments_by_period', $this->title(array_column($kinds, 0), 'Sacraments').' per '.($yearly ? 'year' : 'month'), 'bars', $this->timelineRows($buckets, $series),
                array_map(fn ($key, $kind) => ['key' => $key, 'name' => $kind[0]], array_keys($kinds), $kinds), stacked: count($kinds) > 1),
            // A one-slice pie says nothing, so the mix is shown only for more than one sacrament.
            count($kinds) > 1 ? $this->chart('sacrament_mix', 'Sacraments in this period', 'donut', $mix) : null,
        ]))];
    }

    /* -------------------------------------------------------------- ministry */

    /** @return array<string, mixed> */
    private function ministryCharts(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $period = [$from, $to];

        return ['extra' => [
            $this->chart('prayer_status', 'Prayer requests by status', 'donut', $this->counts(ChartData::byColumn($f->prayers(PrayerRequest::whereBetween('created_at', $period)), 'status', 'count(*)'))),
            $this->chart('care_by_status', 'Pastoral care cases by status', 'bars', $this->counts(ChartData::byColumn($f->care(PastoralCare::whereBetween('created_at', $period)), 'status', 'count(*)')), [['key' => 'value', 'name' => 'Cases']]),
            $this->chart('ministry_sizes', 'Largest ministries', 'bars',
                Ministry::where('is_active', true)->orderByDesc('member_count')->limit(8)->get(['name', 'member_count'])
                    ->map(fn (Ministry $m) => ['label' => $m->name, 'value' => (int) $m->member_count])->all(),
                [['key' => 'value', 'name' => 'Members']], horizontal: true),
        ]];
    }

    /* ---------------------------------------------------------------- events */

    /** @return array<string, mixed> */
    private function eventCharts(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $events = fn () => $f->events(Event::query());
        $start = $this->chartStart($from, $to, $events()->min('start_date'), $f->isEmpty() ? Sermon::min('sermon_date') : null);
        ['yearly' => $yearly, 'buckets' => $buckets] = ChartData::periods($start, $to);
        $series = ['events' => ChartData::perPeriod($events()->whereBetween('start_date', [$start, $to]), 'start_date', 'count(*)', $yearly)];
        $names = [['key' => 'events', 'name' => 'Events']];
        // Sermons are not events: they appear only on the unfiltered report, as in its tables.
        if ($f->isEmpty()) {
            $series['sermons'] = ChartData::perPeriod(Sermon::whereBetween('sermon_date', [$start->toDateString(), $to->toDateString()]), 'sermon_date', 'count(*)', $yearly);
            $names[] = ['key' => 'sermons', 'name' => 'Sermons'];
        }

        return ['extra' => [
            $this->chart('events_and_sermons', ($f->isEmpty() ? 'Events and sermons' : 'Events').' per '.($yearly ? 'year' : 'month'), 'lines', $this->timelineRows($buckets, $series), $names),
            $this->chart('events_by_type', 'Events by type', 'donut', $this->counts(ChartData::byColumn($events()->whereBetween('start_date', [$from, $to]), 'event_type', 'count(*)'))),
            $this->chart('events_by_status', 'Events by status', 'bars', $this->counts(ChartData::byColumn($events()->whereBetween('start_date', [$from, $to]), 'status', 'count(*)')), [['key' => 'value', 'name' => 'Events']]),
        ]];
    }

    /* --------------------------------------------------------------- helpers */

    /**
     * Two reports' charts on one page (the Membership & Financial report): typed charts side by side, extras joined.
     *
     * @param  array<string, mixed>  $first
     * @param  array<string, mixed>  $second
     * @return array<string, mixed>
     */
    private function combine(array $first, array $second): array
    {
        return [...$first, ...$second, 'extra' => [...($first['extra'] ?? []), ...($second['extra'] ?? [])]];
    }

    /** "Baptisms" for one kind, the general title for several. */
    private function title(array $names, string $general): string
    {
        return count($names) === 1 ? (string) reset($names) : $general;
    }

    /**
     * One entry of the `extra` chart list.
     *
     * @param  list<array<string, string|float|int>>  $data
     * @param  list<array{key: string, name: string}>|null  $series
     * @return array{key: string, title: string, kind: string, data: list<array<string, string|float|int>>, series: list<array{key: string, name: string}>, money: bool, horizontal: bool, stacked: bool}
     */
    private function chart(string $key, string $title, string $kind, array $data, ?array $series = null, bool $money = false, bool $horizontal = false, bool $stacked = false): array
    {
        return [
            'key' => $key, 'title' => $title, 'kind' => $kind, 'data' => $data,
            'series' => $series ?? [['key' => 'value', 'name' => $title]],
            'money' => $money, 'horizontal' => $horizontal, 'stacked' => $stacked,
        ];
    }

    /**
     * Timeline rows with integer counts, labelled for the chart.
     *
     * @param  array<string, string>  $buckets
     * @param  array<string, array<string, float>>  $series
     * @return list<array<string, string|int>>
     */
    private function timelineRows(array $buckets, array $series): array
    {
        return array_map(function (array $row) use ($series) {
            $out = ['label' => $row['label']];
            foreach (array_keys($series) as $key) {
                $out[$key] = (int) $row[$key];
            }

            return $out;
        }, ChartData::timeline($buckets, $series));
    }

    /**
     * @param  list<array{label: string, value: float}>  $rows
     * @return list<array{label: string, value: int}>
     */
    private function counts(array $rows): array
    {
        return array_map(fn ($row) => ['label' => $row['label'], 'value' => (int) $row['value']], $rows);
    }

    /**
     * Charts start at the first record rather than at the range start, so
     * "All time" doesn't draw decades of empty periods.
     */
    private function chartStart(CarbonImmutable $from, CarbonImmutable $to, mixed ...$earliest): CarbonImmutable
    {
        $first = collect($earliest)->filter()->map(fn ($d) => CarbonImmutable::parse($d)->startOfDay())->min();

        return $first && $first->gt($from) ? $first->min($to) : $from;
    }
}
