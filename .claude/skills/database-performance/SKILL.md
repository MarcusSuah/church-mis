---
name: database-performance
description: "Safe and fast MySQL access for the Church Management System. Activate when writing or reviewing Eloquent or query-builder code, raw SQL fragments (selectRaw, whereRaw, orderByRaw, DB::raw, DB::select, DB::statement, DB::unprepared), migrations, indexes, FULLTEXT search, triggers, pagination, sorting, filtering, reports, exports, aggregates, caching, counters or locking; when a page is slow or issues many queries; or when running perf:seed or perf:explain. Owns security control C3 (parameterized SQL) and the project's query-performance standards."
---

# Database Performance and Parameterized SQL (Control C3)

This skill owns **control C3: parameterized SQL**, plus performance rules for MySQL.
Tenant constraints on queries are defined in `tenant-security`. Do not duplicate them here,
but apply them to every query you write.

## 1. Know the database setup

| Environment       | Driver                                                             | Source                             |
| ----------------- | ------------------------------------------------------------------ | ---------------------------------- |
| Local development | MySQL (`DB_CONNECTION=mysql`, database `church_management_system`) | `.env`                             |
| Tests             | SQLite in memory                                                   | `phpunit.xml`                      |
| Production target | MySQL 8                                                            | migrations and `perf:explain` docs |

Inspect before you change anything:

- Use the Boost `database-schema` tool for table structure and `database-query` for read-only checks.
- `php artisan db:show` and `php artisan db:table members` for indexes and sizes.

Because tests use SQLite, MySQL-only features are guarded by driver checks in migrations. Follow
the existing pattern in `2026_10_09_170514_query_indexes.php.php` (FULLTEXT) and
`2026_10_09_144006_create_pivot_member_count_triggers.php.php` (triggers):

```php
if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
    DB::statement('ALTER TABLE members ADD FULLTEXT members_search_fulltext (first_name, last_name, email)');
}
```

Every MySQL-only branch needs a matching `down()` branch.

For date expressions inside SQL (grouping by month, matching birthdays by month and day) use
`App\Support\SqlDate::yearMonth()` and `SqlDate::monthDay()`, which return the right SQL for MySQL and SQLite.

## 2. C3: Parameterized SQL

### 2.1 Rules

1. **Values always travel as bindings.** Use Eloquent and query-builder methods, or `?` placeholders
   with a bindings array on every `*Raw` method and `DB::select`.
2. **Identifiers never come from input.** Column names, sort fields, directions, table names and
   SQL keywords cannot be bound. Map user choices through a whitelist defined in code.
3. **Raw fragments come from code constants only.** `App\Support\Money::sql()` is acceptable because it
   is built from code, not from the request. Any new helper that returns SQL must document that guarantee.
4. **LIKE searches escape wildcards.** Use `ListQuery::search()` or `ListQuery::whereLike()`, which bind the
   pattern and escape `%`, `_` and `!` with `ESCAPE '!'`.
5. **Lists of values use `whereIn()`**, never `implode()` into SQL.
6. **`DB::unprepared()` is for migrations only**, with no variable input.
7. **JSON columns** use `where('settings->key', $value)` or `whereJsonContains()`, never string-built JSON paths.

### 2.2 Unsafe and safe forms

```php
// UNSAFE: input concatenated into SQL.
Member::whereRaw("last_name = '{$request->last_name}'")->get();
Member::orderByRaw($request->input('sort').' '.$request->input('dir'))->get();
DB::select("SELECT * FROM tithes WHERE fund_name = '$fund'");

// SAFE: bound values.
Member::where('last_name', $request->string('last_name'))->get();
DB::select('SELECT id, amount FROM tithes WHERE fund_name = ?', [$fund]);
ListQuery::search($query, $filters['search'], ['first_name', 'last_name', 'email']);

// SAFE: whitelisted identifiers.
$sortable = ['name' => 'last_name', 'joined' => 'membership_date', 'status' => 'status'];
$column = $sortable[$request->string('sort')->toString()] ?? 'last_name';
$direction = $request->string('dir')->toString() === 'desc' ? 'desc' : 'asc';
$query->orderBy($column, $direction);
```

### 2.3 Audit raw SQL in a change

```bash
grep -rnE "whereRaw|selectRaw|orderByRaw|havingRaw|groupByRaw|DB::raw|DB::select|DB::statement|DB::unprepared" app database
```

