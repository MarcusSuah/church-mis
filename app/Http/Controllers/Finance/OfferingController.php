<?php

namespace App\Http\Controllers\Finance;

use App\Enums\Role;
use App\Enums\ServiceSession;
use App\Enums\ServiceType;
use App\Models\Offering;
use App\Models\User;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class OfferingController extends GivingController
{
    public const TYPES = ['Regular Offering', 'Building Fund Offering', 'Special Offering', 'Welfare Offering', 'Missions Offering', 'Youth Offering'];

    protected string $model = Offering::class;

    /**
     * Service types, from the same list sermons use (App\Enums\ServiceType).
     * Offerings store the label ("Sunday Worship"), as they always have.
     *
     * @return list<string>
     */
    public static function services(): array
    {
        return array_values(ServiceType::options());
    }

    protected string $page = 'offerings/index';

    protected string $permission = 'offerings';

    protected string $label = 'Offering';

    protected string $orderBy = 'offering_date';

    protected function rules(): array
    {
        return [
            ...$this->commonRules(),
            'member_name' => ['nullable', 'string', 'max:255'],
            'offering_type' => ['required', Rule::in(self::TYPES)],
            'service_type' => ['required', Rule::in(self::services())],
            // Which Sunday service (1st / 2nd); only Sunday Worship has sessions.
            'service_session' => ['nullable', 'required_if:service_type,'.ServiceType::SundayWorship->label(), Rule::enum(ServiceSession::class)],
            'offering_date' => ['required', 'date'],
            // Basket / plate collection counted by the cashier after a service.
            'is_collection' => ['boolean'],
            'counted_by' => ['nullable', 'required_if:is_collection,true', 'string', 'max:120'],
            'verified_by' => ['nullable', 'string', 'max:120'],
        ];
    }

    protected function messages(): array
    {
        return ['service_session.required_if' => 'Choose which Sunday service (1st or 2nd) this offering came from.'];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        if (($data['service_type'] ?? null) !== ServiceType::SundayWorship->label()) {
            $data['service_session'] = null;
        }
        $service = $data['service_type'].(empty($data['service_session']) ? '' : ' — '.ServiceSession::from($data['service_session'])->label());
        if ($data['is_collection'] ?? false) {
            // A collection belongs to the whole congregation, not one member.
            $data['member_id'] = null;
            $data['member_name'] = 'Service collection — '.$service;
        }
        $data = $this->withCashReference($this->prepareGiving($data, $record), $record);
        $data['member_photo'] = ($data['is_collection'] ?? false) ? null : ($data['member_photo'] ?? null);
        // Loose plate offerings with no name are collections too.
        if (empty($data['member_name'])) {
            $data['member_name'] = 'Service collection — '.$service;
            $data['is_collection'] = true;
        }

        return $data;
    }

    protected function present(Model $r): array
    {
        /** @var Offering $r */
        return [
            ...$r->only(['id', 'member_id', 'member_name', 'member_photo', 'offering_type', 'service_type', 'fund_id', 'fund_name', 'reference_number', 'receipt_number', 'notes', 'recorded_by', 'counted_by', 'verified_by']),
            'service_session' => $r->service_session?->value,
            'service_label' => $r->serviceLabel(),
            'is_collection' => (bool) $r->is_collection,
            'amount' => (float) $r->amount,
            'currency' => $r->currency ?: Money::base(),
            'payment_method' => self::v($r->payment_method),
            'offering_date' => self::d($r->offering_date),
        ];
    }

    protected function searchColumns(): array
    {
        return ['member_name', 'receipt_number', 'counted_by'];
    }

    protected function filters(): array
    {
        return [
            'type' => ['values' => self::TYPES, 'apply' => fn ($q, $v) => $q->where('offering_type', $v)],
            'kind' => ['values' => ['Collections', 'Individual'], 'apply' => fn ($q, $v) => $q->where('is_collection', $v === 'Collections')],
        ];
    }

    protected function stats(Builder $all, Builder $filtered): array
    {
        $month = (clone $all)->whereBetween('offering_date', self::thisMonth());
        $collections = (clone $all)->where('is_collection', true);
        $collectionCount = $this->cachedStat('collections_count', fn () => (clone $collections)->count());
        $collectionSum = $this->cachedStat('collections_sum', fn () => Money::sum(clone $collections));

        return [
            'this_month' => Money::sum(clone $month),
            'collections_this_month' => Money::sum((clone $month)->where('is_collection', true)),
            'average_collection' => $collectionCount ? round($collectionSum / $collectionCount, 2) : 0,
            'filtered_total' => $this->unfiltered
                ? $this->cachedStat('sum', fn () => Money::sum($this->wholeTable($all)))
                : Money::sum(clone $filtered),
            'chart' => $this->cachedStat('collections_chart_v2', fn () => $this->collectionChart(clone $collections)),
        ];
    }

    /**
     * Basket collections on the last 10 service days, in the base currency (SQL-aggregated).
     *
     * Plain arrays only: the result is cached and the cache refuses to rebuild
     * objects (cache.serializable_classes = false), so a Collection here came
     * back as an incomplete object and blanked the page on every cached load.
     *
     * @return list<array{date: string, total: float, services: list<string>}>
     */
    private function collectionChart(Builder $collections): array
    {
        $days = (clone $collections)->toBase()
            ->selectRaw('offering_date, sum('.Money::sql().') as total')
            ->groupBy('offering_date')->orderByDesc('offering_date')->limit(10)->get();

        $services = (clone $collections)->whereIn('offering_date', $days->pluck('offering_date'))
            ->toBase()->select(['offering_date', 'service_type'])->distinct()->get()
            ->groupBy(fn ($r) => substr((string) $r->offering_date, 0, 10));

        return $days->sortBy('offering_date')->values()->map(fn ($d) => [
            'date' => substr((string) $d->offering_date, 0, 10),
            'total' => round((float) $d->total, 2),
            'services' => $services->get(substr((string) $d->offering_date, 0, 10), collect())->pluck('service_type')->values()->all(),
        ])->all();
    }

    protected function extraProps(): array
    {
        return [
            ...parent::extraProps(), 'types' => self::TYPES, 'services' => self::services(), 'serviceSessions' => ServiceSession::options(),
            // Staff only — this list used to include every member login (F07).
            'cashiers' => User::whereHas('roles', fn ($q) => $q->where('name', '!=', Role::MEMBER->value))
                ->orderBy('name')->limit(500)->pluck('name'),
        ];
    }
}
