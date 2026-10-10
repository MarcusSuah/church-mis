---
name: security-review
description: 'Runs and records security reviews for the Church Management System against its 19 required security controls. Activate when asked to review code, a branch, a pull request or the whole project for security; before any release; after adding auth, finance, member-data, upload, API or admin features; when a secret may have leaked; or when setting up automated security checks, secret scanning, pre-commit hooks or CI security gates. Holds the master control matrix and owns controls C6 (Git secret protection) and C11 (automated security reviews).'
---

# Security Review (Controls C6 and C11, plus the master matrix)

This skill is the **entry point for every security review**. It holds the control matrix, the
review procedure, the finding format, and two controls of its own:
**C6 Git secret protection** and **C11 automated security reviews**.
Implementation detail for every other control lives in the owning skill named in the matrix.
Read that skill when a finding touches its control. Do not copy its rules here.

## 1. The 19 required controls

| ID  | Control                                                                                                                 | Owner skill                                                  | Quick verification                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| C1  | Tenant isolation with database-appropriate RLS (MySQL: scopes, composite FKs, least-privilege accounts, guard triggers) | `tenant-security`                                            | Two-church tests return 404; no client-supplied tenant id                  |
| C2  | Restrictive CORS                                                                                                        | `laravel-api-security`                                       | `php artisan config:show cors`: exact origins, no `*` with credentials     |
| C3  | Parameterized SQL                                                                                                       | `database-performance`                                       | Raw SQL grep: no request data outside bindings                             |
| C4  | Verified email required                                                                                                 | `laravel-api-security`                                       | `User implements MustVerifyEmail`; `verified` on web and API groups        |
| C5  | Secure token storage                                                                                                    | `laravel-api-security` (server), `react-frontend` (browser)  | Hashed, expiring, prefixed Sanctum tokens; nothing in browser storage      |
| C6  | Git secret protection                                                                                                   | **this skill**                                               | Section 3                                                                  |
| C7  | Server-side validation                                                                                                  | `laravel-api-security`                                       | Every write validated; only `validated()` persisted                        |
| C8  | Admin authorization                                                                                                     | `laravel-api-security`                                       | `UserPolicy` hierarchy (F03); admin actions audited                        |
| C9  | Production debugging restrictions                                                                                       | `testing-and-release`                                        | `APP_DEBUG=false`; no dev packages or debug calls in production            |
| C10 | API secret protection                                                                                                   | `laravel-api-security` (server), `react-frontend` (`VITE_*`) | Secrets only in `.env` via `config()`; none in props, JSON, logs or bundle |
| C11 | Automated security reviews                                                                                              | **this skill**                                               | Section 4                                                                  |
| C12 | Rate limiting                                                                                                           | `laravel-api-security`                                       | Named limiters on login, public forms, API and expensive endpoints         |
| C13 | Safe file uploads                                                                                                       | `laravel-api-security`                                       | Type and size validated, generated names, private disk, no SVG             |
| C14 | Sensitive-log redaction                                                                                                 | `laravel-api-security`                                       | No passwords, tokens or confidential text in logs or audit rows            |
| C15 | Password hashing                                                                                                        | `laravel-api-security`                                       | `hashed` cast, `Password::defaults()`, no shared passwords                 |
| C16 | Webhook signature verification                                                                                          | `laravel-api-security`                                       | HMAC on raw body, timestamp window, replay protection                      |
| C17 | Server-side permissions                                                                                                 | `laravel-api-security`                                       | `permission:` middleware and policies on every data route                  |
| C18 | XSS prevention                                                                                                          | `react-frontend`                                             | No unsanitized `dangerouslySetInnerHTML`; safe URLs                        |
| C19 | Dependency auditing                                                                                                     | `testing-and-release`                                        | `composer audit` and `npm audit` clean or triaged                          |

The project's earlier hardening work uses finding ids **F01 to F26** (in code comments and
`tests/Feature/Security`, `tests/Feature/Performance`). Keep those ids when touching that code. Use the
C-numbers above for control-level references.