For each hit, confirm that every interpolated piece (`{$x}`, `.$x.`) comes from code, and that request
data reaches SQL only through bindings. A first pass on 2026-10-10 found only code-built fragments in
`app/`, such as `ReportController` group-bys, `PendingRegistrationController` `CASE` ordering, and
`ListQuery::whereLike()` with code-supplied column names. Re-check every hit; do not rely on that pass.

### 2.4 Test for it

```php
test('C3: SQL metacharacters in a search are treated as text', function () {
    $staff = User::factory()->create()->givePermissionTo('members.view');

    $this->actingAs($staff)
        ->get(route('members.index', ['search' => "x' OR '1'='1", 'sort' => 'id; DROP TABLE members']))
        ->assertOk();

    expect(Schema::hasTable('members'))->toBeTrue();
});
```

The existing F07 test `'search terms with LIKE wildcards are matched literally'` in
`tests/Feature/Performance/Phase3DatabaseTest.php` covers LIKE escaping. Extend that file for new list endpoints.

## 3. Query performance standards

### 3.1 Lists and pages

- Filter, sort and paginate in SQL. The browser receives one page (F07). Use `ListQuery::filters()`,
  `ListQuery::perPage()` (allowed sizes 10, 20, 25, 50, 100) and `ListQuery::meta()` for the React paginator.
- Select only needed columns for list pages: `->select(['id', 'first_name', 'last_name', 'status'])`.
- Totals for the whole filtered set come from one aggregate query on a clone of the base query, as the
  finance and pastoral controllers already do with `(clone $all)->toBase()->selectRaw(...)`.
- Prefer `paginate()` for staff tables. Use `cursorPaginate()` for very large, append-only lists such as activity logs.
- `?edit=<id>` loads that one record directly, not by paging (F07).

### 3.2 N+1 queries

- Eager load relations used by the response: `->with(['family:id,name'])`, `->withCount('members')`.
- In non-production, `Model::preventLazyLoading(! app()->isProduction())` surfaces N+1 issues.
  It is **not** enabled in `AppServiceProvider` today. Propose it to the user; do not enable it in an unrelated change.
- Prove query counts stay flat as rows grow. Follow the F07 test pattern:

    ```php
    DB::enableQueryLog();
    $this->actingAs($staff)->get(route('tithes.index'))->assertOk();
    $queriesWithFewRows = count(DB::getQueryLog());
    // seed 50 more rows, repeat, then:
    expect(count(DB::getQueryLog()))->toBe($queriesWithFewRows);
    ```

### 3.3 Inertia shared props

`HandleInertiaRequests::share()` runs on every request. New shared values must:

- be wrapped in a closure (`fn () => ...`) so partial reloads skip them;
- check permission before querying, as `pendingMembersCount` does;
- be a single indexed `count()` or a short cached value. Never a list of records.

Heavy page data uses `Inertia::defer()` or `Inertia::optional()`, and the page shows a skeleton while it loads.

### 3.4 Indexes

- Design composite indexes to match `WHERE` equality columns first, then range or `ORDER BY` columns.
  Example from `query_indexes`: `members (status, last_name, first_name)` for "filter by status, sort by name".
- Once tenancy exists, every composite index on a church-owned table starts with `church_id`.
- A leading-wildcard `LIKE '%term%'` cannot use a B-tree index. Use `ListQuery::whereLike(..., 'prefix')` where a
  prefix match is acceptable, or the members FULLTEXT index on MySQL.
- Do not wrap indexed columns in functions in `WHERE` (`YEAR(created_at) = ?`). Use ranges:
  `whereBetween('created_at', [$start, $end])`.
