<?php

/*
 * Phase 2 security regression tests. Each test names the audit finding it
 * guards (see the Phase 1 audit report). If one of these fails, a fixed
 * vulnerability has come back.
 */

use App\Enums\Role as RoleEnum;
use App\Models\AuditLog;
use App\Models\Member;
use App\Models\Notification as AppNotification;
use App\Models\PastoralCare;
use App\Models\PrayerRequest;
use App\Models\User;
use App\Notifications\MemberAccountInvitation;
use App\Support\Csv;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => $this->seed(RolePermissionSeeder::class));

function securityUser(string $role, array $attrs = []): User
{
    return tap(
        User::factory()->create(['must_change_credentials' => false, 'status' => 'approved', ...$attrs]),
        fn (User $u) => $u->assignRole($role),
    );
}

/* ---------------------------------------------------------------- F01 */

test('F01: no code path creates a login with a known password', function () {
    Notification::fake();
    $member = Member::create(['first_name' => 'Abena', 'last_name' => 'Mensah', 'email' => 'abena@example.test', 'status' => 'Active']);
    $user = $member->fresh()->user;

    expect(Hash::check('SSBCm@2026#', $user->password))->toBeFalse()
        ->and(config('church.default_member_password'))->toBeNull();
});

test('F01: members:accounts --retire-default locks accounts still on the old shared password and re-invites them', function () {
    Notification::fake();
    $old = 'SSBCm@2026#';
    $onDefault = securityUser(RoleEnum::MEMBER->value, ['password' => $old]);
    $changed = securityUser(RoleEnum::MEMBER->value, ['password' => 'Own@Password99']);

    $this->artisan('members:accounts', ['--retire-default' => $old])->assertSuccessful();

    expect(Hash::check($old, $onDefault->fresh()->password))->toBeFalse()
        ->and(Hash::check('Own@Password99', $changed->fresh()->password))->toBeTrue();
    Notification::assertSentTo($onDefault, MemberAccountInvitation::class);
    Notification::assertNotSentTo($changed, MemberAccountInvitation::class);
});

/* ---------------------------------------------------------------- F02 */

test('F02: the Member role holds no staff-page permissions', function () {
    $member = securityUser(RoleEnum::MEMBER->value);

    expect($member->getAllPermissions()->pluck('name')->all())->toBe(['dashboard.view']);

    foreach (['/prayer-requests', '/departments', '/ministries', '/sermons', '/events', '/announcements', '/member-management'] as $page) {
        $this->actingAs($member)->get($page)->assertForbidden();
    }
});

test('F02: a self-registered account must verify its email before reaching any page', function () {
    $this->post('/register', [
        'name' => 'Stranger', 'email' => 'stranger@example.test',
        'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Str0ng!Passw0rd',
    ]);
    $user = User::where('email', 'stranger@example.test')->firstOrFail();

    expect($user->hasVerifiedEmail())->toBeFalse();
    $this->actingAs($user)->get('/member-portal')->assertRedirect(route('verification.notice'));
    $this->actingAs($user)->get('/prayer-requests')->assertRedirect(route('verification.notice'));
});

test('F02: a rejected account cannot sign in', function () {
    securityUser(RoleEnum::MEMBER->value, ['email' => 'rejected@example.test', 'password' => 'Str0ng!Passw0rd', 'status' => 'rejected']);

    $this->post('/login', ['email' => 'rejected@example.test', 'password' => 'Str0ng!Passw0rd'])->assertSessionHasErrors('email');
    $this->assertGuest();
});

/* ---------------------------------------------------------------- F03 */

test('F03: an Admin cannot edit, deactivate, delete, block or sign out the Superadmin', function () {
    $super = securityUser(RoleEnum::SUPERADMIN->value, ['email' => 'super@example.test']);
    $admin = securityUser(RoleEnum::ADMIN->value);

    $this->actingAs($admin)->put(route('admin.users.update', $super), ['name' => 'Owned', 'email' => 'attacker@example.test'])->assertForbidden();
    $this->actingAs($admin)->post(route('admin.users.deactivate', $super))->assertForbidden();
    $this->actingAs($admin)->delete(route('admin.users.destroy', $super))->assertForbidden();
    $this->actingAs($admin)->post(route('activity.users.block', $super))->assertForbidden();
    $this->actingAs($admin)->post(route('activity.users.sign-out', $super))->assertForbidden();

    expect($super->fresh()->email)->toBe('super@example.test')->and($super->fresh()->trashed())->toBeFalse();
});

