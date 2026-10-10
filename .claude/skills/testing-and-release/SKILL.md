---
name: testing-and-release
description: 'Test strategy, quality gates and release procedure for the Church Management System (Pest 5 on Laravel 13, TypeScript and Vite checks, MySQL parity runs). Activate when choosing or running tests, deciding what must pass before merge or deploy, preparing a production release or environment, auditing or updating Composer or npm dependencies, checking production debug settings, running migrations in production, or verifying a deployment. Owns security controls C9 (production debugging restrictions) and C19 (dependency auditing).'
---

# Testing and Release (Controls C9 and C19)

This skill owns **C9 production debugging restrictions** and **C19 dependency auditing**, and defines
the test and release gates. Which security behaviours need tests comes from the owning skills listed in the
`security-review` control matrix. Read `testing-best-practices` before writing tests.

## 1. Test stack (verify before use)

```bash
composer show pestphp/pest pestphp/pest-plugin-laravel larastan/larastan laravel/pint
```

| Item            | Value on 2026-10-10                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Runner          | Pest 5.3 with `pest-plugin-laravel` 5.0                                                                      |
| Suites          | `tests/Unit`, `tests/Feature` (`phpunit.xml`)                                                                |
| Database        | SQLite `:memory:`; `RefreshDatabase` applied to every Feature test in `tests/Pest.php`                       |
| Other test env  | `CACHE_STORE=array`, `MAIL_MAILER=array`, `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=array`, `BCRYPT_ROUNDS=4` |
| Static analysis | Larastan 3.13 (`phpstan.neon`)                                                                               |
| Formatter       | Pint 1.32 (`pint.json`)                                                                                      |
| Frontend checks | `tsc --noEmit`, `vp check` (lint and format; warnings fail)                                                  |

Conventions in this repository:

- Security and performance tests live in `tests/Feature/Security` and `tests/Feature/Performance`, with names that
  start with a finding id (`'F04: ...'`). New control-level tests start with the control id (`'C13: ...'`).
- Feature tests by module live in `tests/Feature/Members`, `tests/Feature/Auth`, `tests/Feature/Settings`.
- Create tests with `php artisan make:test --pest <Name> --no-interaction` (no suite directory in the name).
- Only `UserFactory` exists. Create model factories as tests need them; use factories, not manual inserts.
- Do not delete or weaken existing tests without the user's approval.

## 2. Which tests to write

Write tests for changed behaviour and its important failure modes, not more. For security-relevant changes
the minimum set per endpoint is:

| Case                                                                   | Expected                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------- |
| Guest                                                                  | Redirect to login (web) or 401 (API)               |
| Unverified user                                                        | Redirect to verification notice (web) or 403 (API) |
| Authenticated without permission                                       | 403                                                |
| Member-only account on a staff route                                   | Redirect to the portal or 403                      |
| Record the user may not see (other member, confidential, other church) | 404 and no data change                             |
| Invalid or privileged input                                            | 422 / session errors and no data change            |
| Over the rate limit                                                    | 429 or a throttle error                            |
| Allowed user, valid input                                              | Success, with the database state asserted          |

Pure copy, styling and layout changes need no new tests.

## 3. Running tests

Run the narrowest set first, then widen.

```bash
php artisan test --compact tests/Feature/Security/Phase2SecurityTest.php
php artisan test --compact --filter="C13"
php artisan test --compact tests/Feature/Security tests/Feature/Auth
```

Full gates:

```bash
composer test        # config:clear, pint --test, phpstan, php artisan test
composer ci:check    # npm run check, npm run types:check, then composer test (same as CI)
```

After the targeted tests pass, ask the user to run the complete suite with `php artisan test --compact` if you did not run it.

Formatting and static analysis on changed PHP:

```bash
vendor/bin/pint --dirty --format agent
vendor/bin/phpstan analyse
```

### 3.1 MySQL parity

FULLTEXT search, triggers, composite foreign keys and row locks behave differently on SQLite or are skipped there.
When a change depends on them, also run the affected tests against a **disposable** MySQL database. `RefreshDatabase`
drops every table, so never use `church_management_system` or any shared database:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS church_testing"
DB_CONNECTION=mysql DB_DATABASE=church_testing php artisan test --compact tests/Feature/Performance tests/Feature/Security
```

Process environment variables take precedence over the `<env>` values in `phpunit.xml` unless those use `force="true"`.
Confirm the run used MySQL (for example from a failing driver-specific assertion or `DB::getDriverName()` in a temporary
dump) before reporting it as a MySQL result.

### 3.2 Reporting results

- Quote the real summary line (passed, failed, skipped counts and duration).
- If a test was not run, or could not run (no MySQL, missing extension), say so and why.
- Never write "tests pass" from reasoning alone.

## 4. C9: Production debugging restrictions

Production must never expose stack traces, environment values, SQL, or developer tooling.

| Setting or item         | Required production value                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`               | `production`                                                                                                                                            |
| `APP_DEBUG`             | `false` (local `.env` has `true`, which is correct only locally)                                                                                        |
| `LOG_LEVEL`             | `warning` or `error` (local is `debug`)                                                                                                                 |
| `APP_URL`               | The real `https://` URL                                                                                                                                 |
| `SESSION_SECURE_COOKIE` | `true`                                                                                                                                                  |
| Composer install        | `composer install --no-dev --optimize-autoloader`, which drops `spatie/laravel-error-solutions`, `laravel/boost`, `laravel/pail` and other dev packages |
| `public/hot`            | Must not exist (it would point the site at a Vite dev server)                                                                                           |
| Debug calls             | No `dd`, `dump`, `ray`, `var_dump`, `phpinfo` in code                                                                                                   |
| `/up` health route      | Allowed; returns status only                                                                                                                            |

