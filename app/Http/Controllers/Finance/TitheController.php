<?php

namespace App\Http\Controllers\Finance;

use App\Models\Tithe;
use App\Support\ChartData;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TitheController extends GivingController
{
    protected string $model = Tithe::class;

    protected string $page = 'tithes/index';

    protected string $permission = 'tithes';

    protected string $label = 'Tithe';

    protected string $orderBy = 'tithe_date';

    protected function rules(): array
    {
        return [...$this->commonRules(), 'member_name' => ['required_without:member_id', 'nullable', 'string', 'max:255'], 'tithe_date' => ['required', 'date']];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        return $this->prepareGiving($data, $record);
    }

    protected function searchColumns(): array
    {
        return ['member_name', 'receipt_number'];
    }

    protected function filters(): array
    {
        return ['method' => ['values' => $this->methods(), 'apply' => fn ($q, $v) => $q->where('payment_method', $v)]];
    }

    protected function stats(Builder $all, Builder $filtered): array
    {
        $count = $this->cachedStat('count', fn () => $this->wholeTable($all)->count());
        $sum = $this->cachedStat('sum', fn () => Money::sum($this->wholeTable($all)));

        return [
            'this_month' => Money::sum((clone $all)->whereBetween('tithe_date', self::thisMonth())),
            'total' => $count,
            'average' => $count ? round($sum / $count, 2) : 0,
            'filtered_total' => $this->unfiltered ? $sum : Money::sum(clone $filtered),
            'charts' => $this->cachedStat('charts:'.now()->format('Y-m'), fn () => $this->charts(clone $all)),
        ];
    }

    /**
     * Monthly totals for the last 12 months, and how that money was given.
     *
     * @return array{monthly: list<array<string, string|float>>, by_method: list<array{label: string, value: float}>}
     */
    private function charts(Builder $all): array
    {
        [$from, $to] = ChartData::lastMonths(12);
        $period = fn () => (clone $all)->whereBetween('tithe_date', [$from->toDateString(), $to->toDateTimeString()]);
        $buckets = ChartData::periods($from, $to)['buckets'];

        return [
            'monthly' => ChartData::timeline($buckets, [
                'total' => ChartData::perPeriod($period(), 'tithe_date', 'sum('.Money::sql().')', false),
                'count' => ChartData::perPeriod($period(), 'tithe_date', 'count(*)', false),
            ]),
            'by_method' => ChartData::byColumn($period(), 'payment_method', 'sum('.Money::sql().')', 6, ChartData::headline(...)),
        ];
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'member_id', 'member_name', 'member_photo', 'fund_id', 'fund_name', 'reference_number', 'receipt_number', 'notes', 'recorded_by']),
            'amount' => (float) $r->amount,
            'currency' => $r->currency ?: Money::base(),
            'payment_method' => self::v($r->payment_method),
            'tithe_date' => self::d($r->tithe_date),
        ];
    }
}
