<?php

/*
 * Phase 4 regression tests: Sanctum API authentication, token abilities,
 * CORS/CSRF, sessions after a password change (F09), role ceilings and
 * department scoping (F08), and the website permission (F21).
 * Each test names what it guards.
 */

use App\Enums\Role as RoleEnum;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserActivity;
use App\Policies\UserPolicy;
use App\Support\UserSessions;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Laravel\Sanctum\PersonalAccessToken;
use PragmaRX\Google2FA\Google2FA;

beforeEach(fn () => $this->seed(RolePermissionSeeder::class));

function p4User(string $role, array $attrs = []): User
{
    return tap(
        User::factory()->create(['must_change_credentials' => false, 'status' => 'approved', 'password' => 'Secret#Pass1', ...$attrs]),
        fn (User $u) => $u->assignRole($role),
    );
}

/** A new HTTP request in the same test: forget the user the guards cached. */
function freshRequest(): void
{
    app('auth')->forgetGuards();
}

function tokenLogin($test, User $user, array $extra = [])
{
    return $test->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Secret#Pass1', 'device_name' => 'Test phone', ...$extra]);
}

/* ------------------------------------------------------- API login */

test('API: a non-browser client signs in and gets a token once, stored only as a hash', function () {
    $user = p4User(RoleEnum::FINANCEOFFICER->value);

    $res = tokenLogin($this, $user)->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.user.email', $user->email)
        ->assertJsonMissingPath('data.user.password');

    $plain = $res->json('data.token');
    expect($plain)->toContain('|ssbc_')   // "<id>|<prefix><random>" — the prefix lets secret scanners spot leaks
        ->and($res->json('data.abilities'))->toContain('tithes.view')->not->toContain('*')
        ->and($res->json('data.expires_at'))->not->toBeNull();

    $stored = PersonalAccessToken::firstOrFail();
    expect($stored->token)->not->toBe($plain)->and(strlen($stored->token))->toBe(64)
        ->and($stored->expires_at->isFuture())->toBeTrue();

    freshRequest();
    $this->withToken($plain)->getJson('/api/v1/auth/me')->assertOk()
        ->assertJsonPath('data.auth.type', 'token')
        ->assertJsonMissingPath('data.remember_token')
        ->assertJsonMissingPath('data.two_factor_secret')
        ->assertJsonMissingPath('data.last_login_ip');
});

test('API: wrong password and unknown email give the same answer in the standard envelope', function () {
    $user = p4User(RoleEnum::CASHIER->value);

    $wrong = tokenLogin($this, $user, ['password' => 'nope'])->assertStatus(422)
        ->assertJsonPath('success', false)->assertJsonPath('message', 'Validation failed.');
    $unknown = $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.test', 'password' => 'nope', 'device_name' => 'x'])->assertStatus(422);

    expect($wrong->json('errors.email'))->toBe($unknown->json('errors.email'))
        ->and(UserActivity::where('event', 'login_failed')->count())->toBe(2);
});

test('API: unauthenticated and unknown routes answer in the envelope, without internals', function () {
    $this->getJson('/api/v1/auth/me')->assertUnauthorized()->assertExactJson(['success' => false, 'message' => 'Unauthenticated.']);
    $this->getJson('/api/v1/nothing-here')->assertNotFound()->assertJsonPath('success', false)->assertJsonMissingPath('exception')->assertJsonMissingPath('trace');
});

test('API: sign-in is rate limited per email and IP', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    foreach (range(1, 5) as $i) {
        tokenLogin($this, $user, ['password' => 'wrong'])->assertStatus(422);
    }

    tokenLogin($this, $user)->assertStatus(429)->assertHeader('Retry-After')
        ->assertJsonPath('success', false)->assertJsonPath('meta.retry_after', fn ($v) => $v > 0);
});

test('API: a token needs a device name and a verified email', function () {
    tokenLogin($this, p4User(RoleEnum::CASHIER->value), ['device_name' => null])->assertStatus(422)->assertJsonValidationErrors('device_name');
    tokenLogin($this, p4User(RoleEnum::CASHIER->value, ['email_verified_at' => null]))->assertStatus(422)->assertJsonValidationErrors('email');
    expect(PersonalAccessToken::count())->toBe(0);
});

