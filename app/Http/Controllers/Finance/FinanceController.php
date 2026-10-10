<?php

namespace App\Http\Controllers\Finance;

use App\Enums\ExpenseCategory;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Budget;
use App\Models\Donation;
use App\Models\Expense;
use App\Models\FinanceFund;
use App\Models\Offering;
use App\Models\Tithe;
use App\Support\Csv;
use App\Support\Money;
use App\Support\SqlDate;
use App\Support\StatsCache;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Finance Overview: KPIs, charts, fund balances, budget vs actual, transactions. */
class FinanceController extends Controller
{
    public function index(Request $request): Response
    {
        $period = in_array($request->query('period'), ['month', 'quarter', 'year'], true) ? $request->query('period') : 'month';
        [$from, $to, $prevFrom, $prevTo, $label] = $this->range($period);

        $tithes = $this->sum(Tithe::class, 'tithe_date', $from, $to);
        $offerings = $this->sum(Offering::class, 'offering_date', $from, $to);
        $donations = $this->sum(Donation::class, 'donation_date', $from, $to);
        $expenses = Money::sum(Expense::whereBetween('expense_date', [$from, $to])->whereIn('status', ['Paid', 'Approved']));

        $prevTithes = $this->sum(Tithe::class, 'tithe_date', $prevFrom, $prevTo);
        // Offerings card includes donations, so the comparison must too.
        $prevOfferings = $this->sum(Offering::class, 'offering_date', $prevFrom, $prevTo) + $this->sum(Donation::class, 'donation_date', $prevFrom, $prevTo);
        $prevExpenses = Money::sum(Expense::whereBetween('expense_date', [$prevFrom, $prevTo])->whereIn('status', ['Paid', 'Approved']));

        $yearStart = now()->startOfYear();
        $ytdGiving = $this->sum(Tithe::class, 'tithe_date', $yearStart, now()) + $this->sum(Offering::class, 'offering_date', $yearStart, now()) + $this->sum(Donation::class, 'donation_date', $yearStart, now());
        $givingGoal = Money::sum(FinanceFund::where('is_active', true), 'target_amount', null);

        $spentThisYear = BudgetController::spentByCategory(now()->year);

        return Inertia::render('finance-management/index', [
            'period' => $period,
            'periodLabel' => $label,
            'kpis' => [
                'tithes' => $tithes, 'tithes_prev' => $prevTithes,
                'offerings' => $offerings + $donations, 'offerings_prev' => $prevOfferings,
                'expenses' => $expenses, 'expenses_prev' => $prevExpenses,
                'net' => $tithes + $offerings + $donations - $expenses,
                'ytd_giving' => $ytdGiving, 'giving_goal' => $givingGoal,
            ],
            'givingChart' => $this->givingChart(),
            'expenseChart' => Expense::whereBetween('expense_date', [$from, $to])->whereIn('status', ['Paid', 'Approved'])
                ->toBase()->selectRaw('category, sum('.Money::sql().') as amount')->groupBy('category')->orderByDesc('amount')->get()
                ->map(fn ($r) => ['category' => $r->category instanceof \BackedEnum ? $r->category->value : $r->category, 'amount' => (float) $r->amount]),
            'funds' => $this->funds(),
            'budgets' => Budget::where('fiscal_year', now()->year)->where('is_active', true)->get()->map(function (Budget $b) use ($spentThisYear) {
                $spent = $spentThisYear;
                $cat = $b->category instanceof \BackedEnum ? $b->category->value : $b->category;

                return ['id' => $b->id, 'category' => $cat, 'icon' => $b->icon, 'budgeted' => BudgetController::annualBase($b), 'spent' => $spent[$cat] ?? 0.0];
            }),
            // The latest 500 across tithes, offerings and donations (F07); each module page has the full, paginated list.
            'transactions' => $this->transactions(now()->subMonths(12)->startOfMonth(), now()->endOfDay(), 500),
            'currencyTotals' => $this->currencyTotals($from, $to),
            'quick' => [
                'audit_entries' => AuditLog::where('module', 'Finance')->count(),
                'budgets' => Budget::where('fiscal_year', now()->year)->count(),
            ],
            'access' => [
                'role' => $request->user()->getRoleNames()->first() ?? 'Staff',
                'can_create' => $request->user()->can('finance.create'),
            ],
            'categories' => array_map(fn ($c) => $c->value, ExpenseCategory::cases()),
        ]);
    }