## 2. Review procedure

### 2.1 Define the scope

```bash
git status --short && git diff --stat main...HEAD
```

On 2026-10-10 the project directory was **not a Git repository**. If that is still true, ask the user which
files or modules are in scope, or review the whole application. Do not run `git init` without approval.

For a pull request or branch, the built-in Claude Code `/security-review` command reviews pending changes.
Use it as one input, then apply this skill's matrix to its results. A same-named project skill can shadow that
command. If the built-in command is unavailable, run Sections 2.2 to 2.5 manually.

### 2.2 Map changed files to controls

| Changed path                                                                                | Controls to check            |
| ------------------------------------------------------------------------------------------- | ---------------------------- |
| `routes/*`, `app/Http/Controllers/**`, `app/Http/Middleware/**`                             | C2, C4, C7, C8, C12, C17, C1 |
| `app/Http/Requests/**`                                                                      | C7                           |
| `app/Policies/**`, `RolePermissionSeeder`, `config/permission.php`                          | C8, C17, C1                  |
| `app/Models/**`, `database/migrations/**`                                                   | C1, C3, C15                  |
| Anything with `DB::`, `*Raw(`                                                               | C3, C1                       |
| `app/Actions/Auth/**`, `FortifyServiceProvider`, `config/fortify.php`, `config/sanctum.php` | C4, C5, C12, C15             |
| Upload or download code, `config/filesystems.php`                                           | C13                          |
| `ActivityLogger`, `AuditObserver`, `config/logging.php`, any `Log::`                        | C14                          |
| `config/services.php`, `.env.example`, outbound `Http::` calls                              | C10, C16                     |
| `resources/js/**`, `resources/views/**`                                                     | C18, C5, C10, C17            |
| `composer.*`, `package*.json`, `pnpm-lock.yaml`                                             | C19                          |
| `bootstrap/app.php`, `config/app.php`, deploy scripts                                       | C9, C2                       |
| `.gitignore`, any new file                                                                  | C6                           |

### 2.3 Run the automated checks in Section 4

### 2.4 Read the code

Automated checks find patterns. They do not find missing authorization. For each changed endpoint, trace
route, middleware, validation, record load, policy and response, using the order in `laravel-api-security`.

### 2.5 Report findings

Use this format, most severe first:

```text
[SEVERITY] C<id> <short title>
File: path/to/file.php:<line>
Problem: one or two sentences describing what is wrong.
Exploit: concrete request or state, and what an attacker gains.
Fix: the specific change, pointing to the owning skill's section.
Test: the Pest test that proves the fix.
```

| Severity | Meaning                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Critical | Unauthenticated access to member, pastoral or finance data; account takeover; leaked live secret; remote code execution |
| High     | Cross-tenant or cross-role data access by an authenticated user; privilege escalation; stored XSS                       |
| Medium   | Missing rate limit on a sensitive endpoint; sensitive data in logs; weak token lifetime                                 |
| Low      | Information disclosure without direct impact; hardening gaps                                                            |

State what was **not** reviewed. Never mark a control "pass" unless it was checked.

## 3. C6: Git secret protection

### 3.1 Prevention

- `.gitignore` must contain `.env`, `.env.backup`, `.env.production`, `/auth.json`, `/storage/*.key`. Verify:
  `grep -nE "^\.env|auth\.json|storage/\*\.key" .gitignore`.
- `.env.example` contains keys with **empty** values only. No real hostnames with credentials, no passwords.
- Never commit database dumps, `database/*.sqlite` (already ignored by `database/.gitignore`), exported member CSVs, PDFs of certificates, or `storage/app/**` contents.
- Secrets never appear in code, tests, seeders, migrations, docs or commit messages. Tests use fake values such as `'test-webhook-secret'`.
- Seeded admin passwords come from the environment or a one-time reset link, never a literal (F01).

### 3.2 Detection before every commit

No secret scanner is installed. Propose one of these to the user (each needs approval):