test('API: a blocked account loses its token at the next request', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    $token = tokenLogin($this, $user)->json('data.token');

    $user->forceFill(['blocked_at' => now()])->save();
    freshRequest();

    $this->withToken($token)->getJson('/api/v1/auth/me')->assertForbidden()->assertJsonPath('success', false);
    expect(PersonalAccessToken::count())->toBe(0);
});

test('API: two-factor accounts must send a valid code', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());
    $google = app(Google2FA::class);
    $secret = $google->generateSecretKey();
    $user = p4User(RoleEnum::CASHIER->value);
    $user->forceFill(['two_factor_secret' => encrypt($secret), 'two_factor_confirmed_at' => now()])->save();

    tokenLogin($this, $user)->assertStatus(422)->assertJsonPath('meta.two_factor_required', true);
    tokenLogin($this, $user, ['code' => '000000'])->assertStatus(422)->assertJsonValidationErrors('code');
    tokenLogin($this, $user, ['code' => $google->getCurrentOtp($secret)])->assertCreated();
});

/* ------------------------------------------------ token abilities */

test('Tokens: abilities are a ceiling, even for the Superadmin', function () {
    $super = p4User(RoleEnum::SUPERADMIN->value);
    $token = tokenLogin($this, $super, ['abilities' => ['members.view']])->assertCreated()->json('data.token');

    $record = PersonalAccessToken::findToken($token);
    $super->withAccessToken($record);

    expect($super->can('members.view'))->toBeTrue()
        ->and($super->can('members.delete'))->toBeFalse()
        ->and($super->can('users.update'))->toBeFalse();

    // Policies ask for permissions too, so the ceiling holds there as well.
    $member = Member::create(['first_name' => 'A', 'last_name' => 'B', 'status' => 'Active']);
    expect($super->can('delete', $member))->toBeFalse();

    freshRequest();
    $this->withToken($token)->getJson('/api/v1/auth/me')->assertJsonPath('data.permissions', ['members.view']);
});

test('Tokens: a token cannot be given permissions the user does not have', function () {
    tokenLogin($this, p4User(RoleEnum::CASHIER->value), ['abilities' => ['users.delete']])
        ->assertStatus(422)->assertJsonValidationErrors('abilities');
});

test('Tokens: removing a role permission takes effect on existing tokens at once', function () {
    $user = p4User(RoleEnum::FINANCEOFFICER->value);
    $record = PersonalAccessToken::findToken(tokenLogin($this, $user)->json('data.token'));
    $user->withAccessToken($record);
    expect($user->can('tithes.view'))->toBeTrue();

    Role::findByName(RoleEnum::FINANCEOFFICER->value)->revokePermissionTo('tithes.view');
    $user = $user->fresh()->withAccessToken($record);

    expect($user->can('tithes.view'))->toBeFalse();
});

test('Tokens: users list and revoke only their own tokens (no IDOR)', function () {
    $alice = p4User(RoleEnum::CASHIER->value);
    $bob = p4User(RoleEnum::CASHIER->value);
    $aliceToken = tokenLogin($this, $alice)->json('data.token');
    tokenLogin($this, $bob);
    $bobTokenId = $bob->tokens()->value('id');

    freshRequest();
    $this->withToken($aliceToken)->getJson('/api/v1/auth/tokens')->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.is_current', true)->assertJsonMissingPath('data.0.token');

    freshRequest();
    $this->withToken($aliceToken)->deleteJson("/api/v1/auth/tokens/{$bobTokenId}")->assertNotFound();
    expect($bob->tokens()->count())->toBe(1);
});

test('Tokens: creating a token needs the password again, and logout deletes the token used', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    $token = tokenLogin($this, $user)->json('data.token');

    freshRequest();
    $this->withToken($token)->postJson('/api/v1/auth/tokens', ['name' => 'Laptop', 'password' => 'wrong'])->assertStatus(422)->assertJsonValidationErrors('password');
    freshRequest();
    $this->withToken($token)->postJson('/api/v1/auth/tokens', ['name' => 'Laptop', 'password' => 'Secret#Pass1'])->assertCreated()->assertJsonPath('data.details.name', 'Laptop');
    expect($user->tokens()->count())->toBe(2);

    freshRequest();
    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
    expect($user->tokens()->count())->toBe(1);

    freshRequest();
    $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
});

/* --------------------------------------------- SPA, CSRF and CORS */

