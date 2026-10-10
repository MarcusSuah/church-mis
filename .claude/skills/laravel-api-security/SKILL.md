---
name: laravel-api-security
description: 'Secure implementation rules for Laravel 13 HTTP endpoints in the Church Management System: web (Inertia) routes, the Sanctum API, authentication and authorization. Activate when adding or changing routes, controllers, form requests, middleware, policies, Spatie roles or permissions, Sanctum tokens, CORS, rate limiters, file uploads or downloads, webhooks, outbound API calls that use secrets, password handling, or logging of request data. Owns controls C2 CORS, C4 verified email, C5 secure token storage (server side), C7 server-side validation, C8 admin authorization, C10 API secret protection, C12 rate limiting, C13 safe uploads, C14 sensitive-log redaction, C15 password hashing, C16 webhook signature verification and C17 server-side permissions.'
---

# Laravel API and Request Security

Controls owned here: **C2, C4, C5 (server), C7, C8, C10, C12, C13, C14, C15, C16, C17**.
Tenant scoping is in `tenant-security` (C1). SQL construction is in `database-performance` (C3).
Browser-side token handling and XSS are in `react-frontend` (C5 client, C18).
The full matrix is in `security-review`.

Also activate `laravel-best-practices` for general Laravel patterns and `fortify-development`
for login, registration, 2FA, passkeys and password reset. Use `search-docs` before relying on
a version-specific API.

## 1. Verify the stack and current state

```bash
composer show laravel/framework laravel/sanctum laravel/fortify spatie/laravel-permission
php artisan route:list --except-vendor --path=api
php artisan config:show sanctum
php artisan config:show cors
```

Versions installed on 2026-10-10: Laravel 13.35, Sanctum 4.3, Fortify 1.41, Spatie Permission 8.3,
PHP 8.4. Re-check; do not assume.

Facts about this codebase that change how you work (updated 2026-10-10). Confirm each is still true:

| Fact                                                                                                                                                                      | Consequence                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `routes/api.php` is registered in `bootstrap/app.php`. Its group uses `auth:sanctum`, `verified` and `throttle:api`. `/api/user` returns an explicit field list.          | Add new endpoints inside that group under `/api/v1`. Never return a raw model.                        |
| `/api/*` errors go through `App\Exceptions\ApiExceptionRenderer` and `App\Http\Responses\ApiResponse` (`{ success, message, errors? }`). 500s return only a reference id. | Throw normal exceptions; do not build ad-hoc error JSON.                                              |
| `User` uses `HasApiTokens`. `config/sanctum.php` sets `expiration` (default 43200 minutes) and `token_prefix` (default `ssbc_`). `sanctum:prune-expired` runs daily.      | Issue tokens only through `App\Actions\Auth\IssueApiToken`.                                           |
| `IssueApiToken` docblock references `App\Support\Authorization`, which does not exist.                                                                                    | Do not rely on it. Check token abilities with `tokenCan()` plus permissions.                          |
| `config/cors.php` allows only origins listed in `CORS_ALLOWED_ORIGINS` (empty by default).                                                                                | Keep it that way (C2).                                                                                |
| The `api` rate limiter (60/min per user or IP) lives in `FortifyServiceProvider::configureRateLimiting()`.                                                                | Add new limiters there.                                                                               |
| `App\Support\UserSessions::endAll()` deletes the user's sessions and API tokens and rotates the remember token. Password reset calls it.                                  | Call it after any credential compromise.                                                              |
| Web routes use `permission:{module}.{action}` middleware with plain `{id}` parameters.                                                                                    | Controllers load records themselves, so record-level checks belong in the controller or policy (C17). |

## 2. Required order for every new or changed endpoint

1. **Route group** carries authentication, `verified`, a rate limiter and a permission middleware.
2. **Validation** in a Form Request or the module's existing inline `validate()` pattern.
3. **Load the record** scoped to what the user may see (`tenant-security`), using `findOrFail`.
4. **Authorize the record** with a policy. Route middleware alone is not enough for owned or confidential data.
5. **Act** using only `validated()` data inside a transaction when several writes must agree.
6. **Respond** with an explicit field list or an API Resource. Never return a raw model.
7. **Test** the allowed path and each failure path: 401/redirect, 403, 404, 422, 429.

