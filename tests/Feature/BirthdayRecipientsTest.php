<?php

/*
 * Birthdays page recipient picker: lists active members from the database,
 * filters by search and department, "select all", and send validation.
 */

use App\Enums\Role as RoleEnum;
use App\Http\Controllers\Church\BirthdayController;
use App\Models\Member;
use App\Models\MemberMessage;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

test('the picker lists only active members, with the departments they belong to', function () {
    Member::create(['first_name' => 'Ama', 'last_name' => 'Active', 'status' => 'Active', 'department' => 'Choir']);
    Member::create(['first_name' => 'Kofi', 'last_name' => 'Active', 'status' => 'Active', 'department' => 'Youth']);
    Member::create(['first_name' => 'Pat', 'last_name' => 'Pending', 'status' => 'Pending', 'department' => 'Ushers']);
    Member::create(['first_name' => 'Ina', 'last_name' => 'Inactive', 'status' => 'Inactive']);

    $this->actingAs($this->admin)->get('/birthdays')->assertInertia(fn (Assert $p) => $p
        ->where('departments', ['Choir', 'Youth'])
        ->where('maxRecipients', BirthdayController::MAX_RECIPIENTS)
        ->missing('members')
        ->loadDeferredProps('recipients', fn (Assert $reload) => $reload
            ->where('memberTotal', 2)
            ->where('members', fn ($rows) => collect($rows)->pluck('name')->all() === ['Ama Active', 'Kofi Active'])));
});

test('the picker narrows by search and department', function () {
    Member::create(['first_name' => 'Ama', 'last_name' => 'Owusu', 'status' => 'Active', 'department' => 'Choir']);
    Member::create(['first_name' => 'Kofi', 'last_name' => 'Owusu', 'status' => 'Active', 'department' => 'Youth']);
    Member::create(['first_name' => 'Yaw', 'last_name' => 'Boateng', 'status' => 'Active', 'department' => 'Choir']);

    $this->actingAs($this->admin)->get('/birthdays?member_department=Choir')->assertInertia(fn (Assert $p) => $p
        ->reloadOnly(['members', 'memberTotal'], fn (Assert $reload) => $reload
            ->where('memberTotal', 2)
            ->where('members', fn ($rows) => collect($rows)->pluck('name')->sort()->values()->all() === ['Ama Owusu', 'Yaw Boateng'])));

    $this->actingAs($this->admin)->get('/birthdays?member_q=owusu&member_department=Youth')->assertInertia(fn (Assert $p) => $p
        ->reloadOnly(['members', 'memberTotal'], fn (Assert $reload) => $reload
            ->where('memberTotal', 1)
            ->where('members.0.name', 'Kofi Owusu')));
});

test('select all returns every matching active member, up to the send limit', function () {
    foreach (range(1, BirthdayController::MAX_RECIPIENTS + 3) as $i) {
        Member::create(['first_name' => 'Member', 'last_name' => sprintf('N%03d', $i), 'status' => 'Active']);
    }

    $this->actingAs($this->admin)->get('/birthdays')->assertInertia(fn (Assert $p) => $p
        ->missing('allMembers')
        ->reloadOnly('allMembers', fn (Assert $reload) => $reload
            ->has('allMembers', BirthdayController::MAX_RECIPIENTS)));
});

test('messages go to the chosen members; rejected members are refused', function () {
    Mail::fake();
    $active = Member::create(['first_name' => 'Ama', 'last_name' => 'Owusu', 'status' => 'Active', 'email' => 'ama@example.test']);
    $rejected = Member::create(['first_name' => 'Rex', 'last_name' => 'Rejected', 'status' => 'Rejected']);
    $message = ['occasion' => 'Birthday', 'subject' => 'Happy birthday', 'message' => 'Blessings, {first_name}!', 'channels' => ['in_app']];

    $this->actingAs($this->admin)->post('/birthdays/send', ['member_ids' => [$rejected->id], ...$message])
        ->assertSessionHasErrors('member_ids.0');

    $this->actingAs($this->admin)->post('/birthdays/send', ['member_ids' => [$active->id], ...$message])
        ->assertSessionHasNoErrors();

    expect(MemberMessage::where('member_id', $active->id)->value('message'))->toBe('Blessings, Ama!')
        ->and(MemberMessage::where('member_id', $rejected->id)->exists())->toBeFalse();
});