- Foreign keys get indexes (Laravel's `foreignId()->constrained()` adds them).
- Every new index has a reason tied to a real query. Check it with `EXPLAIN` before and after.

### 3.5 Writes, money and concurrency

- Money columns are `decimal`, never `float`. Each record keeps its currency and exchange rate (F06, F26);
  totals convert with the stored rate via `Money`.
- Number generators use `App\Support\Sequence::next()`, which locks one counter row inside a transaction.
  Never compute `MAX(x) + 1` (F06, F11).
- Multi-row writes that must agree run in `DB::transaction(fn () => ..., attempts: 3)`.
- Use `lockForUpdate()` only inside a transaction and only on the rows you will change.
- Financial records keep history. Deleting one soft-deletes it (F06). Do not add hard deletes for finance tables.
- `DB::prohibitDestructiveCommands()` is on in production. Do not work around it.

### 3.6 Exports, reports and batch jobs

- Stream large exports with `chunkById()` or `lazyById()`, not `get()` on an unbounded query.
  CSV cells go through `App\Support\Csv`, which neutralises spreadsheet formulas (F13).
- Reports aggregate in SQL with `groupBy` and bound date ranges.
- Long batch work (birthday notices, mass mail) runs in queued jobs or chunked commands.

### 3.7 Caching

- Cache only derived, non-sensitive values, with a TTL. Example: `birthdays-today:{date}` for 600 seconds.
- Keys include every dimension the value depends on: date, user id for per-user data, and church id once tenancy exists.
- Never cache permission-filtered data under a key that does not include the user or role.
- Clear or version the key when the underlying data changes, or keep the TTL short enough to accept staleness.
- Whole-table counts and totals on the money tables (tithes, offerings, donations, expenses) go through
  `App\Support\StatsCache::remember()` (or `RecordsController::cachedStat()`). `RecordsMoney` flushes it whenever a
  record is saved, deleted or restored, so figures stay exact. Writes that bypass Eloquent (`DB::table()->update()`)
  must call `StatsCache::flush(Model::class)` themselves.
- Never load rows into PHP to aggregate them. Group and sum in SQL, as `DashboardController::givingByMonth()` does.

## 4. Migrations on MySQL

- Create with `php artisan make:migration <name> --no-interaction`. Some existing files end in `.php.php`.
  Do not copy that suffix.
- Every migration has a working `down()`.
- `utf8mb4` strings: keep indexed `string` columns at the default 255 or less.
- On large tables, add indexes and columns in separate migrations. Check whether MySQL can do the change online
  (`ALGORITHM=INPLACE, LOCK=NONE`) before running it on production data.
- Never edit a migration that has already run in production. Add a new one.
- Back up the database before running migrations in production. See `testing-and-release`.

## 5. Measuring

```bash
# Staging or a disposable local database only. perf:seed inserts very large row counts
# (defaults: 100,000 members and 1,000,000 tithes). Never run it against production.
php artisan perf:seed --members=20000 --gifts=100000

# Read-only. Prints EXPLAIN (MySQL) or EXPLAIN QUERY PLAN (SQLite) and median timings.
php artisan perf:explain --runs=5 --search=kof
php artisan perf:explain --plans
```

Read the MySQL plan: `key` should name an index, `rows` should be small, and `type = ALL` means a full scan.

Tests:

```bash
php artisan test --compact tests/Feature/Performance
php artisan test --compact --filter=F07
```

MySQL-only behaviour (FULLTEXT, triggers, `lockForUpdate` contention) is not exercised on SQLite. Run the
affected tests against a disposable MySQL database and say so in the report:

```bash
DB_CONNECTION=mysql DB_DATABASE=church_testing php artisan test --compact tests/Feature/Performance
```

## 6. Review checklist

- [ ] No request value is concatenated into SQL; every `*Raw` call uses bindings or code-only fragments.
- [ ] Sort columns and directions come from a whitelist.
- [ ] LIKE searches go through `ListQuery`.
- [ ] List endpoints paginate in SQL, select needed columns, and eager load relations.
- [ ] Query count does not grow with row count (test or measured).
- [ ] New indexes match a real query and were checked with `EXPLAIN`.
- [ ] Money stays `decimal`; counters use `Sequence`; multi-row writes use transactions.
- [ ] Exports stream with chunking and pass cells through `Csv`.
- [ ] MySQL-only migrations have driver guards and a reversible `down()`.
- [ ] Cache keys include every dimension, including the church once tenancy exists.
- [ ] Tenant constraints from `tenant-security` are present on every new query.

## 7. Acceptance criteria

1. Injection payloads in search, filter, sort and id parameters are treated as data: no SQL error, no extra rows, schema intact.
2. Every list endpoint returns one page, with a stable query count independent of table size.
3. `perf:explain` (or `EXPLAIN`) shows index use for each new or changed hot query on MySQL.
4. Migrations run and roll back cleanly on both SQLite (tests) and MySQL.
5. The affected tests were run, on MySQL where the behaviour is MySQL-specific, and the output was reported.