test('F03: an Admin cannot manage another Admin, but can manage ordinary staff', function () {
    $admin = securityUser(RoleEnum::ADMIN->value);
    $otherAdmin = securityUser(RoleEnum::ADMIN->value);
    $cashier = securityUser(RoleEnum::CASHIER->value, ['email' => 'cashier@example.test']);

    $this->actingAs($admin)->put(route('admin.users.update', $otherAdmin), ['name' => 'X', 'email' => $otherAdmin->email])->assertForbidden();

    $this->actingAs($admin)->put(route('admin.users.update', $cashier), ['name' => 'Cashier Two', 'email' => 'cashier2@example.test'])->assertRedirect();
    $cashier->refresh();
    expect($cashier->name)->toBe('Cashier Two')
        // A new address must be verified by its owner.
        ->and($cashier->hasVerifiedEmail())->toBeFalse();
});

test('F03: the Superadmin can still manage Admins', function () {
    $super = securityUser(RoleEnum::SUPERADMIN->value);
    $admin = securityUser(RoleEnum::ADMIN->value);

    $this->actingAs($super)->post(route('admin.users.deactivate', $admin))->assertRedirect();
    expect($admin->fresh()->is_active)->toBeFalse();
});

/* ---------------------------------------------------------------- F04 */

test('F04: confidential pastoral cases are hidden from staff without pastoral-care.confidential', function () {
    $admin = securityUser(RoleEnum::ADMIN->value);
    $pastor = securityUser(RoleEnum::PASTOR->value);
    PastoralCare::create(['member_name' => 'Open Case', 'care_type' => 'Hospital Visit', 'description' => 'x', 'status' => 'Open', 'priority' => 'Normal', 'is_confidential' => false]);
    $secret = PastoralCare::create(['member_name' => 'Secret Case', 'care_type' => 'Addiction Recovery', 'description' => 'y', 'status' => 'Open', 'priority' => 'Normal', 'is_confidential' => true]);

    $this->actingAs($admin)->get('/pastoral-care')->assertInertia(fn (Assert $p) => $p->has('records', 1)->where('records.0.member_name', 'Open Case'));
    $this->actingAs($admin)->delete("/pastoral-care/{$secret->id}")->assertNotFound();
    $this->actingAs($pastor)->get('/pastoral-care')->assertInertia(fn (Assert $p) => $p->has('records', 2));
});

test('F04: new pastoral care alerts carry no name or care type and go only to the pastoral team', function () {
    $admin = securityUser(RoleEnum::ADMIN->value);
    $cashier = securityUser(RoleEnum::CASHIER->value);

    $this->actingAs($admin)->post('/pastoral-care', [
        'member_name' => 'Samuel Doe', 'care_type' => 'Addiction Recovery', 'description' => 'Private notes',
        'status' => 'Open', 'priority' => 'Urgent', 'is_confidential' => false,
    ])->assertSessionHasNoErrors();

    $alert = AppNotification::where('title', 'like', '%pastoral care case%')->firstOrFail();
    expect($alert->recipient_type)->toBe('permission')
        ->and($alert->recipient_id)->toBe('pastoral-care.view')
        ->and($alert->message)->not->toContain('Samuel')
        ->and($alert->message)->not->toContain('Addiction')
        ->and(AppNotification::visibleTo($cashier)->whereKey($alert->id)->exists())->toBeFalse()
        ->and(AppNotification::visibleTo($admin)->whereKey($alert->id)->exists())->toBeTrue();
});

test('F04: the audit log records that pastoral text changed, never what it says', function () {
    $pastor = securityUser(RoleEnum::PASTOR->value);
    $this->actingAs($pastor)->post('/pastoral-care', [
        'member_name' => 'Samuel Doe', 'care_type' => 'Grief Support', 'description' => 'Lost his wife last week',
        'status' => 'Open', 'priority' => 'Normal', 'is_confidential' => true,
    ])->assertSessionHasNoErrors();

    $log = AuditLog::where('table_name', 'pastoral_care')->firstOrFail();
    $json = json_encode([$log->new_values, $log->description]);
    expect($json)->not->toContain('Lost his wife')
        ->and($json)->not->toContain('Samuel')
        ->and($log->new_values['description'])->toBe('[redacted]');
});