```php
// routes/api.php
Route::prefix('v1')->name('api.v1.')
    ->middleware(['auth:sanctum', 'verified', 'throttle:api'])
    ->group(function (): void {
        Route::get('members', [Api\V1\MemberController::class, 'index'])
            ->middleware(['permission:members.view', 'abilities:members.view'])
            ->name('members.index');
    });
```

The `abilities` alias comes from Sanctum's `CheckAbilities` middleware and must be registered in
`bootstrap/app.php` before use. Follow the API versioning (`/api/v1`) already promised in
`App\Support\ListQuery`.

## 3. C2: Restrictive CORS

The Inertia app is same-origin and needs **no** CORS. CORS matters only for a separate SPA,
a mobile web view, or third-party API clients.

```bash
php artisan config:publish cors
```

```php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_filter(explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-XSRF-TOKEN'],
    'exposed_headers' => [],
    'max_age' => 600,
    'supports_credentials' => (bool) env('CORS_SUPPORTS_CREDENTIALS', false),
];
```

Rules:

- Never `'allowed_origins' => ['*']` in any environment that holds real data.
- Never combine a wildcard or pattern origin with `supports_credentials => true`.
- List exact `https://` origins in `CORS_ALLOWED_ORIGINS`. Keep `SANCTUM_STATEFUL_DOMAINS` to the same set.
- Do not add web routes to `paths`.

Test: a preflight from an unlisted origin receives no `Access-Control-Allow-Origin` header.

```php
test('C2: an unlisted origin gets no CORS allow header', function () {
    config(['cors.allowed_origins' => ['https://app.example.org']]);

    $this->withHeaders(['Origin' => 'https://evil.example', 'Access-Control-Request-Method' => 'GET'])
        ->options('/api/v1/members')
        ->assertHeaderMissing('Access-Control-Allow-Origin');
});
```

## 4. C4: Verified email

- `User` implements `MustVerifyEmail` (Phase 2, F02). Keep it.
- Every authenticated web group uses `['auth', 'verified']`. Every API group uses `['auth:sanctum', 'verified']`.
  Sanctum does not enforce verification on its own.
- Token issuance refuses unverified users. Add the check to `IssueApiToken` or its caller.
- Never set `email_verified_at` from request input. Only the Fortify verification flow and
  trusted admin actions with an audit entry may set it.
- Changing the email address clears `email_verified_at` and sends a new link.

Existing tests: `tests/Feature/Auth/EmailVerificationTest.php` and F02 in
`tests/Feature/Security/Phase2SecurityTest.php`. Add an API case when API routes exist.

## 5. C5: Secure token storage (server side)

- First-party Inertia pages authenticate by **session cookie**. Do not issue API tokens to the browser app.
- Sanctum stores only a SHA-256 hash. Return `plainTextToken` **once**, at creation, and never log or re-display it.
- Every token has an expiry. Set `'expiration'` in `config/sanctum.php` explicitly (minutes) and keep
  `IssueApiToken`'s per-token cap below it. Schedule `sanctum:prune-expired --hours=24` daily.
- Set `SANCTUM_TOKEN_PREFIX` (for example `ssbc_`) so GitHub secret scanning recognises leaked tokens.
- Abilities are a subset of the user's current permissions. No `['*']` tokens. Keep the existing
  `IssueApiToken` rules: no escalation through a token, per-user token cap, oldest pruned first.
- Revoke all tokens when the password changes, the account is blocked or deactivated, or a role is removed:
  `$user->tokens()->delete()`.
- Session cookies in production: `SESSION_SECURE_COOKIE=true`, `SESSION_HTTP_ONLY=true`,
  `SESSION_SAME_SITE=lax` (or `strict`), and consider `SESSION_ENCRYPT=true`. These are unset or false in `.env` today.
- Native mobile clients store tokens in the OS keystore (Keychain or Android Keystore), never in plain preferences.

## 6. C7: Server-side validation

- Validate every input on the server, including values the UI restricts with selects or hidden fields.
  Client-side checks are UX only.
- Follow the module's pattern. `Members` and `Settings` use Form Requests
  (`StoreMemberRequest`, `MemberRequestRules`). Most other controllers validate inline. New complex
  endpoints should use `php artisan make:request ... --no-interaction`.
