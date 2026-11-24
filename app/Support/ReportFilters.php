<?php

namespace App\Support;

use App\Enums\ExpenseCategory;
use App\Enums\ServiceType;
use App\Models\Event;
use App\Models\FinanceFund;
use App\Models\Member;
use App\Models\PastoralCare;
use App\Models\PrayerRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * The filters each report offers (e.g. only male members, only the Youth
 * department, only Sunday Worship, only the Building Fund) and how they narrow
 * its queries. The same object drives the screen, the PDF and the CSV/Excel
 * export, so all three always show the same records.
 *
 * Values are only accepted when they are one of the listed options, so they
 * are safe to use in queries.
 */
final class ReportFilters
{
    /** Income sources a finance report can be narrowed to. */
    public const INCOME = ['tithes' => 'Tithes', 'offerings' => 'Offerings', 'donations' => 'Donations'];

    /** Sacraments a sacraments report can be narrowed to. */
    public const SACRAMENTS = ['baptisms' => 'Baptisms', 'communions' => 'Communion services', 'weddings' => 'Weddings', 'funerals' => 'Funerals'];

    /** @param  array<string, string>  $values  filter key => accepted option value */
    private function __construct(private readonly string $type, private readonly array $values) {}

    /** No filters (the whole report). */
    public static function none(string $type = 'membership'): self
    {
        return new self($type, []);
    }

    /** The filters in the request that are valid for this report; anything else is ignored. */
    public static function fromRequest(Request $request, string $type): self
    {
        $values = [];
        foreach (self::definitions($type) as $key => $definition) {
            $value = $request->query($key);
            if (is_string($value) && array_key_exists($value, $definition['options'])) {
                $values[$key] = $value;
            }
        }

        return new self($type, $values);
    }

    /**
     * The filters a report type offers, with their choices taken from the
     * church's own records.
     *
     * @return array<string, array{label: string, options: array<string, string>}>
     */
    public static function definitions(string $type): array
    {
        $members = fn () => [
            'gender' => ['label' => 'Gender', 'options' => self::distinct(Member::query(), 'gender', fn (string $g) => ucfirst($g))],
            'status' => ['label' => 'Member status', 'options' => self::distinct(Member::query(), 'status')],
            'department' => ['label' => 'Department', 'options' => self::distinct(Member::query(), 'department')],
        ];
        $finance = fn () => [
            'income' => ['label' => 'Income type', 'options' => self::INCOME],
            'fund' => ['label' => 'Fund', 'options' => collect(['General Fund'])->merge(FinanceFund::orderBy('name')->pluck('name'))
                ->unique()->sort()->mapWithKeys(fn (string $f) => [$f => $f])->all()],
            'category' => ['label' => 'Expense category', 'options' => collect(ExpenseCategory::cases())
                ->mapWithKeys(fn (ExpenseCategory $c) => [$c->value => ChartData::headline($c->value)])->all()],
        ];

        return match ($type) {
            'membership' => $members(),
            'finance' => $finance(),
            'full' => [...$members(), ...$finance()],
            'attendance' => ['service' => ['label' => 'Service', 'options' => ServiceType::options()]],
            'sacraments' => ['sacrament' => ['label' => 'Sacrament', 'options' => self::SACRAMENTS]],
            'ministry' => [
                'prayer_status' => ['label' => 'Prayer request status', 'options' => self::distinct(PrayerRequest::query(), 'status')],
                'care_status' => ['label' => 'Pastoral care status', 'options' => self::distinct(PastoralCare::query(), 'status')],
            ],
            'events' => [
                'event_type' => ['label' => 'Event type', 'options' => self::distinct(Event::query(), 'event_type')],
                'event_status' => ['label' => 'Event status', 'options' => self::distinct(Event::query(), 'status')],
            ],
            default => [],
        };
    }

    /** @return array<string, string> */
    public function values(): array
    {
        return $this->values;
    }

    public function get(string $key): ?string
    {
        return $this->values[$key] ?? null;
    }

    public function isEmpty(): bool
    {
        return $this->values === [];
    }

    /** Part of cache keys, so a filtered report never reuses the unfiltered figures. */
    public function hash(): string
    {
        return $this->isEmpty() ? 'all' : md5(json_encode($this->values));
    }

    /** "Gender: Male · Department: Youth", for headings, the PDF and file names. */
    public function describe(): string
    {
        $definitions = self::definitions($this->type);

        return collect($this->values)
            ->map(fn (string $value, string $key) => ($definitions[$key]['label'] ?? $key).': '.($definitions[$key]['options'][$value] ?? $value))
            ->implode(' · ');
    }

    /** Whether any member filter (gender, status, department) is set. */
    public function filtersMembers(): bool
    {
        return array_intersect_key($this->values, array_flip(['gender', 'status', 'department'])) !== [];
    }

    /* ----------------------------------------------------------- appliers */

    /** @template T of Builder @param T $query @return T */
    public function members(Builder $query): Builder
    {
        foreach (['gender', 'status', 'department'] as $key) {
            if ($value = $this->get($key)) {
                $query->where($query->qualifyColumn($key), $value);
            }
        }

        return $query;
    }

    /** @template T of Builder @param T $query @return T */
    public function sessions(Builder $query): Builder
    {
        return $this->get('service') ? $query->where('service_type', $this->get('service')) : $query;
    }

    /**
     * Gifts of one source (tithes, offerings or donations). When another
     * income type is chosen this source contributes nothing.
     *
     * @template T of Builder @param T $query @return T
     */
    public function gifts(Builder $query, string $source): Builder
    {
        if ($this->get('income') && $this->get('income') !== $source) {
            $query->whereRaw('1 = 0');
        }

        return $this->get('fund') ? $query->where('fund_name', $this->get('fund')) : $query;
    }

    /** Whether a gift source is part of this report (false when another income type is chosen). */
    public function includesIncome(string $source): bool
    {
        return ! $this->get('income') || $this->get('income') === $source;
    }

    /** @template T of Builder @param T $query @return T */
    public function expenses(Builder $query): Builder
    {
        if ($fund = $this->get('fund')) {
            $query->where('fund_name', $fund);
        }

        return $this->get('category') ? $query->where('category', $this->get('category')) : $query;
    }

    public function includesSacrament(string $kind): bool
    {
        return ! $this->get('sacrament') || $this->get('sacrament') === $kind;
    }

    /** @template T of Builder @param T $query @return T */
    public function prayers(Builder $query): Builder
    {
        return $this->get('prayer_status') ? $query->where('status', $this->get('prayer_status')) : $query;
    }

    /** @template T of Builder @param T $query @return T */
    public function care(Builder $query): Builder
    {
        return $this->get('care_status') ? $query->where('status', $this->get('care_status')) : $query;
    }

    /** @template T of Builder @param T $query @return T */
    public function events(Builder $query): Builder
    {
        if ($type = $this->get('event_type')) {
            $query->where('event_type', $type);
        }

        return $this->get('event_status') ? $query->where('status', $this->get('event_status')) : $query;
    }

    /**
     * Distinct non-empty values of a column as value => label.
     *
     * @return array<string, string>
     */
    private static function distinct(Builder $query, string $column, ?callable $label = null): array
    {
        return $query->toBase()->whereNotNull($column)->where($column, '!=', '')
            ->distinct()->orderBy($column)->pluck($column)
            ->mapWithKeys(fn ($v) => [(string) $v => $label ? $label((string) $v) : (string) $v])
            ->all();
    }
}
