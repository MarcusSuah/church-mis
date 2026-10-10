<?php

use App\Enums\Role as RoleEnum;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Member;
use App\Models\Notification;
use App\Models\Tithe;
use App\Models\User;
use App\Support\Notifier;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->superadmin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::SUPERADMIN->value));
});

test('the Superadmin sees alerts sent to a permission it holds only through the global override', function () {
    Notifier::permission('expenses.update', 'Expense awaiting approval', 'Fuel for the bus', 'warning', '/expenses');

    expect(Notification::visibleTo($this->superadmin)->where('title', 'Expense awaiting approval')->exists())->toBeTrue();
});

test('church structure changes and role changes are written to the audit log', function () {
    $this->actingAs($this->superadmin);

    Department::create(['name' => 'Youth Department']);
    $staff = User::factory()->create();
    $staff->assignRole(RoleEnum::PASTOR->value);

    expect(AuditLog::where('module', 'Church Structure')->where('description', 'like', '%Youth Department%')->exists())->toBeTrue()
        ->and(AuditLog::where('module', 'Security')->where('description', 'like', 'Role Pastor given to%')->exists())->toBeTrue();
});

test('the pending registrations queue lists every member awaiting review, matching the sidebar badge', function () {
    Member::create(['first_name' => 'Staff', 'last_name' => 'Added', 'status' => 'Pending']);
    Member::create(['first_name' => 'Long', 'last_name' => 'Standing', 'status' => 'Active']);

    $this->actingAs($this->superadmin)->get(route('pending-registrations.index'))->assertInertia(fn (Assert $p) => $p
        ->has('registrations', 1)
        ->where('registrations.0.first_name', 'Staff')
        ->where('counts.Pending', 1)
        ->where('pendingMembersCount', 1));
});

test('the finance report ranks top givers in SQL and stays small', function () {
    foreach ([['Abena', 50], ['Kofi', 20], ['Abena', 30]] as [$name, $amount]) {
        Tithe::create(['member_name' => $name, 'amount' => $amount, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);
    }

    $this->actingAs($this->superadmin)->get('/reports?type=finance&range=this_year')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('report.sections', fn ($sections) => collect($sections)->first(fn ($s) => str_starts_with($s['title'], 'Top givers'))['rows'][0][0] === 'Abena'));
});

test('reports render as PDF on the church letterhead and export as CSV and Excel', function () {
    $this->actingAs($this->superadmin)->get('/reports/pdf?type=membership&range=this_month')
        ->assertOk()->assertHeader('content-type', 'application/pdf');
    $this->actingAs($this->superadmin)->get('/reports/export?type=membership&range=this_month&format=csv')->assertOk();
    $this->actingAs($this->superadmin)->get('/reports/export?type=membership&range=this_month&format=excel')->assertOk();
});
