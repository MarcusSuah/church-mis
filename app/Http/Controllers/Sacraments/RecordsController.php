<?php

namespace App\Http\Controllers\Sacraments;

use App\Http\Controllers\Controller;
use App\Models\Concerns\RecordsMoney;
use App\Models\FinanceFund;
use App\Models\Member;
use App\Support\ListQuery;
use App\Support\StatsCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Shared list/create/update/delete for the simple record modules
 * (pastoral care, baptisms, communions, weddings, funerals). Each child
 * says which model, page, permission prefix and validation rules it uses.
 */
abstract class RecordsController extends Controller
{
    /** @var class-string<Model> */
    protected string $model;

    protected string $page;

    protected string $permission;

    protected string $label;

    protected string $orderBy;

    /** Validation rules for create/update. */
    abstract protected function rules(): array;

    /** Shape one record for the page. */
    abstract protected function present(Model $record): array;

    /** Extra props for the page (e.g. member options). */
    protected function extraProps(): array
    {
        return [];
    }

    /**
     * Records this user may see or change. Children narrow it (e.g. pastoral
     * care hides confidential cases from people without access). Every read
     * and write goes through it, so a hidden record answers 404.
     */
    protected function visibleQuery(): Builder
    {
        return $this->model::query();
    }

    /** Adjust validated data before saving (e.g. fill names from linked members). */
    protected function prepare(array $data, ?Model $record = null): array
    {
        return $data;
    }

    /** Columns the search box looks in. */
    protected function searchColumns(): array
    {
        return [];
    }

    /**
     * Drop-down filters: key => [values (null = free text), apply(Builder, value)].
     * The value 'All' (or anything not allowed) means "no filter".
     *
     * @return array<string, array{values: array<int, string>|null, apply: callable}>
     */
    protected function filters(): array
    {
        return [];
    }

    /** Newest first by default. */
    protected function sort(Builder $query): Builder
    {
        return $query->orderByDesc($this->orderBy)->orderByDesc($query->getModel()->getQualifiedKeyName());
    }

    /**
     * Figures for the cards above the list, computed in SQL.
     * $all = everything this user may see; $filtered = with search/filters applied.
     */
    protected function stats(Builder $all, Builder $filtered): array
    {
        return ['total' => $all->count(), 'filtered' => $filtered->count()];
    }

    protected int $perPage = 20;

    /** True when the current list request has no search and every filter is "All". */
    protected bool $unfiltered = false;

    /**
     * Whole-table figures are cached only for the money tables (tithes,
     * offerings, donations, expenses): they are large, the same for every
     * viewer, and RecordsMoney clears the cache whenever a record changes.
     */
    protected function cachesTotals(): bool
    {
        return in_array(RecordsMoney::class, class_uses_recursive($this->model), true);
    }

    /**
     * @template TValue
     *
     * @param  \Closure(): TValue  $compute
     * @return TValue
     */
    /**
     * Every row of $query, with an always-true lower bound on the (NOT NULL) date column.
     * The bound makes MySQL use the covering date indexes for whole-table counts and
     * sums on the money tables; without it, it reads every row (minutes on large tables).
     */
    protected function wholeTable(Builder $query): Builder
    {
        return (clone $query)->where($query->qualifyColumn($this->orderBy), '>=', '1000-01-01');
    }

    protected function cachedStat(string $key, \Closure $compute): mixed
    {
        return $this->cachesTotals() ? StatsCache::remember($this->model, $key, $compute) : $compute();
    }

    /** Value a filter takes when the request gives none (default: 'All'). */
    protected function filterDefaults(): array
    {
        return [];
    }

    /**
     * One page of records (Phase 3, F07): filtered, sorted and paginated in
     * the database instead of sending the whole table to the browser.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = ListQuery::filters($request, collect($this->filters())->map(fn ($f) => $f['values'])->all());
        foreach ($this->filterDefaults() as $key => $default) {
            if (($filters[$key] ?? 'All') === 'All' && ! $request->filled($key)) {
                $filters[$key] = $default;
            }
        }

        $this->unfiltered = ($filters['search'] ?? '') === ''
            && collect($this->filters())->keys()->every(fn ($key) => ($filters[$key] ?? 'All') === 'All');

        $filtered = $this->applyFilters($this->visibleQuery(), $filters);
        // An unfiltered list of a large money table reuses the cached row count instead of COUNT(*) on every page.
        $total = $this->unfiltered && $this->cachesTotals()
            ? $this->cachedStat('count', fn () => $this->wholeTable($this->visibleQuery())->count())
            : null;
        $page = $this->sort(clone $filtered)
            ->paginate(ListQuery::perPage($request, $this->perPage), ['*'], 'page', null, $total)
            ->withQueryString();

        // ?edit=<id> opens that record even when it is not on the current page.
        $focus = null;
        if ($request->filled('edit') && is_string($request->query('edit'))) {
            $record = $this->visibleQuery()->find($request->query('edit'));
            $focus = $record ? $this->present($record) : null;
        }

        return Inertia::render($this->page, [
            'records' => collect($page->items())->map(fn (Model $r) => $this->present($r))->values(),
            'pagination' => ListQuery::meta($page),
            'filters' => $filters,
            'stats' => $this->stats($this->visibleQuery(), $filtered),
            'focus' => $focus,
            'can' => [
                'create' => $user->can("{$this->permission}.create"),
                'update' => $user->can("{$this->permission}.update"),
                'delete' => $user->can("{$this->permission}.delete"),
            ],
            ...$this->extraProps(),
        ]);
    }

    private function applyFilters(Builder $query, array $filters): Builder
    {
        ListQuery::search($query, $filters['search'] ?? '', $this->searchColumns());

        foreach ($this->filters() as $key => $filter) {
            $value = $filters[$key] ?? 'All';
            if ($value !== 'All') {
                ($filter['apply'])($query, $value);
            }
        }

        return $query;
    }

    public function store(Request $request): RedirectResponse
    {
        $this->model::create($this->prepare($this->validated($request)));
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$this->label} added."]);

        return back();
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $record = $this->visibleQuery()->findOrFail($id);
        $record->update($this->prepare($this->validated($request), $record));
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$this->label} updated."]);

        return back();
    }

    public function destroy(string $id): RedirectResponse
    {
        $this->visibleQuery()->findOrFail($id)->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$this->label} deleted."]);

        return back();
    }

    private function validated(Request $request): array
    {
        $data = $request->validate($this->rules());

        // Empty strings from the form become NULL.
        return array_map(fn ($v) => $v === '' ? null : $v, $data);
    }

    protected static function d(mixed $v): ?string
    {
        return $v instanceof \DateTimeInterface ? $v->format('Y-m-d') : ($v ?: null);
    }

    /** Enum → its value, anything else unchanged. */
    protected static function v(mixed $v): mixed
    {
        return $v instanceof \BackedEnum ? $v->value : $v;
    }

    /** Active funds for the "Fund" select. */
    protected function fundOptions(): Collection
    {
        return FinanceFund::where('is_active', true)->orderBy('name')->get(['id', 'name']);
    }

    /** Fill fund_name from fund_id (or default to General Fund). */
    protected function withFund(array $data): array
    {
        $data['fund_name'] = ! empty($data['fund_id'])
            ? (FinanceFund::whereKey($data['fund_id'])->value('name') ?? 'General Fund')
            : 'General Fund';

        return $data;
    }

    protected static function t(mixed $v): ?string
    {
        return $v ? substr((string) $v, 0, 5) : null;
    }
}
