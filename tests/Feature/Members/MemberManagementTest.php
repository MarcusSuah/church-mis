<?php

use App\Enums\Role as RoleEnum;
use App\Enums\UserStatus;
use App\Models\Member;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
});

function userWithRole(string $role): User
{
    return tap(User::factory()->create(), fn (User $u) => $u->assignRole($role));
}

function memberPayload(array $overrides = []): array
{
    return array_merge([
        'first_name' => 'Grace',
        'middle_name' => 'M',
        'last_name' => 'Uwase',
        'gender' => 'Female',
        'date_of_birth' => '1995-04-12',
        'marital_status' => 'Single',
        'email' => 'grace@example.com',
        'phone' => '+250788000000',
        'city' => 'Kigali',
        'country' => 'Rwanda',
        'status' => 'Active',
        'membership_type' => 'Regular Member',
        'date_joined' => '2026-01-10',
        'baptized' => true,
        'baptism_date' => '2015-06-01',
        'communion_participant' => true,
        'emergency_name' => 'Jean',
        'emergency_phone' => '+250788111111',
    ], $overrides);
}

test('super admin can open member management and pending registrations', function () {
    $admin = userWithRole(RoleEnum::SUPERADMIN->value);
    Member::create(memberPayload());
    // A registration is a member that came in through a form, i.e. has a reg_ref.
    Member::create(memberPayload(['email' => 'p@example.com', 'first_name' => 'Paul', 'status' => 'Pending', 'reg_ref' => Member::nextRegRef()]));

    $this->actingAs($admin)->get(route('members.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('member-management/index')
            ->has('members.data', 2)
            ->where('stats.pending', 1)
            ->where('can.create', true)
            ->where('can.update', true)
            ->where('can.delete', true));

    $this->actingAs($admin)->get(route('pending-registrations.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pending-registrations/index')
            ->has('registrations', 1)
            ->where('can.update', true));
});

test('admin role can create, update, change status and delete members', function () {
    $admin = userWithRole(RoleEnum::ADMIN->value);

    $this->actingAs($admin)->post(route('members.store'), memberPayload())
        ->assertSessionHasNoErrors()->assertRedirect();

    $member = Member::firstOrFail();
    expect($member->member_id)->toStartWith('SSBC-')
        ->and($member->baptized)->toBeTrue()
        ->and($member->date_of_birth->format('Y-m-d'))->toBe('1995-04-12');

    $this->actingAs($admin)->patch(route('members.update', $member), memberPayload(['city' => 'Huye']))
        ->assertSessionHasNoErrors();
    expect($member->fresh()->city)->toBe('Huye');

    $this->actingAs($admin)->patch(route('members.status', $member), ['status' => 'Suspended'])
        ->assertSessionHasNoErrors();
    expect($member->fresh()->status)->toBe('Suspended');

    $this->actingAs($admin)->post(route('members.bulk-status'), ['ids' => [$member->id], 'action' => 'activate'])
        ->assertSessionHasNoErrors();
    expect($member->fresh()->status)->toBe('Active');

    $this->actingAs($admin)->delete(route('members.destroy', $member))->assertRedirect();
    expect(Member::count())->toBe(0);
});

test('pastor can view and edit but not create or delete', function () {
    $pastor = userWithRole(RoleEnum::PASTOR->value);
    $member = Member::create(memberPayload());

    $this->actingAs($pastor)->get(route('members.index'))
        ->assertInertia(fn (Assert $page) => $page->where('can.create', false)->where('can.delete', false));

    $this->actingAs($pastor)->post(route('members.store'), memberPayload(['email' => 'x@example.com']))->assertForbidden();
    $this->actingAs($pastor)->delete(route('members.destroy', $member))->assertForbidden();
    $this->actingAs($pastor)->patch(route('members.status', $member), ['status' => 'Approved'])->assertSessionHasNoErrors();
});

test('member-only users cannot reach staff pages and are sent to the portal', function () {
    $user = userWithRole(RoleEnum::MEMBER->value);

    $this->actingAs($user)->get(route('members.index'))->assertForbidden();
    $this->actingAs($user)->get(route('pending-registrations.index'))->assertForbidden();
    $this->actingAs($user)->get(route('dashboard'))->assertRedirect(route('member.portal'));
});

test('a member can register from the portal, get approved, and edit their contact details', function () {
    $user = userWithRole(RoleEnum::MEMBER->value);

    $this->actingAs($user)->get(route('member.portal'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('member/portal')->where('member', null));

    $this->actingAs($user)->post(route('member.portal.store'), [
        'first_name' => 'Eric',
        'last_name' => 'Mugisha',
        'phone' => '+250788222333',
        'baptized' => false,
    ])->assertSessionHasNoErrors();

    $member = Member::where('user_id', $user->id)->firstOrFail();
    expect($member->status)->toBe('Pending')->and($member->email)->toBe($user->email);

    // Cannot register twice
    $this->actingAs($user)->post(route('member.portal.store'), ['first_name' => 'A', 'last_name' => 'B'])
        ->assertSessionHasErrors('first_name');

    // Staff approval also approves the login account
    $admin = userWithRole(RoleEnum::ADMIN->value);
    $this->actingAs($admin)->patch(route('members.status', $member), ['status' => 'Approved']);
    expect($user->fresh()->status)->toBe(UserStatus::APPROVED);

    // Member can only change contact fields
    $this->actingAs($user)->patch(route('member.portal.update'), ['city' => 'Musanze', 'status' => 'Active'])
        ->assertSessionHasNoErrors();
    expect($member->fresh())->city->toBe('Musanze')->status->toBe('Approved');
});

test('portal links a staff-created record by email', function () {
    $user = userWithRole(RoleEnum::MEMBER->value);
    $member = Member::create(memberPayload(['email' => $user->email]));

    $this->actingAs($user)->get(route('member.portal'))
        ->assertInertia(fn (Assert $page) => $page->where('member.id', $member->id));

    expect($member->fresh()->user_id)->toBe($user->id);
});