- Persist only `$request->validated()` or `$validator->safe()->only([...])`. Never `$request->all()` into `create()`/`update()`.
- Enumerated values use `Rule::enum(...)` with the existing enums in `app/Enums`.
- Privileged fields (`role`, `status`, `is_active`, `blocked_at`, `email_verified_at`, `church_id`,
  `must_change_credentials`, `reviewed_by`) are `prohibited` on self-service endpoints.
- `exists:` and `unique:` rules are scoped. See `tenant-security`.
- URLs: `url:http,https` so `javascript:` and `data:` URLs are rejected. `DocumentController` accepts
  `file_url` with plain `url`; tighten it when that controller is next touched.
- Strings have `max:` limits. Money uses `decimal:0,2` with `min:0`. Dates use `date` plus a range where sensible.
- Search and filter input goes through `App\Support\ListQuery::filters()` and `perPage()`, which already whitelist values.

## 7. C8: Admin authorization

- Roles come from `App\Enums\Role`. `Role::protected()` returns Superadmin and Admin.
- `Gate::before` in `AppServiceProvider` lets Superadmin pass every ability check. Do not add a second bypass.
- Role hierarchy is enforced by `UserPolicy` (F03): an Admin cannot edit, deactivate, delete, block or
  sign out the Superadmin or another Admin. Every new user-management action goes through `UserPolicy`.
- Never accept a role name from a request without checking the actor may grant it. Assigning a protected
  role requires Superadmin.
- Admin-only routes use `permission:` middleware **and** a policy call in the controller.
- Every admin action that changes users, roles, permissions, blocked IPs or church settings writes an
  audit entry. `AuditObserver` covers `User`; add explicit `ActivityLogger::log()` calls for role and permission changes.
- Error messages must not list required roles. `EnsureUserHasRole` currently returns
  `'Unauthorized. Required role: ...'`. Prefer a generic 403 message when that file is next touched.

Required tests for any admin action: Superadmin allowed, Admin allowed only on non-protected targets,
staff without the permission get 403, and a member-only user gets 403 or is redirected to the portal.

## 8. C17: Server-side permissions

- Permission names follow `{module}.{action}` (`members.view`, `finance.create`, `pastoral-care.confidential`).
  Add new ones in `database/seeders/RolePermissionSeeder.php` and run `php artisan permission:cache-reset` afterwards.
- Every route that reads or changes church data carries a `permission:` middleware.
  Read the generic CRUD loop in `routes/web.php` (`permission:{$perm}.view|create|update|delete`) before adding routes.
- Record-level rules (owned records, confidential flags) go in a policy registered in `AppServiceProvider`.
- API routes check **both** the user's permission and the token ability (`$request->user()->tokenCan('members.view')`).
- The React `usePermissions()` hook only hides UI. It is never the control.
- Inertia shared props that expose counts already check `can()` first (`HandleInertiaRequests::share`). Keep that pattern.

Find routes missing a permission middleware:

```bash
php artisan route:list --except-vendor --json | php -r '$r=json_decode(stream_get_contents(STDIN),true); foreach($r as $x){$m=implode(",",(array)$x["middleware"]); if(stripos($m,"Authenticate")!==false && !preg_match("/Permission|Role|Authorize|can:/i",$m)){echo $x["method"]," ",$x["uri"],PHP_EOL;}}'
```

The JSON lists middleware as class names (`Illuminate\Auth\Middleware\Authenticate`,
`Spatie\Permission\Middleware\PermissionMiddleware:members.view`), hence the case-insensitive match.
On 2026-10-10 it listed 26 routes. Dashboard, profile, settings, notifications and member-portal routes
legitimately rely on `auth` alone. `documents/{id}/download`, `lookup/members` and `uploads/image` rely on
checks inside the controller. Confirm those checks exist whenever such a route changes.

## 9. C10: API secret protection

- Secrets live in `.env` (git-ignored) and are read through `config/*.php` with `env()`. Application code
  calls `config()` only, never `env()`, so `config:cache` works and secrets stay in one place.
- Add new keys to `.env.example` with an **empty** value and a comment.
- Never send a secret to the browser. That covers Inertia props, JSON responses, validation messages,
  exception messages and HTML. Anything prefixed `VITE_` is compiled into public JavaScript.
