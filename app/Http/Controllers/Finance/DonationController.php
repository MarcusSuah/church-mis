<?php

namespace App\Http\Controllers\Finance;

use App\Models\Donation;
use App\Support\ChartData;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class DonationController extends GivingController
{
    protected string $model = Donation::class;

    protected string $page = 'donations/index';

    protected string $permission = 'donations';

    protected string $label = 'Donation';

    protected string $orderBy = 'donation_date';

    protected function rules(): array
    {
        return [
            ...$this->commonRules(),
            'is_anonymous' => ['boolean'],
            'donor_name' => ['required_unless:is_anonymous,true', 'nullable', 'string', 'max:255'],
            'donor_email' => ['nullable', 'email', 'max:255'],
            'donor_phone' => ['nullable', 'string', 'max:50'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'donation_date' => ['required', 'date'],
            'is_recurring' => ['boolean'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $data = $this->withCashReference($this->prepareGiving($data, $record, 'donor_name'), $record);
        if ($data['is_anonymous'] ?? false) {
            $data['donor_name'] = 'Anonymous Donor';
        }
        unset($data['member_photo']);

        return $data;
    }

    protected function searchColumns(): array
    {
        return ['donor_name', 'receipt_number', 'purpose'];
    }

    protected function filters(): array
    {
        return ['recurring' => ['values' => ['Recurring', 'One-time'], 'apply' => fn ($q, $v) => $q->where('is_recurring', $v === 'Recurring')]];
    }

    protected function stats(Builder $all, Builder $filtered): array
    {
        return [
            'this_month' => Money::sum((clone $all)->whereBetween('donation_date', self::thisMonth())),
            'donors' => $this->cachedStat('donors', fn () => (clone $all)->distinct()->count('donor_name')),
            'recurring' => $this->cachedStat('recurring', fn () => (clone $all)->where('is_recurring', true)->count()),
            'filtered_total' => $this->unfiltered
                ? $this->cachedStat('sum', fn () => Money::sum($this->wholeTable($all)))
                : Money::sum(clone $filtered),
            'charts' => $this->cachedStat('charts:'.now()->format('Y-m'), fn () => $this->charts(clone $all)),
        ];
    }

    /**
     * One-time and recurring giving per month for the last 12 months, and
     * which funds the year's donations went to.
     *
     * @return array{monthly: list<array<string, string|float>>, by_fund: list<array{label: string, value: float}>}
     */
    private function charts(Builder $all): array
    {
        [$from, $to] = ChartData::lastMonths(12);
        $period = fn () => (clone $all)->whereBetween('donation_date', [$from->toDateString(), $to->toDateTimeString()]);
        $sum = 'sum('.Money::sql().')';

        return [
            'monthly' => ChartData::timeline(ChartData::periods($from, $to)['buckets'], [
                'one_time' => ChartData::perPeriod($period()->where('is_recurring', false), 'donation_date', $sum, false),
                'recurring' => ChartData::perPeriod($period()->where('is_recurring', true), 'donation_date', $sum, false),
            ]),
            'by_fund' => ChartData::byColumn($period(), 'fund_name', $sum),
        ];
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'member_id', 'donor_name', 'donor_email', 'donor_phone', 'is_anonymous', 'is_recurring', 'purpose', 'fund_id', 'fund_name', 'reference_number', 'receipt_number', 'notes']),
            'amount' => (float) $r->amount,
            'currency' => $r->currency ?: Money::base(),
            'payment_method' => self::v($r->payment_method),
            'donation_date' => self::d($r->donation_date),
        ];
    }
}