test('SPA: a first-party browser login uses a cookie session and never returns a token', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    $headers = ['Origin' => 'http://localhost', 'Referer' => 'http://localhost/login'];

    $this->withHeaders($headers)->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Secret#Pass1'])
        ->assertOk()->assertJsonMissingPath('data.token')->assertJsonPath('data.auth.type', 'session');

    expect(PersonalAccessToken::count())->toBe(0);
    $this->withHeaders($headers)->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.email', $user->email);
});

test('SPA: cookie requests to the API are CSRF-protected', function () {
    // Laravel skips CSRF checks in tests; this switches the check back on.
    $this->app->bind(ValidateCsrfToken::class, fn ($app) => new class($app, $app['encrypter']) extends ValidateCsrfToken
    {
        protected function runningUnitTests()
        {
            return false;
        }
    });
    $user = p4User(RoleEnum::CASHIER->value);

    $this->withHeaders(['Origin' => 'http://localhost', 'Referer' => 'http://localhost/login'])
        ->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Secret#Pass1'])
        ->assertStatus(419)->assertJsonPath('success', false);

    // A token client (no first-party Origin) is not cookie-based, so no CSRF token is needed.
    $this->flushHeaders();
    tokenLogin($this, $user)->assertCreated();
});

test('CORS: only the configured origins may call the API with credentials', function () {
    config(['cors.allowed_origins' => ['https://portal.ssbc.test']]);
    $preflight = fn (string $origin) => $this->call('OPTIONS', '/api/v1/auth/me', [], [], [], [
        'HTTP_ORIGIN' => $origin, 'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    $ok = $preflight('https://portal.ssbc.test');
    expect($ok->headers->get('Access-Control-Allow-Origin'))->toBe('https://portal.ssbc.test')
        ->and($ok->headers->get('Access-Control-Allow-Credentials'))->toBe('true');

    // The browser only allows the call when this header equals its own origin.
    $evil = $preflight('https://evil.example');
    expect($evil->headers->get('Access-Control-Allow-Origin'))->not->toBe('https://evil.example')->not->toBe('*');
    expect(config('cors.allowed_origins'))->not->toContain('*');
});

/* ------------------------------------------------------------- F09 */

test('F09: changing the password over the API signs out other tokens but keeps this one', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    $phone = tokenLogin($this, $user)->json('data.token');
    $laptop = tokenLogin($this, $user, ['device_name' => 'Laptop'])->json('data.token');

    freshRequest();
    $this->withToken($phone)->putJson('/api/v1/auth/password', ['current_password' => 'wrong', 'password' => 'N3w#Password!', 'password_confirmation' => 'N3w#Password!'])
        ->assertStatus(422)->assertJsonValidationErrors('current_password');

    freshRequest();
    $this->withToken($phone)->putJson('/api/v1/auth/password', ['current_password' => 'Secret#Pass1', 'password' => 'N3w#Password!', 'password_confirmation' => 'N3w#Password!'])->assertOk();

    expect(Hash::check('N3w#Password!', $user->fresh()->password))->toBeTrue();
    freshRequest();
    $this->withToken($laptop)->getJson('/api/v1/auth/me')->assertUnauthorized();
    freshRequest();
    $this->withToken($phone)->getJson('/api/v1/auth/me')->assertOk();
});

test('F09: a browser session is signed out once its password changes elsewhere', function () {
    $user = p4User(RoleEnum::ADMIN->value);
    $this->actingAs($user)->get('/dashboard')->assertOk();

    $user->forceFill(['password' => 'Changed#Elsewhere1'])->save();   // e.g. changed on another device

    $this->get('/dashboard')->assertRedirect();
    $this->assertGuest('web');
});

test('F09: changing the password on the web page revokes API tokens and remember-me', function () {
    $user = p4User(RoleEnum::ADMIN->value);
    tokenLogin($this, $user);
    $remember = $user->fresh()->remember_token;

    $this->actingAs($user)->put('/settings/password', ['current_password' => 'Secret#Pass1', 'password' => 'N3w#Password!', 'password_confirmation' => 'N3w#Password!'])
        ->assertSessionHasNoErrors();

    expect($user->tokens()->count())->toBe(0)->and($user->fresh()->remember_token)->not->toBe($remember);
});

test('F09: a password reset ends every session and token', function () {
    Notification::fake();
    $user = p4User(RoleEnum::CASHIER->value);
    tokenLogin($this, $user);
    $resetToken = Password::broker()->createToken($user);

    $this->postJson('/api/v1/auth/reset-password', ['token' => $resetToken, 'email' => $user->email, 'password' => 'Reset#Pass123', 'password_confirmation' => 'Reset#Pass123'])->assertOk();

    expect($user->tokens()->count())->toBe(0)->and(Hash::check('Reset#Pass123', $user->fresh()->password))->toBeTrue();
});

test('API: forgot-password answers the same whether or not the email exists', function () {
    Notification::fake();
    $user = p4User(RoleEnum::CASHIER->value);

    $a = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk()->json('message');
    $b = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.test'])->assertOk()->json('message');

    expect($a)->toBe($b);
    Notification::assertSentTo($user, ResetPassword::class);
});

/* ------------------------------------------------------------- F08 */

function leaderOf(User $user): Member
{
    return tap(Member::create(['first_name' => 'Lead', 'last_name' => $user->id, 'status' => 'Active']), fn (Member $m) => $m->forceFill(['user_id' => $user->id])->saveQuietly());
}

test('F08: a Department Leader edits only the departments they lead', function () {
    $leader = p4User(RoleEnum::DEPARTMENTLEADER->value);
    $member = leaderOf($leader);
    $own = Department::create(['name' => 'Choir', 'category' => 'Choir', 'leader_id' => $member->id]);
    $other = Department::create(['name' => 'Ushers', 'category' => 'Ushering']);

    $this->actingAs($leader)->patch("/departments/{$own->id}", ['name' => 'Choir', 'category' => 'Choir', 'description' => 'Sunday choir'])->assertSessionHasNoErrors();
    expect($own->fresh()->description)->toBe('Sunday choir');

    $this->actingAs($leader)->patch("/departments/{$other->id}", ['name' => 'Taken over', 'category' => 'Ushering'])->assertForbidden();
    $this->actingAs($leader)->post("/departments/{$other->id}/leader", ['member_id' => $member->id])->assertForbidden();
    expect($other->fresh()->name)->toBe('Ushers');

    $this->actingAs($leader)->get('/departments')->assertInertia(fn (Assert $p) => $p
        ->where('departments', fn ($rows) => collect($rows)->firstWhere('name', 'Choir')['can_update'] === true
            && collect($rows)->firstWhere('name', 'Ushers')['can_update'] === false));

    // Supervisors (departments.manage-any) still edit every department.
    $this->actingAs(p4User(RoleEnum::SUPERVISOR->value))->patch("/departments/{$other->id}", ['name' => 'Ushers', 'category' => 'Ushering', 'description' => 'ok'])->assertSessionHasNoErrors();
});

test('F08: a Department Leader edits only the ministries they lead', function () {
    $leader = p4User(RoleEnum::DEPARTMENTLEADER->value);
    $member = leaderOf($leader);
    $own = Ministry::create(['name' => 'Youth', 'category' => 'youth', 'leader_id' => $member->id]);
    $other = Ministry::create(['name' => 'Missions', 'category' => 'missions']);

    $this->actingAs($leader)->patch("/ministries/{$own->id}", ['name' => 'Youth', 'category' => 'youth', 'description' => 'Fridays'])->assertSessionHasNoErrors();
    $this->actingAs($leader)->patch("/ministries/{$other->id}", ['name' => 'Missions', 'category' => 'missions'])->assertForbidden();
});

test('F08: role editors can only add permissions they hold, never to their own or protected roles', function () {
    $manager = Role::create(['name' => 'Role Manager', 'guard_name' => 'web']);
    $manager->givePermissionTo(['roles.view', 'roles.update', 'roles.create', 'members.view', 'events.view']);
    $editor = p4User('Role Manager');
    $target = Role::create(['name' => 'Greeters', 'guard_name' => 'web']);
    $ids = fn (array $names) => Permission::whereIn('name', $names)->pluck('id')->all();

    // Escalation attempt: users.delete is not the editor's to give.
    $this->actingAs($editor)->put("/admin/roles/{$target->id}", ['name' => 'Greeters', 'permissions' => $ids(['users.delete'])])->assertSessionHasErrors('permissions');
    expect($target->fresh()->hasPermissionTo('users.delete'))->toBeFalse();

    $this->actingAs($editor)->put("/admin/roles/{$target->id}", ['name' => 'Greeters', 'permissions' => $ids(['members.view'])])->assertSessionHasNoErrors();
    expect($target->fresh()->hasPermissionTo('members.view'))->toBeTrue();

    // Own role and protected roles are off limits.
    $this->actingAs($editor)->put("/admin/roles/{$manager->id}", ['name' => 'Role Manager', 'permissions' => $ids(['roles.view'])])->assertForbidden();
    $admin = Role::findByName(RoleEnum::ADMIN->value);
    $this->actingAs($editor)->put("/admin/roles/{$admin->id}", ['name' => 'Admin', 'permissions' => []])->assertForbidden();

    // Creating a role is held to the same ceiling.
    $this->actingAs($editor)->post('/admin/roles', ['name' => 'Sneaky', 'permissions' => $ids(['finance.delete'])])->assertSessionHasErrors('permissions');

    expect(AuditLog::where('module', 'Access Control')->where('table_name', 'roles')->count())->toBe(1);
});

test('F08: user roles can be changed only within the ceiling, and every change is audited', function () {
    $admin = p4User(RoleEnum::ADMIN->value);
    $person = p4User(RoleEnum::MEMBER->value);
    $otherAdmin = p4User(RoleEnum::ADMIN->value);

    $this->actingAs($admin)->put("/admin/users/{$person->id}/roles", ['roles' => ['Finance Officer']])->assertSessionHasNoErrors();
    expect($person->fresh()->hasRole('Finance Officer'))->toBeTrue();

    $this->actingAs($admin)->put("/admin/users/{$person->id}/roles", ['roles' => ['Admin']])->assertForbidden();
    $this->actingAs($admin)->put("/admin/users/{$person->id}/roles", ['roles' => ['Superadmin']])->assertForbidden();
    $this->actingAs($admin)->put("/admin/users/{$admin->id}/roles", ['roles' => ['Admin', 'Pastor']])->assertForbidden();
    $this->actingAs($admin)->put("/admin/users/{$otherAdmin->id}/roles", ['roles' => ['Member']])->assertForbidden();

    expect($otherAdmin->fresh()->hasRole('Admin'))->toBeTrue()
        ->and(AuditLog::where('module', 'Access Control')->where('table_name', 'model_has_roles')->count())->toBe(1);

    // The Superadmin can make someone an Admin.
    $this->actingAs(p4User(RoleEnum::SUPERADMIN->value))->put("/admin/users/{$person->id}/roles", ['roles' => ['Admin']])->assertSessionHasNoErrors();
    expect($person->fresh()->hasRole('Admin'))->toBeTrue();
});

test('F08: permissions the application uses cannot be renamed or deleted', function () {
    $super = p4User(RoleEnum::SUPERADMIN->value);
    $perm = Permission::findByName('members.view');

    $this->actingAs($super)->put("/admin/permissions/{$perm->id}", ['name' => 'members.see', 'module' => 'Members'])->assertSessionHasErrors('name');
    expect($perm->fresh()->name)->toBe('members.view');

    $custom = Permission::create(['name' => 'choir.rota', 'guard_name' => 'web', 'module' => 'Choir']);
    $this->actingAs($super)->delete("/admin/permissions/{$custom->id}")->assertSessionHasNoErrors();
    $unused = Permission::findByName('website.manage');
    $unused->roles()->detach();
    $this->actingAs($super)->delete("/admin/permissions/{$unused->id}")->assertSessionHasErrors('permission');
});

/* ------------------------------------------------------------- F21 */

test('F21: website.manage exists, Admins can edit the website, guests and other staff cannot', function () {
    expect(Permission::where('name', 'website.manage')->exists())->toBeTrue();

    $this->get('/website-content')->assertRedirect('/login');
    $this->actingAs(p4User(RoleEnum::SUPERVISOR->value))->get('/website-content')->assertForbidden();
    $this->actingAs(p4User(RoleEnum::ADMIN->value))->get('/website-content')->assertOk();
});

/* ------------------------------------- fixes from the security review */

test('Review: wrong two-factor codes are limited per account, whatever the IP', function () {
    $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());
    $google = app(Google2FA::class);
    $secret = $google->generateSecretKey();
    $user = p4User(RoleEnum::CASHIER->value);
    $user->forceFill(['two_factor_secret' => encrypt($secret), 'two_factor_confirmed_at' => now()])->save();

    foreach (range(1, 5) as $i) {
        $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$i}"]);
        tokenLogin($this, $user, ['code' => '000000'])->assertStatus(422);
    }
    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.99']);
    tokenLogin($this, $user, ['code' => $google->getCurrentOtp($secret)])->assertStatus(429)->assertJsonPath('success', false);
});