- Third-party calls use `Http::withToken(config('services.x.key'))` from the server. Set a timeout,
  as `ActivityLogger::location()` does.
- Mark parameters that carry secrets with `#[\SensitiveParameter]` so they never appear in stack traces.
- A leaked secret is rotated first, then removed from history. See `security-review`.

## 10. C12: Rate limiting

Existing limiters in `App\Providers\FortifyServiceProvider::configureRateLimiting()`: `login`
(per email+IP per minute and per IP per hour), `two-factor`, `public-forms` and `passkeys`.
Routes also use `throttle:5,1`, `throttle:6,1`, `throttle:30,1` and `throttle:120,1`.

- Every public POST (registration, contact, public member registration) uses `throttle:public-forms` or stricter.
- Every API group uses a named `api` limiter keyed by user id, falling back to IP:

    ```php
    RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
        ->by($request->user()?->id ?: $request->ip()));
    ```

- Expensive endpoints (exports, PDF certificates, reports, bulk mail such as `birthdays.send`) get their own tighter limiter.
- Token issuance and password change share the login limits.
- Limiter responses for Inertia return `back()->withErrors(...)`, matching the existing limiters.
  JSON clients get the default 429.

Test: hit the limit plus one and assert 429 (JSON) or a session error (web).

## 11. C13: Safe file uploads

Reference implementations: `System\UploadController::image()` (public images) and
`Content\DocumentController` (private documents on the `local` disk, downloaded through the controller).

- Authorize before validating. `UploadController` blocks member-only accounts (F22). Keep that pattern.
- Validate type **and** size: `File::image()->max(5 * 1024)` or `mimes:` plus `max:`. The `image` rule rejects
  SVG by default. Never pass `allow_svg` or `allowSvg: true`.
- Store with `store()` / `storeAs()` using a generated name. Never use `getClientOriginalName()` in a path.
  Keep the original name only as display metadata, trimmed and length-limited.
- Sensitive files (certificates, member documents, finance attachments) go on the private `local` disk and are
  served by an authorized controller action with `Storage::download()`. Only website images and avatars use `public`.
- Never allow `html`, `htm`, `svg`, `php`, `phtml`, `js`, executables or macro-enabled Office types (`docm`, `xlsm`).
- Treat `zip` as untrusted. Never extract on the server without approval and a size or entry limit.
- Delete the old file when a record's file is replaced or the record is force-deleted, as `DocumentController` does.

## 12. C14: Sensitive-log redaction

Never write these to logs, `audit_logs`, `user_activities`, exception context or notifications:
passwords, password-reset and verification tokens, API tokens, 2FA secrets and recovery codes,
session ids, `Authorization` and `Cookie` headers, webhook secrets, full card or bank numbers,
and confidential pastoral or prayer text.

What exists:

- `AuditObserver::HIDDEN` drops password, remember token and 2FA fields.
- `AuditObserver::REDACTED` records only _that_ pastoral or prayer text changed (F04).
- `ActivityLogger` never stores passwords.

- `ActivityLogger::safeUrl()` stores URLs without query strings and masks reset tokens and verification hashes.
- `App\Logging\RedactSensitiveContext` is tapped onto the `single` and `daily` log channels. It masks context and
  extra keys matching password, token, secret, authorization, cookie, recovery, api key or two_factor.

Rules for new code:

- Add new secret model attributes to `AuditObserver::HIDDEN` and new confidential text fields to `REDACTED`.
- Log ids and outcomes, not payloads: `Log::info('Tithe recorded', ['tithe_id' => $tithe->id])`, never `$request->all()`.
- Use a key name the redactor recognises for anything secret, and add the `tap` to any new file channel in `config/logging.php`.
- Store request paths, not full URLs, in logs and audit rows (`ActivityLogger::safeUrl()` or `$request->path()`).
- Keep `password`, `password_confirmation` and `current_password` out of flashed input (framework default).

## 13. C15: Password hashing

- `User` casts `password` to `hashed`. Assign the plain value and let the cast hash it. Never store a plain
  or reversibly encrypted password, and never compare with `===`.
