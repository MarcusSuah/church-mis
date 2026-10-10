<?php

/*
 * Phase 3 regression tests: data integrity (F06, F11), bounded queries
 * (F07, F24) and search (F17). Each test names the finding it guards.
 */

use App\Enums\Role as RoleEnum;
use App\Http\Controllers\Finance\GivingController;
use App\Models\Member;
use App\Models\Tithe;
use App\Models\User;
use App\Support\ChurchSettings;
use App\Support\Money;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

function makeTithes(int $n, array $attrs = []): void
{
    for ($i = 1; $i <= $n; $i++) {
        Tithe::create([
            'member_name' => "Giver {$i}", 'amount' => 10, 'currency' => 'USD', 'payment_method' => 'cash',
            'tithe_date' => now()->subDays($i % 20)->toDateString(), 'fund_name' => 'General Fund', ...$attrs,
        ]);
    }
}

/* ---------------------------------------------------------------- F06 */

test('F06: receipt numbers continue from existing numbering, never repeat, and pass 9999', function () {
    $year = now()->year;
    Tithe::create(['member_name' => 'Old', 'amount' => 5, 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund', 'receipt_number' => "REC-{$year}-9999"]);

    $numbers = collect(range(1, 3))->map(fn () => GivingController::nextReceipt());

    expect($numbers->all())->toBe(["REC-{$year}-10000", "REC-{$year}-10001", "REC-{$year}-10002"])
        ->and(DB::table('sequences')->where('name', "receipt:{$year}")->value('value'))->toBe(10002);
});

test('F06: the database rejects a duplicate receipt number', function () {
    makeTithes(1, ['receipt_number' => 'REC-2026-0001']);
    expect(fn () => makeTithes(1, ['receipt_number' => 'REC-2026-0001']))->toThrow(QueryException::class);
});

test('F06: changing the exchange rate does not rewrite past totals', function () {
    ChurchSettings::save(['currency' => 'USD', 'exchange_rate' => 200]);
    Tithe::create(['member_name' => 'A', 'amount' => 2000, 'currency' => 'LRD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);
    expect((float) Tithe::first()->exchange_rate)->toBe(200.0)
        ->and(Money::sum(Tithe::query()))->toBe(10.0);   // 2000 LRD at 200 = 10 USD

    ChurchSettings::save(['currency' => 'USD', 'exchange_rate' => 100]);
    expect(Money::sum(Tithe::query()))->toBe(10.0)     // still the rate of the day it was given
        ->and(Tithe::first()->amountInBase())->toBe(10.0);
});

test('F06: deleting a financial record keeps it in the database', function () {
    $this->actingAs($this->admin)->post('/tithes', ['member_name' => 'Ama', 'amount' => 50, 'payment_method' => 'cash', 'tithe_date' => now()->toDateString()])->assertSessionHasNoErrors();
    $tithe = Tithe::firstOrFail();

    $this->actingAs($this->admin)->delete("/tithes/{$tithe->id}")->assertRedirect();

    expect(Tithe::count())->toBe(0)
        ->and(Tithe::withTrashed()->find($tithe->id)?->trashed())->toBeTrue()
        ->and(Money::sum(Tithe::query()))->toBe(0.0);
});

/* ---------------------------------------------------------------- F11 */

test('F11: Member IDs and registration references come from a locked counter', function () {
    Member::create(['first_name' => 'A', 'last_name' => 'One', 'status' => 'Active', 'member_id' => 'SSBC-M-0041']);
    $b = Member::create(['first_name' => 'B', 'last_name' => 'Two', 'status' => 'Active']);
    $c = Member::create(['first_name' => 'C', 'last_name' => 'Three', 'status' => 'Active']);

    expect($b->member_id)->toBe('SSBC-M-0042')->and($c->member_id)->toBe('SSBC-M-0043');

    $refs = [Member::nextRegRef(), Member::nextRegRef()];
    expect($refs[0])->not->toBe($refs[1]);
});

/* ---------------------------------------------------------------- F07 */

test('F07: record pages send one page of rows, with totals computed for all of them', function () {
    makeTithes(45);
    makeTithes(5, ['payment_method' => 'momo']);

    $this->actingAs($this->admin)->get('/tithes')->assertInertia(fn (Assert $p) => $p
        ->has('records', 20)
        ->where('pagination.total', 50)
        ->where('pagination.last_page', 3)
        ->where('stats.total', 50)
        ->where('stats.filtered_total', fn ($v) => (float) $v === 500.0)
        ->missing('members'));

    $this->actingAs($this->admin)->get('/tithes?method=momo')->assertInertia(fn (Assert $p) => $p
        ->has('records', 5)
        ->where('filters.method', 'momo')
        ->where('stats.filtered_total', fn ($v) => (float) $v === 50.0)
        ->where('stats.total', 50));

    $this->actingAs($this->admin)->get('/tithes?search=Giver%2045')->assertInertia(fn (Assert $p) => $p->has('records', 1));
    // An unknown filter value is ignored rather than trusted.
    $this->actingAs($this->admin)->get('/tithes?method=bogus')->assertInertia(fn (Assert $p) => $p->where('filters.method', 'All')->where('pagination.total', 50));
});

test('F07: the number of queries for a record page does not grow with the number of rows', function () {
    makeTithes(5);
    $this->actingAs($this->admin)->get('/tithes')->assertOk(); // warm caches (settings, permissions)
    DB::enableQueryLog();
    $this->actingAs($this->admin)->get('/tithes')->assertOk();
    $few = count(DB::getQueryLog());

    makeTithes(80);
    // New gifts clear the cached whole-table totals; warm them again so both counts compare the same cache state.
    $this->actingAs($this->admin)->get('/tithes')->assertOk();
    DB::flushQueryLog();
    $this->actingAs($this->admin)->get('/tithes')->assertOk();
    $many = count(DB::getQueryLog());

    expect($many)->toBe($few);
});

test('F07: ?edit= opens a record that is not on the current page', function () {
    makeTithes(30);
    $old = Tithe::orderBy('tithe_date')->first();

    $this->actingAs($this->admin)->get("/tithes?edit={$old->id}")
        ->assertInertia(fn (Assert $p) => $p->where('focus.id', $old->id));
});

test('F07: member pickers search the server and return at most 20 people, staff only', function () {
    foreach (range(1, 30) as $i) {
        Member::create(['first_name' => 'Kofi', 'last_name' => "Mensah{$i}", 'status' => 'Active']);
    }
    Member::create(['first_name' => 'Abena', 'last_name' => 'Owusu', 'status' => 'Active']);

    $this->actingAs($this->admin)->getJson('/lookup/members?q=Kofi')->assertOk()->assertJsonCount(20, 'data');
    $this->actingAs($this->admin)->getJson('/lookup/members?q=Abena')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Abena Owusu')
        ->assertJsonMissingPath('data.0.email');

    $member = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::MEMBER->value));
    $this->actingAs($member)->getJson('/lookup/members?q=Kofi')->assertForbidden();
});

test('F07: the member directory is paginated', function () {
    foreach (range(1, 60) as $i) {
        Member::create(['first_name' => "Person{$i}", 'last_name' => 'Test', 'status' => 'Active']);
    }

    $this->actingAs($this->admin)->get('/member-directory')->assertInertia(fn (Assert $p) => $p
        ->has('members', 48)
        ->where('pagination.total', 60));
});

test('F07: search terms with LIKE wildcards are matched literally', function () {
    makeTithes(3);
    Tithe::create(['member_name' => '100% Giver', 'amount' => 1, 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);

    $this->actingAs($this->admin)->get('/tithes?search='.urlencode('%'))->assertInertia(fn (Assert $p) => $p->has('records', 1));
});

/* ---------------------------------------------------------------- F26 */

test('F26: a member giving statement totals mixed currencies in the base currency', function () {
    ChurchSettings::save(['currency' => 'USD', 'exchange_rate' => 200]);
    $member = Member::create(['first_name' => 'Ruth', 'last_name' => 'Owusu', 'email' => 'ruth@example.test', 'status' => 'Active']);
    $user = $member->fresh()->user;
    $user->forceFill(['email_verified_at' => now()])->save();

    Tithe::create(['member_id' => $member->id, 'member_name' => 'Ruth', 'amount' => 10, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);
    Tithe::create(['member_id' => $member->id, 'member_name' => 'Ruth', 'amount' => 2000, 'currency' => 'LRD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);

    $csv = $this->actingAs($user)->get(route('member.portal.giving-statement'))->streamedContent();
    expect($csv)->toContain('Total,,,,,,20.00');   // 10 USD + 2000 LRD at 200 = 20 USD, not 2010
});

/* ---------------------------------------------------------------- F24 */

test('F24: the roles list counts users without one query per role', function () {
    $super = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::SUPERADMIN->value));
    DB::enableQueryLog();
    $this->actingAs($super)->get('/admin/roles')->assertOk();
    $countQueries = collect(DB::getQueryLog())->filter(fn ($q) => str_contains($q['query'], 'count(*)') && str_contains($q['query'], 'model_has_roles'))->count();

    expect($countQueries)->toBeLessThanOrEqual(1);
});
