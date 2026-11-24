<?php

use App\Enums\Role as RoleEnum;
use App\Models\AuditLog;
use App\Models\Baptism;
use App\Models\Budget;
use App\Models\DocumentRequest;
use App\Models\FinanceFund;
use App\Models\Member;
use App\Models\Notification;
use App\Models\Offering;
use App\Models\User;
use App\Services\CertificateService;
use App\Support\CertificateMessages;
use App\Support\SessionLimiter;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Grace Admin', 'must_change_credentials' => false]);
    $this->admin->assignRole(RoleEnum::ADMIN->value);
});

function pdfPages(string $content): int
{
    return preg_match_all('/\/Type\s*\/Page[^s]/', $content);
}

test('every certificate template is a single page, with custom or random messages', function () {
    $svc = app(CertificateService::class);
    foreach (array_keys(CertificateMessages::TEMPLATES) as $t) {
        foreach (['membership', 'baptism', 'marriage'] as $type) {
            $out = $svc->render($type, 'Maximilian Alexander Johnson-Kpadeh Wesseh', '2026-09-10', 'X-1', 'M-1', ['Officiant' => 'Rev. A'], $t, null)->output();
            expect(pdfPages($out))->toBe(1);
        }
    }

    $baptism = Baptism::create(['candidate_name' => 'Alexander Mitchell', 'baptism_date' => '2026-09-10']);
    $this->actingAs($this->admin)->post("/certificates/baptisms/{$baptism->id}/issue", ['template' => 'royal', 'message' => 'was baptized on {date} at {church_name}.'])->assertSessionHasNoErrors();
    expect($baptism->fresh()->certificate_template)->toBe('royal')
        ->and($baptism->fresh()->certificate_message)->toBe('was baptized on {date} at {church_name}.');

    // No message chosen → one stock message is picked and kept.
    $b2 = Baptism::create(['candidate_name' => 'Ruth Kollie', 'baptism_date' => '2026-09-11']);
    $this->actingAs($this->admin)->post("/certificates/baptisms/{$b2->id}/issue", ['template' => 'heritage']);
    expect(CertificateMessages::TYPES['baptism']['messages'])->toContain($b2->fresh()->certificate_message);
});

test('only approved members can download their documents', function () {
    $user = User::factory()->create(['must_change_credentials' => false]);
    $user->assignRole(RoleEnum::MEMBER->value);
    $member = Member::create(['first_name' => 'Ama', 'last_name' => 'Kollie', 'status' => 'Pending', 'user_id' => $user->id, 'email' => $user->email]);
    $req = DocumentRequest::create(['member_id' => $member->id, 'document_type' => 'Membership Certificate', 'status' => 'Pending']);

    $this->actingAs($user)->get("/member-portal/documents/{$req->id}/download")->assertForbidden();

    $member->update(['status' => 'Active']);
    $this->actingAs($this->admin)->post("/certificates/requests/{$req->id}/approve", ['template' => 'classic'])->assertSessionHasNoErrors();
    $res = $this->actingAs($user)->get("/member-portal/documents/{$req->id}/download");
    $res->assertOk();
    expect($res->headers->get('Content-Type'))->toContain('pdf');
});