    /** CSV report for the selected period. */
    /**
     * CSV report for the selected period. Streamed table by table with
     * lazy() (Phase 3, F07), so a year of giving never sits in memory.
     */
    public function export(Request $request): StreamedResponse
    {
        $period = in_array($request->query('period'), ['month', 'quarter', 'year'], true) ? $request->query('period') : 'month';
        [$from, $to, , , $label] = $this->range($period);
        $range = [$from->toDateString(), $to->copy()->endOfDay()->toDateTimeString()];
        $method = fn ($m) => ($v = $m instanceof \BackedEnum ? $m->value : (string) $m) === 'momo' ? 'Mobile Money' : ucwords(str_replace('_', ' ', $v));

        return response()->streamDownload(function () use ($range, $label, $method) {
            $out = fopen('php://output', 'w');
            $put = fn (array $row) => Csv::put($out, $row);
            $money = fn (float $v) => number_format($v, 2, '.', '');

            $put([config('church.name').' — Finance Report — '.$label]);
            $put([]);
            $put(['INCOME']);
            $put(['Date', 'Name', 'Type', 'Amount', 'Currency', 'Amount ('.Money::base().')', 'Method', 'Fund', 'Reference', 'Receipt']);

            $income = 0.0;
            $sources = [
                [Tithe::class, 'tithe_date', fn ($r) => [$r->member_name, 'Tithe']],
                [Offering::class, 'offering_date', fn ($r) => [$r->is_collection ? 'Basket collection — '.$r->service_type : $r->member_name, $r->offering_type === 'Special Offering' ? 'Special Offering' : 'Offering']],
                [Donation::class, 'donation_date', fn ($r) => [$r->donor_name, 'Donation']],
            ];
            foreach ($sources as [$class, $field, $describe]) {
                foreach ($class::whereBetween($field, $range)->orderBy($field)->orderBy('id')->lazy(500) as $r) {
                    [$name, $type] = $describe($r);
                    $base = $r->amountInBase();
                    $income += $base;
                    $put([$r->{$field}?->format('Y-m-d'), $name, $type, $money((float) $r->amount), $r->currency ?: Money::base(), $money($base), $method($r->payment_method), $r->fund_name, $r->reference_number, $r->receipt_number]);
                }
            }
            $put(['Total income ('.Money::base().')', '', '', '', '', $money($income)]);
            $put([]);
            $put(['EXPENSES']);
            $put(['Date', 'Title', 'Category', 'Amount', 'Currency', 'Status', 'Fund', 'Vendor']);

            $spent = 0.0;
            foreach (Expense::whereBetween('expense_date', $range)->orderBy('expense_date')->orderBy('id')->lazy(500) as $e) {
                $spent += $e->amountInBase();
                $put([$e->expense_date?->format('Y-m-d'), $e->title, $e->category?->value, $money((float) $e->amount), $e->currency, $e->status, $e->fund_name, $e->vendor_name]);
            }
            $put(['Total expenses ('.Money::base().')', '', '', $money($spent)]);
            fclose($out);
        }, 'finance-report-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** PDF receipts; ids like "tithe:uuid,offering:uuid,donation:uuid". */
    public function receipts(Request $request)
    {
        $map = ['tithe' => [Tithe::class, 'tithe_date', 'Tithe'], 'offering' => [Offering::class, 'offering_date', null], 'donation' => [Donation::class, 'donation_date', 'Donation']];
        $items = collect(explode(',', (string) $request->query('ids')))->filter()->take(200)->map(function ($key) use ($map) {
            [$type, $id] = array_pad(explode(':', $key, 2), 2, null);
            if (! isset($map[$type])) {
                return null;
            }
            [$class, $dateField, $label] = $map[$type];
            $r = $class::find($id);

            return $r ? [
                'receipt' => $r->receipt_number ?: '—',
                'date' => $r->{$dateField}?->format('F j, Y'),
                'name' => $r->member_name ?? $r->donor_name,
                'type' => $label ?? $r->offering_type,
                'amount' => (float) $r->amount,
                'currency' => $r->currency ?: Money::base(),
                'method' => $r->payment_method instanceof \BackedEnum ? ucwords(str_replace('_', ' ', $r->payment_method->value)) : $r->payment_method,
                'fund' => $r->fund_name,
                'reference' => $r->reference_number,
            ] : null;
        })->filter()->values();
        abort_if($items->isEmpty(), 404);

        return Pdf::loadView('pdf.receipts', ['items' => $items, 'church' => config('church')])->setPaper('a5', 'landscape')
            ->stream('receipts-'.now()->format('Ymd-His').'.pdf');
    }

    /* ------------------------------------------------------------------ */

    private function range(string $period): array
    {
        $now = now();

        return match ($period) {
            'quarter' => [$now->copy()->startOfQuarter(), $now->copy()->endOfQuarter(), $now->copy()->subQuarter()->startOfQuarter(), $now->copy()->subQuarter()->endOfQuarter(), 'Q'.$now->quarter.' '.$now->year],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear(), $now->copy()->subYear()->startOfYear(), $now->copy()->subYear()->endOfYear(), (string) $now->year],
            default => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth(), $now->copy()->subMonth()->startOfMonth(), $now->copy()->subMonth()->endOfMonth(), $now->format('F Y')],
        };
    }

