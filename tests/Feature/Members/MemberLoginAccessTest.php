<?php

use App\Enums\Role as RoleEnum;
use App\Models\Member;
use App\Models\User;
use App\Notifications\MemberAccountInvitation;
use App\Notifications\MemberRegistrationReceived;
use App\Notifications\MembershipApproved;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

beforeEach(fn () => $this->seed(RolePermissionSeeder::class));

/** A complete public "Join Our Family" submission. */
function publicRegistrationPayload(array $overrides = []): array
{
    return [
        'first_name' => 'Ama',
        'last_name' => 'Mensah',
        'gender' => 'Female',
        'date_of_birth' => '1990-04-12',
        'phone' => '+231770000001',
        'email' => 'ama@example.test',
        'password' => 'Chosen#Pass2026',
        'password_confirmation' => 'Chosen#Pass2026',
        'address' => '12 Broad Street',
        'city' => 'Monrovia',
        'country' => 'Liberia',
        'membership_type' => 'Regular Member',
        'baptized' => false,
        'communion_participant' => false,
        'emergency_name' => 'Kofi Mensah',
        'emergency_phone' => '+231770000002',
        'emergency_relation' => 'Spouse',
        'consent' => true,
        ...$overrides,
    ];
}

/** A member with a member-only login that can sign in with "Secret#Pass1". */
function lockableMemberLogin(string $status = 'Active'): User
{
    $user = User::factory()->create(['email' => 'kwame@example.test', 'password' => 'Secret#Pass1', 'status' => 'approved']);
    $user->assignRole(RoleEnum::MEMBER->value);
    Member::create(['first_name' => 'Kwame', 'last_name' => 'Boateng', 'email' => $user->email, 'status' => $status, 'user_id' => $user->id]);

    return $user->fresh();
}

function lockoutStaffUser(string $role = RoleEnum::ADMIN->value): User
{
    return tap(User::factory()->create(), fn (User $u) => $u->assignRole($role));
}

test('a registrant signs in with the password they chose once staff approve them', function () {
    Notification::fake();

    $this->post(route('public-registration.store'), publicRegistrationPayload())->assertSessionHasNoErrors();

    $member = Member::where('email', 'ama@example.test')->firstOrFail();
    expect($member->user_id)->toBeNull()
        ->and(User::where('email', 'ama@example.test')->exists())->toBeFalse()
        ->and($member->toArray())->not->toHaveKey('pending_password');

    $this->actingAs(lockoutStaffUser())->patch(route('members.status', $member), ['status' => 'Approved'])->assertSessionHasNoErrors();
    auth()->logout();

    $user = $member->fresh()->user;
    expect($user)->not->toBeNull()
        ->and(Hash::check('Chosen#Pass2026', $user->password))->toBeTrue()
        ->and($user->hasVerifiedEmail())->toBeTrue()
        ->and($member->fresh()->getRawOriginal('pending_password'))->toBeNull();
    Notification::assertNotSentTo($user, MemberAccountInvitation::class);

    $this->post(route('login.store'), ['email' => 'ama@example.test', 'password' => 'Chosen#Pass2026'])->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($user);
    $this->get('/member-portal')->assertOk();
});

test('public registration requires a confirmed password', function (array $overrides, string $field) {
    $this->post(route('public-registration.store'), publicRegistrationPayload($overrides))->assertSessionHasErrors($field);

    expect(Member::where('email', 'ama@example.test')->exists())->toBeFalse();
})->with([
    'missing' => [['password' => '', 'password_confirmation' => ''], 'password'],
    'not matching' => [['password_confirmation' => 'Different#Pass1'], 'password'],
]);

test('suspended, inactive and rejected members cannot sign in and are told why', function (string $status, string $message) {
    lockableMemberLogin($status);

    $this->post(route('login.store'), ['email' => 'kwame@example.test', 'password' => 'Secret#Pass1'])
        ->assertSessionHasErrors(['account' => $message]);
    $this->assertGuest();

    $this->postJson('/api/v1/auth/login', ['email' => 'kwame@example.test', 'password' => 'Secret#Pass1', 'device_name' => 'Phone'])
        ->assertStatus(422)
        ->assertJsonPath('errors.account.0', $message);
})->with([
    'suspended' => ['Suspended', 'Your membership account has been suspended. Please contact the church office for help.'],
    'inactive' => ['Inactive', 'Your membership account is inactive. Please contact the church office to reactivate it.'],
    'rejected' => ['Rejected', 'Your membership registration was not approved. Please contact the church office.'],
]);

test('a signed-in member who is suspended is signed out on their next request', function () {
    $user = lockableMemberLogin('Active');
    $user->createToken('Phone');
    $this->actingAs($user)->get('/member-portal')->assertOk();

    $this->actingAs(lockoutStaffUser())->patch(route('members.status', $user->member), ['status' => 'Suspended'])->assertSessionHasNoErrors();
    expect($user->tokens()->count())->toBe(0);

    $this->actingAs($user)->get('/member-portal')
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors(['account' => Member::LOCKED_OUT['Suspended']]);
    $this->assertGuest();
});

