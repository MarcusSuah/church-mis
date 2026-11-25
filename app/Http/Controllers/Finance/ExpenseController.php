<?php

namespace App\Http\Controllers\Finance;

use App\Enums\ExpenseCategory;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Sacraments\RecordsController;
use App\Models\Expense;
use App\Rules\SafeUrl;
use App\Support\ChartData;
use App\Support\ChurchSettings;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ExpenseController extends RecordsController
{
    public const STATUSES = ['Paid', 'Pending', 'Approved', 'Rejected'];

    protected string $model = Expense::class;

    protected string $page = 'expenses/index';

    protected string $permission = 'expenses';

    protected string $label = 'Expense';

    protected string $orderBy = 'expense_date';

    protected function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::enum(ExpenseCategory::class)],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:100000000'],
            'currency' => ['nullable', Rule::in(ChurchSettings::CURRENCIES)],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'fund_id' => ['nullable', 'uuid', 'exists:finance_funds,id'],
            'vendor_name' => ['nullable', 'string', 'max:255'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'receipt_url' => ['nullable', 'string', 'max:500', new SafeUrl],
            'expense_date' => ['required', 'date'],
            'approved_by' => ['nullable', 'string', 'max:255'],
            'paid_by' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $data['currency'] = $data['currency'] ?? null ?: Money::base();
        $data['exchange_rate'] = $record?->exchange_rate ?? Money::rate();

        return $this->withFund($data);
    }

    protected function searchColumns(): array
    {
        return ['title', 'vendor_name'];
    }

    protected function filters(): array
    {
        return [
            'category' => ['values' => array_map(fn ($c) => $c->value, ExpenseCategory::cases()), 'apply' => fn ($q, $v) => $q->where('category', $v)],
            'status' => ['values' => self::STATUSES, 'apply' => fn ($q, $v) => $q->where('status', $v)],
        ];
    }

    protected function stats(Builder $all, Builder $filtered): array
    {
        return [
            'this_month' => Money::sum((clone $all)->whereBetween('expense_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateTimeString()])->where('status', '!=', 'Rejected')),
            'total' => $this->cachedStat('count', fn () => $this->wholeTable($all)->count()),
            'pending' => $this->cachedStat('pending', fn () => (clone $all)->where('status', 'Pending')->count()),
            'filtered_total' => $this->unfiltered
                ? $this->cachedStat('sum', fn () => Money::sum($this->wholeTable($all)))
                : Money::sum(clone $filtered),
            'charts' => $this->cachedStat('charts:'.now()->format('Y-m'), fn () => $this->charts(clone $all)),
        ];
    }

    /**
     * Spending per month for the last 12 months split by status, and where
     * the approved and paid money went by category.
     *
     * @return array{monthly: list<array<string, string|float>>, by_category: list<array{label: string, value: float}>}
     */
    private function charts(Builder $all): array
    {
        [$from, $to] = ChartData::lastMonths(12);
        $period = fn () => (clone $all)->whereBetween('expense_date', [$from->toDateString(), $to->toDateTimeString()]);
        $sum = 'sum('.Money::sql().')';
        $series = [];
        foreach (['Paid', 'Approved', 'Pending'] as $status) {
            $series[strtolower($status)] = ChartData::perPeriod($period()->where('status', $status), 'expense_date', $sum, false);
        }

        return [
            'monthly' => ChartData::timeline(ChartData::periods($from, $to)['buckets'], $series),
            'by_category' => ChartData::byColumn($period()->whereIn('status', ['Paid', 'Approved']), 'category', $sum, 6, ChartData::headline(...)),
        ];
    }

    /** Approve / reject / mark paid from the list. */
    public function status(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(self::STATUSES)]]);
        $e = Expense::findOrFail($id);
        $e->update([...$data, 'approved_by' => in_array($data['status'], ['Approved', 'Paid'], true) ? ($e->approved_by ?: $request->user()->name) : $e->approved_by]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Expense marked {$data['status']}."]);

        return back();
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'title', 'description', 'fund_id', 'fund_name', 'vendor_name', 'reference_number', 'receipt_url', 'approved_by', 'paid_by', 'status', 'notes']),
            'category' => self::v($r->category),
            'payment_method' => self::v($r->payment_method),
            'amount' => (float) $r->amount,
            'currency' => $r->currency ?: Money::base(),
            'expense_date' => self::d($r->expense_date),
        ];
    }

    protected function extraProps(): array
    {
        return [
            'funds' => $this->fundOptions(),
            'methods' => array_map(fn ($c) => $c->value, PaymentMethod::cases()),
            'categories' => array_map(fn ($c) => $c->value, ExpenseCategory::cases()),
            'statuses' => self::STATUSES,
        ];
    }
}