    private function sum(string $class, string $field, CarbonInterface $from, CarbonInterface $to): float
    {
        return Money::sum($class::whereBetween($field, [$from->toDateString(), $to->toDateString()]));
    }

    /** Giving received in each currency (unconverted) for the period. */
    private function currencyTotals(CarbonInterface $from, CarbonInterface $to): array
    {
        $out = [];
        foreach (['USD', 'LRD'] as $cur) {
            $out[$cur] = round(collect([[Tithe::class, 'tithe_date'], [Offering::class, 'offering_date'], [Donation::class, 'donation_date']])
                ->sum(fn ($x) => (float) $x[0]::where('currency', $cur)->whereBetween($x[1], [$from->toDateString(), $to->toDateString()])->sum('amount')), 2);
        }

        return $out;
    }

    private function givingChart(): array
    {
        $start = now()->subMonths(11)->startOfMonth();
        // Grouped and converted in SQL (one row per month), not by loading every gift into PHP.
        $series = fn (string $class, string $field) => $class::where($field, '>=', $start->toDateString())->toBase()
            ->selectRaw(SqlDate::yearMonth($field).' as ym, SUM('.Money::sql().') as total')
            ->groupBy('ym')->pluck('total', 'ym')
            ->map(fn ($total) => round((float) $total, 2));
        $t = $series(Tithe::class, 'tithe_date');
        $o = $series(Offering::class, 'offering_date');
        $d = $series(Donation::class, 'donation_date');

        return collect(range(0, 11))->map(function ($i) use ($start, $t, $o, $d) {
            $m = $start->copy()->addMonths($i);
            $k = $m->format('Y-m');

            return ['month' => $m->format('M'), 'label' => $m->format('F Y'), 'tithes' => $t[$k] ?? 0, 'offerings' => $o[$k] ?? 0, 'donations' => $d[$k] ?? 0];
        })->all();
    }

    private function funds(): Collection
    {
        $yearStart = now()->startOfYear()->toDateString();
        $incomeAll = $this->byFund(false);
        $incomeYtd = $this->byFund(true);
        $exp = fn (bool $ytd) => Expense::whereIn('status', ['Paid', 'Approved'])->when($ytd, fn ($q) => $q->where('expense_date', '>=', $yearStart))
            ->toBase()->selectRaw('fund_name, sum('.Money::sql().') as total')->groupBy('fund_name')->pluck('total', 'fund_name');
        $expAll = $exp(false);
        $expYtd = $exp(true);

        $names = FinanceFund::where('is_active', true)->orderBy('name')->get(['id', 'name', 'target_amount', 'currency', 'description']);
        if (! $names->contains('name', 'General Fund')) {
            $names->prepend((object) ['id' => 'general', 'name' => 'General Fund', 'target_amount' => 0, 'currency' => Money::base(), 'description' => null]);
        }

        return $names->map(fn ($f) => [
            'id' => $f->id,
            'name' => $f->name,
            'balance' => round(($incomeAll[$f->name] ?? 0) - (float) ($expAll[$f->name] ?? 0), 2),
            'budget' => round(Money::toBase((float) $f->target_amount, $f->currency), 2),
            // Raw values for the edit form.
            'target_amount' => (float) $f->target_amount,
            'currency' => $f->currency ?: Money::base(),
            'description' => $f->description ?? null,
            'editable' => $f->id !== 'general',
            'ytdIncome' => round($incomeYtd[$f->name] ?? 0, 2),
            'ytdExpenses' => round((float) ($expYtd[$f->name] ?? 0), 2),
        ])->values();
    }