test('Review: a limited Superadmin token cannot grant permissions or roles through policies', function () {
    $super = p4User(RoleEnum::SUPERADMIN->value);
    $record = PersonalAccessToken::findToken(tokenLogin($this, $super, ['abilities' => ['members.view']])->json('data.token'));
    $super->withAccessToken($record);

    expect(Gate::forUser($super)->allows('grant', [Role::class, ['users.delete']]))->toBeFalse()
        ->and(UserPolicy::canGiveRole($super, RoleEnum::FINANCEOFFICER->value))->toBeFalse();
});

test('Review: nobody changes their own roles, and the last Superadmin cannot be removed', function () {
    $super = p4User(RoleEnum::SUPERADMIN->value);
    $this->actingAs($super)->put("/admin/users/{$super->id}/roles", ['roles' => ['Member']])->assertForbidden();
    expect($super->fresh()->hasRole('Superadmin'))->toBeTrue();

    $second = p4User(RoleEnum::SUPERADMIN->value);
    $this->actingAs($second)->put("/admin/users/{$super->id}/roles", ['roles' => ['Admin']])->assertSessionHasNoErrors();
    expect($super->fresh()->hasRole('Superadmin'))->toBeFalse();

    $this->actingAs(p4User(RoleEnum::SUPERADMIN->value))->put("/admin/users/{$second->id}/roles", ['roles' => ['Admin']])->assertSessionHasNoErrors();
    // Only the third account is Superadmin now. Only a Superadmin could demote
    // it, and nobody can change their own roles, so it stays.
    $last = User::role('Superadmin')->first();
    $this->actingAs($second->fresh())->put("/admin/users/{$last->id}/roles", ['roles' => ['Admin']])->assertForbidden();
});