- **gitleaks** as a pre-commit hook and CI step: `gitleaks git --staged --redact` and `gitleaks dir . --redact`.
- **GitHub secret scanning with push protection** on the repository. Setting `SANCTUM_TOKEN_PREFIX` makes leaked Sanctum tokens detectable.

Until then, run this pattern scan on files to be committed:

```bash
grep -rnIE "(password|passwd|secret|api[_-]?key|token|private[_-]?key)['\"]?\s*[:=]\s*['\"][^'\"]{6,}" \
  --exclude-dir={vendor,node_modules,public,storage,.git} --exclude=*.lock --exclude=package-lock.json . \
  | grep -vE "config\(|env\(|\\\$request|validated|'password' =>|_confirmation|placeholder|label"
grep -rnIE -e "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{20,}|ghp_[0-9A-Za-z]{36}" \
  --exclude-dir={vendor,node_modules,.git} .
```

Review every hit by hand. The patterns are deliberately broad.

### 3.3 Response to a leaked secret

1. **Rotate first.** Change the credential at its source: database password, mail password, `APP_KEY`, API key, webhook secret. Revoke Sanctum tokens with `$user->tokens()->delete()`.
2. Remove the secret from the working tree and replace it with a `config()` lookup.
3. Purge history only with the user's approval (`git filter-repo`), then force-push and ask collaborators to re-clone.
4. Rotating `APP_KEY` invalidates sessions and encrypted values, including 2FA secrets. Plan it with the user.
5. Record the incident: what leaked, when, where, and what was rotated.

## 4. C11: Automated security reviews

### 4.1 Local scan bundle

Run all of these for every review. Each line states the expected result.

```bash
# C3: raw SQL. Expect only code-built fragments; review each hit.
grep -rnE "whereRaw|selectRaw|orderByRaw|havingRaw|DB::raw|DB::select|DB::statement|DB::unprepared" app

# C7: mass assignment from raw input. Expect no hits.
grep -rnE "(create|update|fill|forceFill)\(\s*\\\$request->(all|input)\(\)" app

# C9: debug leftovers. Expect no hits in app/, routes/, resources/.
grep -rnE "\b(dd|dump|ray|var_dump|print_r|phpinfo)\(" app routes resources/views resources/js --include=*.php --include=*.ts --include=*.tsx

# C10: env() outside config. Expect no hits.
grep -rn "env(" app routes resources --include=*.php

# C13: uploads. Expect every store() to follow a validate() with type and size rules.
grep -rnE "->store(As)?\(|getClientOriginalName" app

# C14: logging of whole requests. Expect no hits.
grep -rnE "Log::\w+\(.*\\\$request->(all|input)\(\)" app

# C17: routes without permission middleware. Review each result.
php artisan route:list --except-vendor --json

# C18: raw HTML in React and Blade. Expect only the 2FA QR code and vendor views.
grep -rn "dangerouslySetInnerHTML" resources/js --include=*.tsx | grep -v /dist/
grep -rn "{!!" resources/views

# C19: dependency advisories. See testing-and-release.
composer audit
npm audit --omit=dev

# Static analysis and security tests.
vendor/bin/phpstan analyse
php artisan test --compact tests/Feature/Security tests/Feature/Auth
```

### 4.2 Continuous integration

`.github/workflows/tests.yml` runs `composer ci:check` on pushes to `main` and on pull requests. That covers lint,
types, PHPStan and Pest, but no security-specific step. Propose these additions to the user. Do not edit the
workflow unasked:

- a `composer audit` step and an `npm audit --omit=dev --audit-level=high` step;
- a gitleaks step;
- a scheduled weekly run of the audit steps so new advisories surface without a code change.

Keep the existing practice of pinning actions to commit SHAs and `persist-credentials: false`.

### 4.3 AI-assisted review

- Run `/security-review` (built-in) or this skill on every branch that touches a path in Section 2.2 before merging.
- `/code-review` covers correctness. It is not a substitute for this matrix.
- AI review output is a lead list. Confirm each finding in code before reporting it as real.

