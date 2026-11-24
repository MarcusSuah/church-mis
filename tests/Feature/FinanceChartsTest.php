<?php

/*
 * Finance dashboard charts, the offerings page on a cached load, and the
 * member picker lookup used by the giving and sacrament forms.
 */

use App\Enums\Role as RoleEnum;
use App\Models\Budget;
use App\Models\Donation;
use App\Models\Expense;
use App\Models\Member;
use App\Models\Offering;
use App\Models\Tithe;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

function gift(string $model, string $dateColumn, array $attrs = []): void
{
    $model::create([
        'amount' => 100, 'currency' => 'USD', 'payment_method' => 'cash',
        $dateColumn => now()->toDateString(), 'fund_name' => 'General Fund', ...$attrs,
    ]);
}

function spend(string $status, string $category, float $amount, ?string $date = null): void
{
    Expense::create([
        'title' => "{$category} bill", 'category' => $category, 'amount' => $amount, 'currency' => 'USD',
        'payment_method' => 'cash', 'status' => $status, 'expense_date' => $date ?? now()->toDateString(), 'fund_name' => 'General Fund',
    ]);
}

test('the offerings page still renders chart services as a list when the stats come from the cache', function () {
    // Same behaviour as the file cache in production: values are serialized and objects are not rebuilt.
    config(['cache.stores.array.serialize' => true]);
    Cache::forgetDriver('array');
    gift(Offering::class, 'offering_date', ['is_collection' => true, 'member_name' => 'Service collection', 'offering_type' => 'Regular Offering', 'service_type' => 'Sunday Worship']);

    foreach (['first load', 'cached load'] as $_) {
        $this->actingAs($this->admin)->get('/offerings')->assertInertia(fn (Assert $p) => $p
            ->where('stats.chart.0.services', ['Sunday Worship']));
    }
});

test('the member lookup lists members before anything is typed and resolves a linked member by id', function () {
    foreach (['Zoe', 'Abel', 'Mary'] as $first) {
        Member::create(['first_name' => $first, 'last_name' => 'Doe', 'status' => 'Active']);
    }
    foreach (range(1, 25) as $i) {
        Member::create(['first_name' => 'Kofi', 'last_name' => "Zz{$i}", 'status' => 'Active']);
    }
    $linked = Member::where('first_name', 'Mary')->first();

    $this->actingAs($this->admin)->getJson('/lookup/members')->assertOk()
        ->assertJsonCount(20, 'data')
        ->assertJsonPath('data.0.name', 'Abel Doe');
    $this->actingAs($this->admin)->getJson("/lookup/members?id={$linked->id}")->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Mary Doe')
        ->assertJsonPath('data.0.member_code', $linked->member_id);
});

test('the tithes page charts the last 12 months and the payment methods used', function () {
    gift(Tithe::class, 'tithe_date', ['member_name' => 'A', 'amount' => 40]);
    gift(Tithe::class, 'tithe_date', ['member_name' => 'B', 'amount' => 60, 'payment_method' => 'momo']);
    gift(Tithe::class, 'tithe_date', ['member_name' => 'Old', 'amount' => 999, 'tithe_date' => now()->subMonths(13)->toDateString()]);

    $this->actingAs($this->admin)->get('/tithes')->assertInertia(fn (Assert $p) => $p
        ->has('stats.charts.monthly', 12)
        ->where('stats.charts.monthly.11.period', now()->format('Y-m'))
        ->where('stats.charts.monthly.11.total', 100)
        ->where('stats.charts.monthly.11.count', 2)
        ->where('stats.charts.monthly.0.total', 0)
        ->where('stats.charts.by_method', [['label' => 'Mobile Money', 'value' => 60], ['label' => 'Cash', 'value' => 40]]));
});

test('the donations page splits one-time and recurring gifts and groups them by fund', function () {
    gift(Donation::class, 'donation_date', ['donor_name' => 'A', 'amount' => 30, 'fund_name' => 'Building Fund']);
    gift(Donation::class, 'donation_date', ['donor_name' => 'B', 'amount' => 70, 'is_recurring' => true]);

    $this->actingAs($this->admin)->get('/donations')->assertInertia(fn (Assert $p) => $p
        ->where('stats.charts.monthly.11.one_time', 30)
        ->where('stats.charts.monthly.11.recurring', 70)
        ->where('stats.charts.by_fund', [['label' => 'General Fund', 'value' => 70], ['label' => 'Building Fund', 'value' => 30]]));
});

test('the expenses page charts spending by status and only approved or paid spending by category', function () {
    spend('Paid', 'utilities', 50);
    spend('Approved', 'maintenance', 20);
    spend('Pending', 'utilities', 5);
    spend('Rejected', 'outreach', 1000);

    $this->actingAs($this->admin)->get('/expenses')->assertInertia(fn (Assert $p) => $p
        ->where('stats.charts.monthly.11.paid', 50)
        ->where('stats.charts.monthly.11.approved', 20)
        ->where('stats.charts.monthly.11.pending', 5)
        ->where('stats.charts.by_category', [['label' => 'Utilities', 'value' => 50], ['label' => 'Maintenance', 'value' => 20]]));
});

test('the finance report sends income, expenditure and budget charts', function () {
    gift(Tithe::class, 'tithe_date', ['member_name' => 'A', 'amount' => 100]);
    gift(Donation::class, 'donation_date', ['donor_name' => 'B', 'amount' => 50]);
    spend('Paid', 'utilities', 30);
    spend('Pending', 'utilities', 999);
    Budget::create(['category' => 'utilities', 'period' => 'monthly', 'fiscal_year' => now()->year, 'allocated_amount' => 10, 'currency' => 'USD', 'is_active' => true]);

    $this->actingAs($this->admin)->get('/reports?type=finance&range=this_month')->assertInertia(fn (Assert $p) => $p
        ->where('charts.income_by_category', [['label' => 'Tithes', 'value' => 100], ['label' => 'Offerings', 'value' => 0], ['label' => 'Donations', 'value' => 50]])
        ->where('charts.expense_by_category', [['label' => 'Utilities', 'value' => 30]])
        ->where('charts.monthly_financials', [['label' => now()->format('M Y'), 'income' => 150, 'expense' => 30]])
        ->where('charts.budget_vs_actual', [['label' => 'Utilities', 'budget' => 120, 'actual' => 30]]));
});

test('the membership report charts gender and age groups', function () {
    Member::create(['first_name' => 'Ama', 'last_name' => 'Doe', 'gender' => 'female', 'date_of_birth' => now()->subYears(20)->toDateString(), 'status' => 'Active']);
    Member::create(['first_name' => 'Kojo', 'last_name' => 'Doe', 'gender' => 'male', 'date_of_birth' => now()->subYears(70)->toDateString(), 'status' => 'Active']);

    $this->actingAs($this->admin)->get('/reports?type=membership')->assertInertia(fn (Assert $p) => $p
        ->where('charts.gender', [['label' => 'Female', 'value' => 1], ['label' => 'Male', 'value' => 1]])
        ->where('charts.age_groups.2', ['label' => '18-29', 'value' => 1])
        ->where('charts.age_groups.5', ['label' => '60+', 'value' => 1])
        ->where('charts.membership_growth.0.members', 2));
});