test('Review: a role name in another case does not get past the protected-role check', function () {
    $admin = p4User(RoleEnum::ADMIN->value);
    $person = p4User(RoleEnum::MEMBER->value);

    $this->actingAs($admin)->put("/admin/users/{$person->id}/roles", ['roles' => ['admin']]);
    expect($person->fresh()->hasRole('Admin'))->toBeFalse();
});

test('Review: reset-password does not reveal whether an email has an account', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    $body = ['token' => 'bogus', 'password' => 'Reset#Pass123', 'password_confirmation' => 'Reset#Pass123'];

    $known = $this->postJson('/api/v1/auth/reset-password', [...$body, 'email' => $user->email])->assertStatus(422)->json('errors.email');
    $unknown = $this->postJson('/api/v1/auth/reset-password', [...$body, 'email' => 'nobody@example.test'])->assertStatus(422)->json('errors.email');

    expect($known)->toBe($unknown);
});

test('Review: malformed login input is a validation error, not a server error', function () {
    $this->postJson('/api/v1/auth/login', ['email' => ['a@b.c'], 'password' => 'x'])->assertStatus(422)->assertJsonPath('success', false);
});

test('Review: an account flagged to change its password can only reach me, password and logout', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    $token = tokenLogin($this, $user)->json('data.token');
    $user->forceFill(['must_change_credentials' => true])->save();

    freshRequest();
    $this->withToken($token)->getJson('/api/v1/auth/tokens')->assertForbidden()->assertJsonPath('meta.password_change_required', true);
    freshRequest();
    $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.must_change_password', true);
});

test('Review: signing in for an API token does not end browser sessions', function () {
    config(['session.driver' => 'database', 'church.max_sessions' => 1]);
    $user = p4User(RoleEnum::CASHIER->value);
    DB::table('sessions')->insert(['id' => 'browser-1', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time(), 'ip_address' => null, 'user_agent' => null]);

    tokenLogin($this, $user)->assertCreated();

    expect(DB::table('sessions')->where('id', 'browser-1')->exists())->toBeTrue();
});

test('Review: the device that changed the password keeps a working remember-me cookie', function () {
    $user = p4User(RoleEnum::CASHIER->value);
    $guard = auth()->guard('web');
    $request = Request::create('/settings/password', 'PUT', [], [$guard->getRecallerName() => 'old']);

    UserSessions::passwordChanged($user, $request);

    $queued = $guard->getCookieJar()->queued($guard->getRecallerName());
    expect($queued)->not->toBeNull()
        ->and($queued->getValue())->toStartWith($user->id.'|'.$user->fresh()->remember_token.'|');
});
