---
name: tenant-security
description: 'Enforces church (tenant) data isolation and MySQL-appropriate row-level security for the Church Management System. Activate when creating or changing any model, migration, query, route parameter, validation rule (exists/unique), queued job, scheduled command, cache key, storage path, export, report, notification, Inertia shared prop, or Spatie role/permission that touches church-owned data; when introducing multi-church support; or when reviewing code for cross-tenant or cross-member data leaks. Owns security control C1 (tenant isolation with database-appropriate RLS).'
---

# Tenant Security (Control C1)

This skill owns **control C1: tenant isolation with database-appropriate row-level security**.
The full 19-control matrix lives in the `security-review` skill. Request-level controls
(validation, permissions, tokens) live in `laravel-api-security`. Query construction and
indexing live in `database-performance`. Do not restate those here; apply them alongside.

## 1. Verify the current tenancy state first

The application was a **single-church deployment** when this skill was written (2026-10-10):

- No table has a `church_id` (or other tenant) column.
- The church identity comes from `config('church.*')`, overridden at boot by
  `App\Support\ChurchSettings::apply()`.
- Spatie Permission runs with `'teams' => false` in `config/permission.php`.

Re-check before every task, because a tenancy migration may have landed since:

```bash
grep -rniE "church_id|tenant|BelongsToChurch|CurrentChurch" app database/migrations config/permission.php
php artisan config:show permission.teams
```

Then follow the row that matches what you find:

| Finding                          | What to do                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| No tenant column (single church) | Apply **Section 2** (in-church isolation) to every change. Apply **Sections 3 and 4** only when the user asks for multi-church support. |
| `church_id` present              | Apply **Sections 2 to 5** to every change.                                                                                              |

Never add tenancy columns, enable Spatie teams, or change `ChurchSettings` as a side effect of an
unrelated task. Introducing multi-tenancy is an architecture change that needs the user's approval.

## 2. In-church isolation (applies today)

Inside one church there are already hard data boundaries. Enforce them in policies and
queries, never only in React.

| Boundary                   | Rule                                                                                        | Where it lives today                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Member-only accounts       | See only their own linked `Member` record, giving and certificates.                         | `MemberPolicy::view` (`$member->user_id === $user->id`), `MemberPortalController`, `RedirectMembersToPortal` |
| Portal record claim        | A login may claim an unlinked member record only when it is verified and member-only (F05). | `MemberPortalController`; test `F05` in `tests/Feature/Security/Phase2SecurityTest.php`                      |
| Confidential pastoral care | Hidden from staff without `pastoral-care.confidential` (F04).                               | `PastoralCareController`, `AuditObserver::REDACTED`                                                          |
| Anonymous prayer requests  | The requester's identity never reaches the browser (F04).                                   | `PrayerRequestController`                                                                                    |
| Role hierarchy             | Admin cannot manage Superadmin or other Admins (F03).                                       | `UserPolicy`                                                                                                 |

Rules:

1. Every query that serves a member-only user constrains by that user's `Member` link in
   SQL (`where('member_id', $member->id)`). Never load a larger set and filter it in PHP.
2. Every `show`, `update` and `delete` for a confidential or owned record calls a policy
   (`Gate::authorize()` / `$this->authorize()`) after loading the record.