## 5. Known open items (verify before reporting)

Updated 2026-10-10 after the hardening pass. Re-check each one; the state may have changed.

Still open:

| Control | Item                                                                                                                         | Location          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| C1      | No multi-church tenancy exists. Isolation is single-church plus in-church boundaries.                                        | Whole schema      |
| C5      | `SESSION_SECURE_COOKIE` is unset and `SESSION_ENCRYPT=false` locally. Production must set both (see `.env.example`).         | Production `.env` |
| C6      | The project is not a Git repository yet, and no secret scanner (gitleaks or push protection) is set up.                      | Repository        |
| C9      | The local `.env` has `CHURCH_GEOIP=true` with a placeholder `YOUR_KEY` endpoint, so each sign-in makes a failing HTTPS call. | `.env`            |
| C11     | CI (`.github/workflows/tests.yml`) has no `composer audit`, `npm audit` or secret-scan step.                                 | CI                |
| C11     | PHPStan reports about 970 pre-existing errors, mostly missing generic and array value types. `composer test` fails on it.    | Whole app         |

Resolved in that pass (keep them resolved):

| Control | Item                                                        | Now                                                                                      |
| ------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| C2      | No CORS config                                              | `config/cors.php` allows only `CORS_ALLOWED_ORIGINS`                                     |
| C5      | Tokens could not be issued; no expiry or prefix             | `HasApiTokens` on `User`; 30-day expiry; `ssbc_` prefix; daily prune                     |
| C5      | Password reset crashed (`UserSessions` missing)             | `App\Support\UserSessions::endAll()` ends sessions and tokens                            |
| C6      | `ReadMe` held the retired shared password                   | Replaced with a placeholder; dry run showed 0 accounts still use it                      |
| C6, C10 | Hardcoded `'my-secret-token'` middleware                    | `EnsureTokenIsValid` deleted                                                             |
| C6      | Skills were git-ignored                                     | `.gitignore` now tracks `.claude/skills/`                                                |
| C8      | 403 message listed required roles                           | Generic message in `EnsureUserHasRole`                                                   |
| C9      | API 500s could leak details                                 | `ApiExceptionRenderer` registered for `api/*`                                            |
| C13     | Sermon file pickers were ignored by the server              | Validated uploads (type and size) stored under generated names                           |
| C14     | Full URLs with tokens were logged                           | `ActivityLogger::safeUrl()` and `RedactSensitiveContext`                                 |
| C17     | `routes/api.php` unregistered and returned a raw model      | Registered with `auth:sanctum`, `verified`, `throttle:api`; explicit fields              |
| C18     | Public sermon links rendered unchecked URLs                 | `resources/js/lib/safe-url.ts` on listing and detail pages; server uses `url:http,https` |
| C19     | Two JS lockfiles; Dependabot covered Actions only           | pnpm files removed; Dependabot covers composer and npm                                   |
| —       | `website-content` admin routes lacked `auth` and `verified` | Added                                                                                    |

## 6. Review checklist

- [ ] Scope stated, including what was not reviewed.
- [ ] Every changed path mapped to controls with Section 2.2.
- [ ] Local scan bundle (4.1) run and each hit triaged.
- [ ] Each endpoint traced end to end for authorization, not just pattern-matched.
- [ ] Owning skill consulted for every control with a finding.
- [ ] No secret in the diff, the working tree or new files.
- [ ] Findings use the Section 2.5 format, ranked by severity, each with a test.
- [ ] Known open items (Section 5) re-checked and updated.

## 7. Acceptance criteria

A security review is complete only when:

1. All 19 controls are marked pass, fail, or not applicable with a one-line reason, and none is left unmarked.
2. Every Critical and High finding has a fix or an explicit risk acceptance from the user.
3. The scan bundle and the security test suites were actually run, and their real output is summarized.
4. No live secret exists in tracked files, and any leaked secret has been rotated.
5. The report says what was out of scope or could not be verified.