How the app behaves: `bootstrap/app.php` returns the raw debug response for 5xx only when `config('app.debug')` is true.
Otherwise it shows the friendly `error` Inertia page or an error toast. Keep that branch when editing the exception handler.
`DB::prohibitDestructiveCommands()` is enabled in production by `AppServiceProvider`.

Verify on the server:

```bash
php artisan about --only=environment
php artisan config:show app.debug
php artisan config:show app.env
test ! -f public/hot && echo "no vite hot file"
grep -rnE "\b(dd|dump|ray|var_dump|phpinfo)\(" app routes resources/views
```

Regression test for the error path:

```php
test('C9: a server error shows no stack trace when debug is off', function () {
    config(['app.debug' => false]);
    Route::get('/__boom', fn () => throw new RuntimeException('secret-internal-detail'))->middleware('web');

    $this->get('/__boom')
        ->assertStatus(500)
        ->assertDontSee('secret-internal-detail')
        ->assertDontSee('RuntimeException');
});
```

## 5. C19: Dependency auditing

### 5.1 Commands

```bash
composer audit                         # PHP advisories from composer.lock
composer audit --locked --abandoned=report
npm audit --omit=dev                   # runtime JS advisories from package-lock.json
npm audit                              # include dev tooling
composer outdated --direct
npm outdated
composer validate --strict
```

### 5.2 Policy

- Run the audits before every release and whenever a lockfile changes.
- **Critical or High** advisory in a runtime dependency blocks release until it is fixed or the user accepts the risk in writing.
- **Moderate or Low**: record it, plan the upgrade, and check whether the vulnerable code path is reachable.
- Dev-only advisories do not block a release but must be fixed within the next update cycle.
- Never add, remove or upgrade a dependency without the user's approval. Propose the exact command, for example
  `composer update vendor/package --with-dependencies`, and the reason.
- Commit `composer.lock` and the npm lockfile. Install in CI and production from the lockfile (`composer install`, `npm ci`).

### 5.3 Repository-specific issues

- npm is the only package manager (`package-lock.json`); the pnpm files were removed. Use `npm ci` in CI and production.
- `package.json` pins `vite-plus` to `0.3.0`, a pre-1.0 tool that runs the build, lint and format. Review its changelog on every update.
- `.github/dependabot.yml` covers GitHub Actions, composer and npm weekly.

## 6. Release procedure

### 6.1 Pre-release gate (all must hold)

1. `composer ci:check` passes locally or in CI, with output recorded.
2. Security suites pass: `php artisan test --compact tests/Feature/Security tests/Feature/Auth`.
3. MySQL parity run done if the release changes migrations, FULLTEXT, triggers or locking.
4. `composer audit` and `npm audit --omit=dev` have no unaccepted Critical or High findings.
5. The `security-review` scan bundle has been run for the release diff, with no open Critical or High findings.
6. `npm run build` succeeds.
7. Production `.env` reviewed against Section 4. No secret has changed hands in chat, tickets or commits.

### 6.2 Deploy steps

These follow the project's `ReadMe` notes. If the app is deployed on Laravel Cloud, use the `deploying-to-cloud` skill instead.

```bash
php artisan down --retry=60
# Back up the database first, for example:
# mysqldump --single-transaction --routines --triggers church_management_system > backup-YYYYMMDD-HHMM.sql
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
php artisan permission:cache-reset
php artisan storage:link        # first deploy only
php artisan up
```

Data-changing commands such as `members:accounts` have a `--dry-run` option. Run the dry run first and show the output to the user before the real run.

### 6.3 Post-deploy verification

- `GET /up` returns 200.
- The login page loads over HTTPS. A wrong password shows the generic message.
- A forced 404 and 403 show the friendly error page with no stack trace.
- `php artisan about --only=environment` shows production with debug off.
- Error logs are quiet for 15 minutes after the deploy.

### 6.4 Rollback

- Code: redeploy the previous release.
- Database: run `php artisan migrate:rollback --step=<n>` only for migrations with a tested `down()`. Otherwise restore the backup taken in 6.2.
- Clear caches after rollback: `php artisan optimize:clear && php artisan permission:cache-reset`.

## 7. Review checklist

- [ ] Tests cover the changed behaviour and its failure modes, using factories.
- [ ] Narrow tests run first, then the relevant suites; real output quoted.
- [ ] MySQL parity run done or its absence reported.
- [ ] Pint and PHPStan clean on changed PHP; `types:check` and `check` clean on changed TypeScript.
- [ ] Production settings match Section 4.
- [ ] Composer and npm audits run; advisories triaged under the Section 5.2 policy.
- [ ] Backup taken before production migrations; rollback path known.

## 8. Acceptance criteria

1. Every behaviour change ships with a test that fails without the change and passes with it.
2. `composer ci:check` passes, and the result was observed, not assumed.
3. Production runs with `APP_DEBUG=false`, no dev packages, no `public/hot`, and shows no stack trace on error.
4. No unaccepted Critical or High dependency advisory exists at release time.
5. A database backup and a rollback plan exist before production migrations run.
