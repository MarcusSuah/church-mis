<?php

namespace App\Http\Controllers\Finance;

use App\Enums\BudgetPeriod;
use App\Enums\ExpenseCategory;
use App\Http\Controllers\Sacraments\RecordsController;
use App\Models\Budget;
use App\Models\Expense;
use App\Support\ChurchSettings;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/** Budgets per expense category; "spent" is calculated from expenses. */
class BudgetController extends RecordsController
{
    protected string $model = Budget::class;

    protected string $page = 'budgets/index';

    protected string $permission = 'budgets';

    protected string $label = 'Budget';

    protected string $orderBy = 'fiscal_year';

    protected function rules(): array
    {
        return [
            // One budget line per category per year, so spending is never counted twice.
            'category' => ['required', Rule::enum(ExpenseCategory::class), Rule::unique('budgets', 'category')->where('fiscal_year', (int) request('fiscal_year'))->ignore(request()->route('id'))],
            'description' => ['nullable', 'string', 'max:1000'],
            'period' => ['required', Rule::enum(BudgetPeriod::class)],
            'fiscal_year' => ['required', 'integer', 'between:2000,2100'],
            'allocated_amount' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'currency' => ['nullable', Rule::in(ChurchSettings::CURRENCIES)],
            'fund_id' => ['nullable', 'uuid', 'exists:finance_funds,id'],
            'icon' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $data['currency'] = $data['currency'] ?? null ?: Money::base();
        $data['icon'] = $data['icon'] ?? null ?: (self::ICONS[$data['category']] ?? 'BanknotesIcon');

        return $this->withFund($data);
    }

    /** How many times a period's allocation repeats in a year. */
    public const PERIODS_PER_YEAR = ['monthly' => 12, 'quarterly' => 4, 'annual' => 1];

    /** The yearly allocation in the default currency (monthly × 12, quarterly × 4). */
    public static function annualBase(Budget $b): float
    {
        $period = $b->period instanceof \BackedEnum ? $b->period->value : (string) $b->period;

        return round(Money::toBase((float) $b->allocated_amount, $b->currency) * (self::PERIODS_PER_YEAR[$period] ?? 1), 2);
    }

    public const ICONS = [
        'staff_salaries' => 'UsersIcon', 'utilities' => 'BuildingOffice2Icon', 'maintenance' => 'WrenchScrewdriverIcon',
        'outreach' => 'GlobeAltIcon', 'youth_programs' => 'StarIcon', 'music_worship' => 'MusicalNoteIcon',
        'administration' => 'ClipboardDocumentListIcon', 'events' => 'CalendarIcon', 'missions' => 'PaperAirplaneIcon', 'other' => 'BanknotesIcon',
    ];

    /** Spending per category for a fiscal year (approved + paid expenses). */
    public static function spentByCategory(int $year): array
    {
        // toBase(): plain rows, so the enum cast doesn't get in the way of the keys.
        // Date range (not YEAR()) so the (status, expense_date) index is used (F12).
        return Expense::whereBetween('expense_date', ["{$year}-01-01", "{$year}-12-31 23:59:59"])->whereIn('status', ['Paid', 'Approved'])
            ->toBase()->selectRaw('category, sum('.Money::sql().') as total')->groupBy('category')->pluck('total', 'category')
            ->map(fn ($v) => (float) $v)->all();
    }

    protected function present(Model $r): array
    {
        $year = (int) $r->fiscal_year;
        // Cached per request only (controllers can be reused between requests).
        $key = "budget-spent-{$year}";
        $spent = request()->attributes->get($key) ?? tap(self::spentByCategory($year), fn ($v) => request()->attributes->set($key, $v));
        $cat = self::v($r->category);

        return [
            ...$r->only(['id', 'description', 'fiscal_year', 'fund_id', 'fund_name', 'icon', 'notes', 'is_active']),
            'category' => $cat,
            'period' => self::v($r->period),
            'allocated_amount' => (float) $r->allocated_amount,
            'currency' => $r->currency ?: Money::base(),
            // Yearly allocation in the default currency, so it compares with the year's spending.
            'allocated_base' => self::annualBase($r),
            'spent_amount' => $spent[$cat] ?? 0.0,
        ];
    }

    /** Budgets are shown one fiscal year at a time (a handful of rows), newest year by default. */
    protected int $perPage = 100;

    protected function filters(): array
    {
        return ['year' => ['values' => $this->years()->map(fn ($y) => (string) $y)->all(), 'apply' => fn ($q, $v) => $q->where('fiscal_year', (int) $v)]];
    }

    protected function filterDefaults(): array
    {
        return ['year' => (string) now()->year];
    }

    protected function sort(Builder $query): Builder
    {
        return $query->orderBy('category');
    }

    protected function stats(Builder $all, Builder $filtered): array
    {
        return ['total' => (clone $filtered)->count()];
    }

    private function years(): Collection
    {
        return Budget::query()->distinct()->pluck('fiscal_year')->map(fn ($y) => (int) $y)
            ->push(now()->year)->unique()->sortDesc()->values();
    }

    protected function extraProps(): array
    {
        return [
            'years' => $this->years(),
            'funds' => $this->fundOptions(),
            'categories' => array_map(fn ($c) => $c->value, ExpenseCategory::cases()),
            'periods' => array_map(fn ($c) => $c->value, BudgetPeriod::cases()),
        ];
    }
}
