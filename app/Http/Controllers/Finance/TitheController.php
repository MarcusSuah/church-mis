<?php

namespace App\Http\Controllers\Finance;

use App\Models\Tithe;
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