test('a reactivated member can sign in again', function () {
    $user = lockableMemberLogin('Inactive');
    $this->actingAs(lockoutStaffUser())->patch(route('members.status', $user->member), ['status' => 'Active']);
    auth()->logout();

    $this->post(route('login.store'), ['email' => 'kwame@example.test', 'password' => 'Secret#Pass1'])->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($user);
});

test('a staff login is not locked out by a linked member record (F05)', function () {
    $pastor = User::factory()->create(['email' => 'pastor@example.test', 'password' => 'Secret#Pass1', 'status' => 'approved']);
    $pastor->assignRole(RoleEnum::PASTOR->value);
    Member::create(['first_name' => 'Paul', 'last_name' => 'Doe', 'email' => $pastor->email, 'status' => 'Inactive', 'user_id' => $pastor->id]);

    $this->post(route('login.store'), ['email' => 'pastor@example.test', 'password' => 'Secret#Pass1'])->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($pastor);
});

/*
| Registration and approval emails
*/

function emailedTo(string $email): Closure
{
    return fn ($notification, array $channels, AnonymousNotifiable $notifiable) => array_key_exists($email, (array) $notifiable->routes['mail']);
}

test('a public registrant is emailed when they register and when they are approved', function () {
    Notification::fake();

    $this->post(route('public-registration.store'), publicRegistrationPayload())->assertSessionHasNoErrors();
    $member = Member::where('email', 'ama@example.test')->firstOrFail();

    Notification::assertSentOnDemand(MemberRegistrationReceived::class, function (MemberRegistrationReceived $n, array $channels, AnonymousNotifiable $notifiable) use ($member) {
        return emailedTo('ama@example.test')($n, $channels, $notifiable)
            && $n->reference === $member->reg_ref
            && $n->choseSignInPassword;
    });
    Notification::assertNotSentTo(new AnonymousNotifiable, MembershipApproved::class);

    $this->actingAs(lockoutStaffUser())->patch(route('members.status', $member), ['status' => 'Approved'])->assertSessionHasNoErrors();

    Notification::assertSentOnDemand(MembershipApproved::class, fn (MembershipApproved $n, array $channels, AnonymousNotifiable $notifiable) => emailedTo('ama@example.test')($n, $channels, $notifiable)
        && $n->memberId === $member->fresh()->member_id
        && $n->signIn === MembershipApproved::SIGN_IN_READY);
});

test('a portal registrant is emailed that their registration was received', function () {
    Notification::fake();
    $user = User::factory()->create(['email' => 'portal@example.test']);
    $user->assignRole(RoleEnum::MEMBER->value);

    $this->actingAs($user)->post(route('member.portal.store'), ['first_name' => 'Eric', 'last_name' => 'Mugisha', 'baptized' => false])->assertSessionHasNoErrors();

    Notification::assertSentOnDemand(MemberRegistrationReceived::class, fn (MemberRegistrationReceived $n, array $channels, AnonymousNotifiable $notifiable) => emailedTo('portal@example.test')($n, $channels, $notifiable)
        && ! $n->choseSignInPassword);
});

test('approving a registrant without a chosen password points them to the set-password email', function () {
    Notification::fake();
    $member = Member::create(['first_name' => 'Kofi', 'last_name' => 'Asante', 'email' => 'kofi@example.test', 'status' => 'Pending', 'reg_ref' => Member::nextRegRef()]);

    $this->actingAs(lockoutStaffUser())->patch(route('members.status', $member), ['status' => 'Active'])->assertSessionHasNoErrors();

    Notification::assertSentOnDemand(MembershipApproved::class, fn (MembershipApproved $n) => $n->signIn === MembershipApproved::SIGN_IN_SETUP);
    Notification::assertSentTo($member->fresh()->user, MemberAccountInvitation::class);
});

test('reactivating a suspended member does not send an approval email', function () {
    $user = lockableMemberLogin('Suspended');
    Notification::fake();

    $this->actingAs(lockoutStaffUser())->patch(route('members.status', $user->member), ['status' => 'Active'])->assertSessionHasNoErrors();

    Notification::assertNotSentTo(new AnonymousNotifiable, MembershipApproved::class);
});

test('a registration is still saved when the confirmation email cannot be sent', function () {
    Notification::shouldReceive('send')->andThrow(new RuntimeException('SMTP is down'));

    $this->post(route('public-registration.store'), publicRegistrationPayload())->assertSessionHasNoErrors();

    expect(Member::where('email', 'ama@example.test')->exists())->toBeTrue();
});

test('the registration and approval emails show the reference, Member ID and how to sign in', function () {
    $received = (new MemberRegistrationReceived('Ama', 'SSBC-REG-2026-000001', true))->toMail(new AnonymousNotifiable)->render();
    $approved = (new MembershipApproved('Ama', 'SSBC-M-0001', MembershipApproved::SIGN_IN_READY))->toMail(new AnonymousNotifiable)->render();

    expect((string) $received)->toContain('SSBC-REG-2026-000001')->toContain('the password you chose')
        ->and((string) $approved)->toContain('SSBC-M-0001')->toContain(route('login'));
});