3. A missing or foreign record returns **404**, not 403, when the record's existence is itself
   sensitive (pastoral care, prayer requesters, other members' giving).
4. Inertia props and JSON never contain fields the viewer may not see. Strip them on the
   server. Hiding them in a component is not isolation.

## 3. Target multi-church design (when tenancy is introduced)

Tenant = **Church**. Use these names so all skills stay consistent:

| Concept                     | Name                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Tenant table / model        | `churches` / `App\Models\Church`                                                   |
| Foreign key on owned tables | `church_id` (`foreignId('church_id')->constrained()->restrictOnDelete()`)          |
| Model trait                 | `App\Models\Concerns\BelongsToChurch` (beside the existing `RecordsMoney` concern) |
| Request-scoped resolver     | `App\Support\CurrentChurch` (scoped container binding)                             |
| Spatie team key             | `team_id` holding the church id (`'teams' => true`)                                |

### 3.1 Resolve the tenant from trusted state only

- Web and API requests: from the **authenticated user's** `church_id`.
- Public website routes (`PublicSiteController`): from a server-side host-to-church map.
- Console commands and scheduled tasks: iterate churches explicitly and set the context per church.
- Queued jobs and notifications: carry `church_id` in the payload and restore it in job middleware.
- **Never** from a request body, query string, header, cookie or route parameter chosen by the client.

```php
<?php

namespace App\Support;

use App\Models\Church;
use LogicException;

/**
 * Holds the church whose data the current request, job or command may touch.
 * Fails closed: reading it before it is set throws instead of meaning "all churches".
 */
final class CurrentChurch
{
    private ?int $churchId = null;

    public function set(Church|int $church): void
    {
        $this->churchId = $church instanceof Church ? $church->id : $church;
    }

    public function id(): int
    {
        return $this->churchId ?? throw new LogicException('No current church has been resolved.');
    }

    public function isResolved(): bool
    {
        return $this->churchId !== null;
    }
}
```

Register it with `$this->app->scoped(CurrentChurch::class)` so long-running workers never
carry one church's context into the next request or job.

### 3.2 Scope every owned model

```php
<?php

namespace App\Models\Concerns;

use App\Models\Church;
use App\Support\CurrentChurch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Scopes a model to the current church and stamps church_id on create.
 * church_id can never change after creation.
 */
trait BelongsToChurch
{
    public static function bootBelongsToChurch(): void
    {
        static::addGlobalScope('church', function (Builder $query): void {
            $query->where($query->qualifyColumn('church_id'), app(CurrentChurch::class)->id());
        });

        static::creating(function (self $model): void {
            $currentChurchId = app(CurrentChurch::class)->id();
            $model->church_id ??= $currentChurchId;

            if ($model->church_id !== $currentChurchId) {
                throw new LogicException('Cannot create a record for another church.');
            }
        });

        static::updating(function (self $model): void {
            if ($model->isDirty('church_id')) {
                throw new LogicException('church_id is immutable.');
            }
        });
    }

    /** @return BelongsTo<Church, $this> */
    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}
```

- `church_id` must **not** appear in `#[Fillable]`. Only the trait sets it.
- `withoutGlobalScope('church')` is allowed only in platform-operator code and migrations, with a
  PHPDoc explaining why and a test proving church users cannot reach that code path.

### 3.3 Leak vectors that global scopes do NOT cover

Global scopes apply to Eloquent builders, including `->toBase()`. They do **not** cover the
vectors below, several of which this codebase already uses. Each needs an explicit constraint.

| Vector                           | Example in this codebase                                                | Required fix                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `DB::table()` query builder      | `App\Support\Sequence`, `ActivityController`, `MemberDuplicatesCommand` | Add `->where('church_id', $churchId)`                                                                          |
| `exists:` / `unique:` validation | Member pickers, receipt numbers, member email                           | `Rule::exists('members', 'id')->where('church_id', $churchId)`; same for `Rule::unique()`                      |
| Cache keys                       | `'birthdays-today:'.date` in `HandleInertiaRequests`                    | `"church:{$churchId}:birthdays-today:{$date}"`                                                                 |
| Sequence counters                | `Sequence::next('receipt', ...)`                                        | Counter row keyed by church                                                                                    |
| Unique indexes                   | Receipt numbers, member IDs, `members.email`                            | Composite: `unique(['church_id', 'receipt_no'])`                                                               |
| FULLTEXT search                  | `members_search_fulltext`                                               | Always combine `MATCH ... AGAINST` with `church_id = ?`                                                        |
| Storage paths                    | `uploads/images`, `documents`                                           | `documents/{church_id}/...`; authorize downloads by record, never by path                                      |
| Raw SQL and triggers             | `pivot_member_count_triggers` migration                                 | Triggers join on `church_id` as well                                                                           |
| Queued jobs and mail             | `MemberAccountInvitation`, `BirthdayNoticeCommand`                      | Pass `church_id`; restore `CurrentChurch` before work                                                          |
| Shared Inertia props             | `pendingMembersCount`, `notificationSummary`                            | Scoped only if the models use the trait. Verify each one.                                                      |
| Audit and activity logs          | `audit_logs`, `user_activities`                                         | Store `church_id`; readers scoped                                                                              |
| Spatie permission cache          | `spatie.permission.cache`                                               | Teams mode; call `setPermissionsTeamId()` in middleware after auth                                             |
| Sanctum tokens                   | `personal_access_tokens`                                                | The token's user decides the church. Never accept a church id next to a token.                                 |
| `Gate::before` Superadmin bypass | `AppServiceProvider`                                                    | A church Superadmin bypasses permissions, **not** the church scope. A platform operator needs a separate role. |

## 4. Database-appropriate RLS on MySQL

MySQL has **no native row-level security**. Do not write or claim "RLS policies" for MySQL.
MySQL views also cannot reference user variables, so a "view filtered by a session variable"
is not available. Use these layers. Layer 1 is mandatory; layers 2 to 4 are defense in depth.

1. **Application scope (primary).** `BelongsToChurch` on every owned model, plus explicit
   constraints for each vector in 3.3.
2. **Composite foreign keys.** These make cross-church references impossible in the database.

    ```php
    // Parent: allow (church_id, id) to be referenced.
    Schema::table('members', function (Blueprint $table): void {
        $table->unique(['church_id', 'id'], 'members_church_id_id_unique');
    });

    // Child: the referenced member must belong to the same church.
    Schema::table('tithes', function (Blueprint $table): void {
        $table->foreign(['church_id', 'member_id'], 'tithes_church_member_fk')
            ->references(['church_id', 'id'])->on('members')
            ->restrictOnDelete();
    });
    ```

3. **Least-privilege database accounts.** The runtime account gets data rights only.
   Migrations run with a separate account.

    ```sql
    GRANT SELECT, INSERT, UPDATE, DELETE ON church_management_system.* TO 'church_app'@'%';
    GRANT ALL PRIVILEGES ON church_management_system.* TO 'church_migrator'@'%';
    ```

    Never run production with `DB_USERNAME=root`. The local `.env` uses `root`, which is
    acceptable only on a developer machine.

4. **Guard triggers** where a composite FK cannot apply, such as polymorphic columns like
   `notifications.recipient_id`. Raise `SIGNAL SQLSTATE '45000'` on a church mismatch. Follow the
   driver check in the existing triggers migration: create on `mysql`/`mariadb`, skip on SQLite.

If the project ever moves to PostgreSQL, replace layer 4 with native RLS:
`ALTER TABLE members ENABLE ROW LEVEL SECURITY;` plus a policy on
`church_id = current_setting('app.church_id')::bigint`, set per transaction.

## 5. Testing tenant isolation

Read the `testing-best-practices` skill first. Only `UserFactory` exists today. Create factories
with `php artisan make:factory MemberFactory --model=Member --no-interaction` when a test needs one.

Every tenant-owned resource needs tests for **index, show, update, delete, `exists` validation
and export** across two churches. Pattern:

```php
test('C1: a church admin cannot read or change another church\'s member', function () {
    [$churchA, $churchB] = Church::factory()->count(2)->create();
    $adminA = User::factory()->for($churchA)->create()->assignRole('Admin');
    $memberB = Member::factory()->for($churchB)->create();

    $this->actingAs($adminA)
        ->patch(route('members.update', $memberB->id), ['first_name' => 'Changed'])
        ->assertNotFound();

    $this->actingAs($adminA)
        ->delete(route('members.destroy', $memberB->id))
        ->assertNotFound();

    expect($memberB->fresh())->not->toBeNull()
        ->and($memberB->fresh()->first_name)->not->toBe('Changed');
});
```

Use the route names that actually exist. Members are served under `member-management/{member}`
(`members.update`, `members.destroy`); check others with `php artisan route:list --name=<module>`.
For in-church boundaries, extend the existing F04 and F05 tests in
`tests/Feature/Security/Phase2SecurityTest.php` rather than creating a parallel file.

```bash
php artisan test --compact --filter=C1
php artisan test --compact tests/Feature/Security
```

The default suite runs on in-memory SQLite (`phpunit.xml`), which skips MySQL-only triggers and
composite-FK enforcement. Verify layers 2 and 4 against a **dedicated, disposable MySQL test
database**. `RefreshDatabase` wipes it, so never point this at `church_management_system`:

```bash
DB_CONNECTION=mysql DB_DATABASE=church_testing php artisan test --compact tests/Feature/Security
```

## 6. Review checklist

- [ ] Tenancy state re-verified with the grep in Section 1.
- [ ] Every new church-owned table has `church_id`, an index leading with `church_id`, and composite unique keys.
- [ ] Every new church-owned model uses `BelongsToChurch`; `church_id` is not fillable.
- [ ] No tenant id is read from client input anywhere in the diff.
- [ ] Every `DB::table`, raw query, `exists`/`unique` rule, cache key, storage path and job in the diff is church-scoped.
- [ ] No new `withoutGlobalScope('church')` or `withoutGlobalScopes()` without documented justification and a test.
- [ ] Member-only, confidential pastoral and anonymous prayer boundaries still hold (F04 and F05 tests pass).
- [ ] Cross-tenant access returns 404 and leaves data unchanged.
- [ ] MySQL-only protections were run against a disposable MySQL database, or the gap is reported.

## 7. Acceptance criteria

A change touching church-owned data is done only when:

1. A user from church A gets **404** for every read, write and delete of church B's records, proven by a test per resource.
2. Validation rejects foreign-church IDs submitted in any field.
3. Lists, counts, totals, exports, search results, shared props and notifications include only the current church's rows.
4. On MySQL, database constraints (composite FKs or guard triggers) reject a cross-church reference inserted directly in SQL.
5. Member-only users reach only their own records, and confidential pastoral content stays hidden without `pastoral-care.confidential`.
6. The affected tests were actually run and their output reported. Nothing is claimed as passing without a run.
