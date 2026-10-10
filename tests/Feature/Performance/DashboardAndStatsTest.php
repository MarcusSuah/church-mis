<?php

use App\Enums\Role as RoleEnum;
use App\Models\Member;
use App\Models\Tithe;
use App\Models\User;
use App\Support\Birthdays;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::SUPERADMIN->value));
});

function tithe(float $amount, string $date): Tithe
{
    return Tithe::create([
        'member_name' => 'Giver', 'amount' => $amount, 'currency' => 'USD', 'payment_method' => 'cash',
        'tithe_date' => $date, 'fund_name' => 'General Fund',
    ]);
}

test('the dashboard totals giving per month and counts membership growth in SQL', function () {
    Carbon::setTestNow('2026-10-15 12:00:00');
    tithe(100, '2026-10-02');
    tithe(40, '2026-09-20');
    tithe(999, '2025-01-01'); // outside the 12-month window
    Member::create(['first_name' => 'Old', 'last_name' => 'Member', 'status' => 'Active', 'date_joined' => '2024-05-01']);
    Member::create(['first_name' => 'New', 'last_name' => 'Member', 'status' => 'Active', 'date_joined' => '2026-10-03']);
    Member::create(['first_name' => 'Waiting', 'last_name' => 'Member', 'status' => 'Pending', 'date_joined' => '2026-10-03']);

    $this->actingAs($this->admin)->get('/dashboard')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('kpis.giving', fn ($v) => (float) $v === 100.0)
        ->where('kpis.giving_change', fn ($v) => (float) $v === 150.0)
        ->where('givingTrend.10.actual', fn ($v) => (float) $v === 40.0)
        ->where('givingTrend.11.actual', fn ($v) => (float) $v === 100.0)
        ->where('membershipGrowth.11.active', 2)
        ->where('membershipGrowth.11.new', 1)
        ->where('membershipGrowth.10.active', 1));
});

test('upcoming birthdays come from the database window, including 29 February in non-leap years', function () {
    Carbon::setTestNow('2027-02-28 09:00:00'); // 2027 is not a leap year
    Member::create(['first_name' => 'Leap', 'last_name' => 'Day', 'status' => 'Active', 'date_of_birth' => '2000-02-29']);
    Member::create(['first_name' => 'Next', 'last_name' => 'Week', 'status' => 'Active', 'date_of_birth' => '1990-03-05']);
    Member::create(['first_name' => 'Far', 'last_name' => 'Away', 'status' => 'Active', 'date_of_birth' => '1990-06-01']);
    Member::create(['first_name' => 'Gone', 'last_name' => 'Away', 'status' => 'Inactive', 'date_of_birth' => '1990-02-28']);

    expect(Birthdays::upcoming(0)->pluck('name')->all())->toBe(['Leap Day'])
        ->and(Birthdays::upcoming(10)->pluck('name')->all())->toBe(['Leap Day', 'Next Week']);
});

test('the birthdays page loads without sending every member, and searches on demand', function () {
    Member::create(['first_name' => 'Abena', 'last_name' => 'Mensah', 'status' => 'Active']);

    $this->actingAs($this->admin)->get('/birthdays?member_q=Abena')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('birthdays/index')
        ->has('occasions.Birthday.messages')
        ->missing('members')
        ->reloadOnly('members', fn (Assert $reload) => $reload
            ->has('members', 1)
            ->where('members.0.name', 'Abena Mensah')));
});

test('cached list totals refresh when a gift is added', function () {
    tithe(10, now()->toDateString());

    $this->actingAs($this->admin)->get('/tithes')->assertInertia(fn (Assert $p) => $p->where('stats.total', 1));

    tithe(15, now()->toDateString());

    $this->actingAs($this->admin)->get('/tithes')->assertInertia(fn (Assert $p) => $p
        ->where('stats.total', 2)
        ->where('pagination.total', 2)
        ->where('stats.filtered_total', fn ($v) => (float) $v === 25.0));
});