test('F04: an anonymous prayer request never sends its requester to the browser', function () {
    $pastor = securityUser(RoleEnum::PASTOR->value);
    $pr = PrayerRequest::create(['requester_name' => 'Hidden Person', 'subject' => 'Health', 'request_details' => 'Please pray', 'category' => 'Health & Healing', 'status' => 'Active', 'is_anonymous' => true]);

    $this->actingAs($pastor)->get('/prayer-requests')->assertInertia(fn (Assert $p) => $p
        ->where('requests.0.requester', 'Anonymous')
        ->where('requests.0.requester_name', null)
        ->where('requests.0.member_code', null));

    // Saving the form (which sends no name for anonymous requests) keeps the stored name.
    $this->actingAs($pastor)->patch(route('prayer-requests.update', $pr), [
        'subject' => 'Health', 'request_details' => 'Please pray', 'category' => 'Health & Healing', 'status' => 'Active', 'is_anonymous' => true,
    ])->assertSessionHasNoErrors();
    expect($pr->fresh()->requester_name)->toBe('Hidden Person');
});

/* ---------------------------------------------------------------- F05 */

test('F05: the portal only claims an unlinked member record for a verified, member-only login', function () {
    $member = Member::create(['first_name' => 'Kofi', 'last_name' => 'Asante', 'email' => 'kofi@example.test', 'status' => 'Pending']);

    $unverified = securityUser(RoleEnum::MEMBER->value, ['email' => 'kofi@example.test', 'email_verified_at' => null]);
    $this->actingAs($unverified)->get('/member-portal');
    expect($member->fresh()->user_id)->toBeNull();

    $unverified->forceFill(['email_verified_at' => now()])->save();
    $this->actingAs($unverified->fresh())->get('/member-portal')->assertOk();
    expect($member->fresh()->user_id)->toBe($unverified->id);
});

/* ---------------------------------------------------------------- F13 */

test('F13: spreadsheet formulas are neutralised in CSV cells, numbers are not', function () {
    expect(Csv::safe('=HYPERLINK("http://evil","x")'))->toBe('\'=HYPERLINK("http://evil","x")')
        ->and(Csv::safe('+1-2'))->toBe("'+1-2")
        ->and(Csv::safe('@SUM(A1)'))->toBe("'@SUM(A1)")
        ->and(Csv::safe('-12.50'))->toBe('-12.50')
        ->and(Csv::safe('-$1,200.00'))->toBe('-$1,200.00')
        ->and(Csv::safe('Grace'))->toBe('Grace')
        ->and(Csv::safe(42))->toBe(42);
});

test('F13: a formula typed into a member name is exported as text', function () {
    $admin = securityUser(RoleEnum::ADMIN->value);
    Member::create(['first_name' => '=cmd|calc', 'last_name' => 'Evil', 'status' => 'Active']);

    $csv = $this->actingAs($admin)->get(route('members.export'))->streamedContent();
    expect($csv)->toContain("'=cmd|calc")->not->toContain(',=cmd|calc');
});

/* ---------------------------------------------------------------- F14 */

test('F14: sign-in locations are not looked up unless an HTTPS endpoint is configured', function () {
    Http::fake();

    config(['church.geoip_enabled' => true, 'church.geoip_endpoint' => 'http://ip-api.com/json/{ip}']);
    \App\Services\ActivityLogger::location('8.8.8.8', true);
    Http::assertNothingSent();

    config(['church.geoip_enabled' => false]);
    \App\Services\ActivityLogger::location('8.8.4.4', true);
    Http::assertNothingSent();
});

/* ---------------------------------------------------------------- F22 */

test('F22: member-only accounts cannot upload files to the public disk', function () {
    Storage::fake('public');
    $member = securityUser(RoleEnum::MEMBER->value);
    $staff = securityUser(RoleEnum::SUPERVISOR->value);

    $this->actingAs($member)->post(route('uploads.image'), ['file' => UploadedFile::fake()->image('a.png')])->assertForbidden();
    $this->actingAs($staff)->post(route('uploads.image'), ['file' => UploadedFile::fake()->image('a.png')])->assertOk();
});