test('basket collections, budgets, funds and notifications', function () {
    $a = $this->actingAs($this->admin);
    $a->post('/offerings', ['is_collection' => true, 'amount' => 25000, 'currency' => 'LRD', 'payment_method' => 'cash', 'offering_type' => 'Regular Offering', 'service_type' => 'Sunday Worship', 'service_session' => 'first_service', 'offering_date' => now()->toDateString(), 'counted_by' => 'Cashier One'])->assertSessionHasNoErrors();
    $o = Offering::first();
    expect($o->is_collection)->toBeTrue()->and($o->member_id)->toBeNull()->and($o->member_name)->toContain('Service collection');
    $a->post('/offerings', ['is_collection' => true, 'amount' => 10, 'payment_method' => 'cash', 'offering_type' => 'Regular Offering', 'service_type' => 'Sunday Worship', 'offering_date' => now()->toDateString()])
        ->assertSessionHasErrors('counted_by');

    // Monthly budget of 100 counts as 1,200 for the year; one line per category per year.
    $a->post('/budgets', ['category' => 'utilities', 'period' => 'monthly', 'fiscal_year' => now()->year, 'allocated_amount' => 100, 'currency' => 'USD'])->assertSessionHasNoErrors();
    $a->post('/budgets', ['category' => 'utilities', 'period' => 'annual', 'fiscal_year' => now()->year, 'allocated_amount' => 500])->assertSessionHasErrors('category');
    $a->get('/budgets')->assertInertia(fn (Assert $p) => $p->where('records.0.allocated_base', fn ($v) => $v == 1200));

    // Fund target can be set on the built-in General Fund and edited later.
    $a->post('/funds', ['name' => 'General Fund', 'target_amount' => 5000])->assertSessionHasNoErrors();
    $fund = FinanceFund::where('name', 'General Fund')->first();
    $a->patch("/funds/{$fund->id}", ['name' => 'General Fund', 'target_amount' => 8000, 'currency' => 'USD'])->assertSessionHasNoErrors();
    expect((float) $fund->fresh()->target_amount)->toBe(8000.0);

    // Expense needing approval notifies staff; an event notifies everyone.
    $a->post('/expenses', ['title' => 'Generator fuel', 'category' => 'utilities', 'amount' => 40, 'payment_method' => 'cash', 'expense_date' => now()->toDateString(), 'status' => 'Pending']);
    $a->post('/events', ['title' => 'Youth Revival', 'event_type' => 'Youth Event', 'start_date' => now()->addDays(3)->format('Y-m-d\TH:i'), 'status' => 'Upcoming', 'is_public' => true]);
    // Finance alerts go only to people who can act on them (Phase 2, F04).
    expect(Notification::where('title', 'like', '%Expense awaiting approval%')->where('recipient_type', 'permission')->where('recipient_id', 'expenses.update')->exists())->toBeTrue()
        ->and(Notification::where('title', 'like', '%Youth Revival%')->where('recipient_type', 'all')->exists())->toBeTrue();

    // Audit trail shows the person's name.
    expect(AuditLog::where('table_name', 'offerings')->value('performed_by_name'))->toBe('Grace Admin');
});

test('session limit, login throttling and the not-found page', function () {
    config(['church.max_sessions' => 2]);
    $user = User::factory()->create(['email' => 'sam@example.test', 'must_change_credentials' => false]);
    foreach (range(1, 3) as $i) {
        DB::table('sessions')->insert(['id' => "old-{$i}", 'user_id' => $user->id, 'ip_address' => '1.1.1.1', 'user_agent' => 'x', 'payload' => '', 'last_activity' => now()->subMinutes($i)->timestamp]);
    }
    // Tests use the array session driver, so call the limiter the way the Login listener does.
    config(['session.driver' => 'database']);
    expect(SessionLimiter::enforce($user, request()))->toBe(2);
    expect(DB::table('sessions')->where('user_id', $user->id)->pluck('id')->all())->toBe(['old-1']);
    config(['session.driver' => 'array']);

    Cache::flush();
    auth()->logout();
    foreach (range(1, 5) as $i) {
        $this->post('/login', ['email' => 'sam@example.test', 'password' => 'nope']);
    }
    $this->post('/login', ['email' => 'sam@example.test', 'password' => 'nope'])->assertSessionHasErrors('email');
    expect(session('errors')->first('email'))->toContain('Too many sign-in attempts');

    $this->actingAs($this->admin)->get('/this-page-does-not-exist')->assertNotFound()
        ->assertInertia(fn (Assert $p) => $p->component('error')->where('status', 404));
});
