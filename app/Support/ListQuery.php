<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Server-side list helpers shared by the Inertia pages now and the
 * /api/v1 endpoints in Phase 7 (Phase 3, F07/F17).
 *
 * Every list is filtered, sorted and paginated in the database; the browser
 * only ever receives one page.
 */
final class ListQuery
{
    public const MAX_SEARCH = 100;

    /**
     * Escape LIKE wildcards so a search for "50%" or "a_b" means exactly that.
     * Uses '!' as the escape character because it behaves the same on MySQL,
     * MariaDB, PostgreSQL and SQLite (a backslash does not).
     */
    public static function escape(string $term): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term);
    }

    /**
     * WHERE column LIKE … with the term escaped. $mode 'contains' or 'prefix'
     * (prefix can use an index). Column names come from code only, never input.
     */
    public static function whereLike(Builder|\Illuminate\Database\Query\Builder $query, string $column, string $term, string $mode = 'contains', string $boolean = 'and'): Builder|\Illuminate\Database\Query\Builder
    {
        $pattern = ($mode === 'prefix' ? '' : '%').self::escape($term).'%';

        return $query->whereRaw("{$column} LIKE ? ESCAPE '!'", [$pattern], $boolean);
    }

    /** Case-insensitive "contains" across the given columns (column names come from code only). */
    public static function search(Builder $query, ?string $term, array $columns): Builder
    {
        $term = trim((string) $term);
        if ($term === '' || $columns === []) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term, $columns) {
            foreach ($columns as $column) {
                self::whereLike($q, $column, $term, 'contains', 'or');
            }
        });
    }

    /**
     * Read the search box and the allowed filters from the request.
     * A filter value outside its allowed list falls back to 'All'.
     *
     * @param  array<string, array<int, string>|null>  $allowed  filter key => allowed values (null = any short string)
     * @return array<string, string>
     */
    public static function filters(Request $request, array $allowed): array
    {
        $out = ['search' => mb_substr(trim($request->string('search')->toString()), 0, self::MAX_SEARCH)];

        foreach ($allowed as $key => $values) {
            $value = mb_substr(trim($request->string($key)->toString()), 0, self::MAX_SEARCH);
            $out[$key] = $value !== '' && ($values === null || in_array($value, $values, true)) ? $value : 'All';
        }

        return $out;
    }

    /** Pagination metadata the React Paginator understands. */
    public static function meta(\Illuminate\Contracts\Pagination\LengthAwarePaginator $page): array
    {
        return [
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'from' => $page->firstItem(),
            'to' => $page->lastItem(),
            'links' => $page->linkCollection()->toArray(),
        ];
    }

    /** Page size from ?per_page, limited to sensible values. */
    public static function perPage(Request $request, int $default = 20): int
    {
        $n = $request->integer('per_page', $default);

        return in_array($n, [10, 20, 25, 50, 100], true) ? $n : $default;
    }
}