- Verify with `Hash::check()` or `Auth::attempt()`. Laravel rehashes on login when the work factor changes.
- `BCRYPT_ROUNDS=12` in `.env.example`. Do not lower it outside `phpunit.xml`.
- `AuthenticateUser` checks a dummy hash for unknown emails so response time does not reveal which accounts exist. Keep it.
- Production password rules come from `Password::defaults()` in `AppServiceProvider` (min 12, mixed case,
  numbers, symbols, `uncompromised()`). Use `Password::defaults()` in every password rule. Share rules through
  `App\Concerns\PasswordValidationRules`.
- No shared or default passwords (F01). New member logins get a one-time set-password link (`MemberAccounts`).
- A password change invalidates other sessions and revokes API tokens.

## 14. C16: Webhook signature verification

No inbound webhooks exist today. Any future one (payment provider, mobile money, SMS delivery receipts) must:

1. Live in `routes/api.php` or a dedicated route outside the `web` group so CSRF does not apply. Never add web routes to the CSRF exception list.
2. Verify an HMAC over the **raw** body with `hash_equals()` before parsing or touching the database.
3. Reject timestamps older than five minutes and store processed event ids to block replays.
4. Respond quickly and queue the work. Processing is idempotent by event id.
5. Read the secret from `config('services.<provider>.webhook_secret')`.

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/** Rejects webhook calls whose HMAC signature, timestamp or event id is invalid. */
final class VerifyWebhookSignature
{
    public function handle(Request $request, Closure $next, string $provider): Response
    {
        $secret = (string) config("services.{$provider}.webhook_secret");
        $timestamp = (int) $request->header('X-Webhook-Timestamp');
        $signature = (string) $request->header('X-Webhook-Signature');
        $eventId = (string) $request->header('X-Webhook-Id');

        abort_if($secret === '' || $signature === '' || $eventId === '', 401);
        abort_if(abs(now()->getTimestamp() - $timestamp) > 300, 401);

        $expected = hash_hmac('sha256', $timestamp.'.'.$request->getContent(), $secret);
        abort_unless(hash_equals($expected, $signature), 401);

        abort_unless(Cache::add("webhook:{$provider}:{$eventId}", true, now()->addDay()), 409);

        return $next($request);
    }
}
```

Use the provider's documented header names and signing scheme. Tests cover a valid signature, a wrong
signature, a stale timestamp and a replayed event id.

## 15. Testing commands

```bash
php artisan test --compact tests/Feature/Security
php artisan test --compact tests/Feature/Auth
php artisan test --compact --filter=<NewTestName>
vendor/bin/pint --dirty --format agent
vendor/bin/phpstan analyse
```

Name new security tests after the control they prove, for example `'C13: member-only accounts cannot upload files'`,
next to the existing F-numbered tests. Report real output. Never claim a pass without running the test.

## 16. Review checklist

- [ ] Route has auth, `verified`, a rate limiter and a `permission:` middleware (or a documented reason it does not).
- [ ] Record-level access goes through a policy; foreign or hidden records give 404.
- [ ] Only validated data is persisted; privileged fields are prohibited on self-service endpoints.
- [ ] Response is an explicit field list or an API Resource; no secrets, hashes or hidden fields.
- [ ] CORS unchanged, or restricted to exact origins with no wildcard plus credentials.
- [ ] Tokens: expiring, prefixed, abilities a subset of permissions, revoked on password change or block.
- [ ] Uploads: authorized, type and size validated, generated names, private disk for sensitive files, no SVG.
- [ ] No secret, token, password or confidential text reaches logs, audit rows, flashed input or the browser.
- [ ] Webhooks verified with HMAC on the raw body, timestamp window and replay protection.
- [ ] Admin actions respect `UserPolicy` hierarchy and are audited.
- [ ] Tests cover allowed, 401/redirect, 403, 404, 422 and 429 paths, and were run.

## 17. Acceptance criteria

1. Every new endpoint rejects unauthenticated, unverified, unauthorized and over-limit requests, proven by tests.
2. A user without the permission, or a token without the ability, gets 403 even when calling the URL directly.
3. Invalid or privileged input gets 422 and changes nothing.
4. No response, log line or audit row contains a password, token, secret or redacted field.
5. Uploaded files cannot be executed or rendered as HTML or SVG from the application origin.
6. Webhooks with a bad signature, stale timestamp or repeated id are rejected before any side effect.
7. Pint and PHPStan are clean on changed files, and the affected tests were run with output reported.