    private function byFund(bool $ytd): array
    {
        $yearStart = now()->startOfYear()->toDateString();
        $totals = [];
        foreach ([[Tithe::class, 'tithe_date'], [Offering::class, 'offering_date'], [Donation::class, 'donation_date']] as [$class, $field]) {
            // All-time and year-to-date totals per fund scan the whole table; cached until a gift changes.
            $byFund = StatsCache::remember($class, 'by_fund:'.($ytd ? $yearStart : 'all'), fn () => $class::where($field, '>=', $ytd ? $yearStart : '1000-01-01')->toBase()
                ->selectRaw('fund_name, sum('.Money::sql().') as total')->groupBy('fund_name')
                ->pluck('total', 'fund_name')->map(fn ($total) => (float) $total)->all());

            foreach ($byFund as $fund => $total) {
                $totals[$fund] = ($totals[$fund] ?? 0) + $total;
            }
        }

        return $totals;
    }

    private function transactions(CarbonInterface $from, CarbonInterface $to, ?int $limit = null): Collection
    {
        $method = fn ($m) => ($v = $m instanceof \BackedEnum ? $m->value : (string) $m) === 'momo' ? 'Mobile Money' : ucwords(str_replace('_', ' ', $v));
        // Upper bound as a full timestamp: DATE columns compare correctly on MySQL, and so do
        // date-time strings on SQLite (the old date-only bound dropped the last day there).
        $range = [$from->toDateString(), $to->copy()->endOfDay()->toDateTimeString()];

        return collect()
            ->concat(Tithe::whereBetween('tithe_date', $range)->when($limit, fn ($q) => $q->orderByDesc('tithe_date')->limit($limit))->get()->map(fn ($t) => ['id' => "tithe:{$t->id}", 'date' => $t->tithe_date?->format('Y-m-d'), 'member' => $t->member_name, 'type' => 'Tithe', 'amount' => (float) $t->amount, 'currency' => $t->currency ?: Money::base(), 'amount_base' => round($t->amountInBase(), 2), 'method' => $method($t->payment_method), 'fund' => $t->fund_name, 'reference' => $t->reference_number, 'receipt' => $t->receipt_number, 'description' => $t->notes, 'edit' => '/tithes']))
            ->concat(Offering::whereBetween('offering_date', $range)->when($limit, fn ($q) => $q->orderByDesc('offering_date')->limit($limit))->get()->map(fn ($o) => ['id' => "offering:{$o->id}", 'date' => $o->offering_date?->format('Y-m-d'), 'member' => $o->is_collection ? 'Basket collection — '.$o->service_type : $o->member_name, 'type' => $o->offering_type === 'Special Offering' ? 'Special Offering' : 'Offering', 'amount' => (float) $o->amount, 'currency' => $o->currency ?: Money::base(), 'amount_base' => round($o->amountInBase(), 2), 'method' => $method($o->payment_method), 'fund' => $o->fund_name, 'reference' => $o->reference_number, 'receipt' => $o->receipt_number, 'description' => $o->offering_type.($o->notes ? " — {$o->notes}" : ''), 'edit' => '/offerings']))
            ->concat(Donation::whereBetween('donation_date', $range)->when($limit, fn ($q) => $q->orderByDesc('donation_date')->limit($limit))->get()->map(fn ($d) => ['id' => "donation:{$d->id}", 'date' => $d->donation_date?->format('Y-m-d'), 'member' => $d->donor_name, 'type' => 'Donation', 'amount' => (float) $d->amount, 'currency' => $d->currency ?: Money::base(), 'amount_base' => round($d->amountInBase(), 2), 'method' => $method($d->payment_method), 'fund' => $d->fund_name, 'reference' => $d->reference_number, 'receipt' => $d->receipt_number, 'description' => $d->purpose, 'edit' => '/donations']))
            ->sortByDesc('date')->when($limit, fn ($c) => $c->take($limit))->values();
    }
}
