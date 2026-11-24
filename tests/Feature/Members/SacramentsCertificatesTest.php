<?php

use App\Enums\Role as RoleEnum;
use App\Models\Baptism;
use App\Models\DocumentRequest;
use App\Models\Member;
use App\Models\Notification;
use App\Models\PastoralCare;
use App\Models\User;
use App\Models\Wedding;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

// Needs MySQL/MariaDB: DB_CONNECTION=mysql DB_DATABASE=church_test php artisan test --filter=SacramentsCertificates

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['must_change_credentials' => false]);
    $this->admin->assignRole(RoleEnum::ADMIN->value);
});

function memberWithLogin(): array
{
    $m = Member::create(['first_name' => 'Ruth', 'last_name' => 'Owusu', 'email' => 'ruth@example.test', 'status' => 'Active', 'date_joined' => '2020-02-02']);
    $u = $m->fresh()->user;
    // The member accepted the emailed set-password link, which verifies the email (Phase 2, F01).
    $u->forceFill(['must_change_credentials' => false, 'email_verified_at' => now()])->save();

    return [$m, $u];
}

test('pastoral care, baptism, communion, wedding and funeral records can be managed', function () {
    $a = $this->actingAs($this->admin);
    [$member] = memberWithLogin();

    foreach (['pastoral-care', 'baptisms', 'communions', 'weddings', 'funerals'] as $page) {
        $a->get("/{$page}")->assertOk();
    }

    $a->post('/pastoral-care', ['member_name' => 'Samuel', 'care_type' => 'Grief Support', 'description' => 'Lost his wife', 'status' => 'Open', 'priority' => 'Urgent', 'is_confidential' => true])->assertSessionHasNoErrors();
    $case = PastoralCare::first();
    // Confidential cases are hidden from the Admin role (Phase 2, F04)...
    $a->patch("/pastoral-care/{$case->id}/status", ['status' => 'Completed'])->assertNotFound();
    expect($case->fresh()->status)->toBe('Open');
    // ...but the Pastor can close it.
    $pastor = User::factory()->create(['must_change_credentials' => false]);
    $pastor->assignRole(RoleEnum::PASTOR->value);
    $this->actingAs($pastor)->patch("/pastoral-care/{$case->id}/status", ['status' => 'Completed'])->assertRedirect();
    expect($case->fresh()->status)->toBe('Completed');
    $a = $this->actingAs($this->admin);

    $a->post('/baptisms', ['member_id' => $member->id, 'candidate_name' => 'Ruth Owusu', 'baptism_date' => '2026-06-08', 'baptism_type' => 'immersion', 'certificate_issued' => false, 'candidate_photo' => '/storage/photos/ruth.jpg', 'officiant' => 'Rev. Mensah', 'location' => 'Main chapel', 'witnesses' => 'Esi, Kojo', 'notes' => 'Sunday service'])->assertSessionHasNoErrors();
    expect($member->fresh()->baptized)->toBeTrue();
    $a->post('/baptisms', ['candidate_name' => '', 'baptism_date' => '', 'baptism_type' => 'dunk'])->assertSessionHasErrors(['candidate_name', 'baptism_date', 'baptism_type']);

    $a->post('/communions', ['service_name' => 'Easter Communion', 'service_date' => '2026-04-05', 'attendance_count' => 498])->assertSessionHasNoErrors();
    $a->post('/weddings', ['groom_name' => 'Joseph', 'bride_name' => 'Comfort', 'wedding_date' => '2026-10-10', 'wedding_time' => '10:00', 'status' => 'scheduled'])->assertSessionHasNoErrors();
    $a->post('/funerals', ['deceased_name' => 'Agnes Owusu', 'funeral_date' => '2026-07-07', 'funeral_time' => '09:00'])->assertSessionHasNoErrors();

    $a->get('/weddings')->assertInertia(fn (Assert $p) => $p->component('weddings/index')->where('records.0.wedding_time', '10:00'));

    $w = Wedding::first();
    $a->delete("/weddings/{$w->id}")->assertRedirect();
    expect(Wedding::count())->toBe(0);

    // Members cannot reach staff record pages.
    [, $memberUser] = [null, $member->fresh()->user];
    $this->actingAs($memberUser)->get('/baptisms')->assertForbidden();
});

test('a document request is approved as a PDF the member can download', function () {
    [$member, $user] = memberWithLogin();

    $this->actingAs($user)->post(route('member.portal.document'), ['document_type' => 'Membership Certificate'])->assertSessionHasNoErrors();
    $this->actingAs($user)->post(route('member.portal.document'), ['document_type' => 'Transfer Letter', 'notes' => 'Moving to Kigali'])->assertSessionHasNoErrors();
    [$cert, $letter] = [DocumentRequest::where('document_type', 'Membership Certificate')->first(), DocumentRequest::where('document_type', 'Transfer Letter')->first()];

    // Not downloadable before approval.
    $this->actingAs($user)->get(route('member.portal.document.download', $cert))->assertForbidden();

    $this->actingAs($this->admin)->get('/certificates')->assertInertia(fn (Assert $p) => $p->component('certificates/index')->has('requests', 2)->where('can.approve', true));
    $this->actingAs($this->admin)->get("/certificates/requests/{$cert->id}/pdf")->assertOk()->assertHeader('Content-Type', 'application/pdf');

    $this->actingAs($this->admin)->post("/certificates/requests/{$cert->id}/approve")->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post("/certificates/requests/{$letter->id}/reject", [])->assertSessionHasErrors('staff_note');
    $this->actingAs($this->admin)->post("/certificates/requests/{$letter->id}/reject", ['staff_note' => 'Please visit the office'])->assertSessionHasNoErrors();

    expect($cert->fresh()->status)->toBe('Ready')->and($letter->fresh()->status)->toBe('Rejected')
        ->and(Notification::where('recipient_type', 'member')->where('recipient_id', $member->id)->count())->toBe(2);

    $res = $this->actingAs($user)->get(route('member.portal.document.download', $cert));
    $res->assertOk();
    expect($res->headers->get('content-type'))->toContain('application/pdf');

    $this->actingAs($user)->get('/member-portal')->assertInertia(fn (Assert $p) => $p->has('portal.issued_documents', 1)->where('portal.issued_documents.0.name', 'Membership Certificate'));

    // Another member can't download it.
    $other = Member::create(['first_name' => 'X', 'last_name' => 'Y', 'email' => 'x@example.test', 'status' => 'Active']);
    $otherUser = $other->fresh()->user;
    $otherUser->forceFill(['must_change_credentials' => false, 'email_verified_at' => now()])->save();
    $this->actingAs($otherUser)->get(route('member.portal.document.download', $cert))->assertNotFound();
});

test('baptism and marriage certificates are issued with numbers and downloadable by the member', function () {
    [$member, $user] = memberWithLogin();
    $b = Baptism::create(['member_id' => $member->id, 'candidate_name' => 'Ruth Owusu', 'baptism_date' => '2026-06-08', 'baptism_type' => 'immersion']);
    $w = Wedding::create(['groom_name' => 'Peter', 'bride_name' => 'Ruth', 'bride_member_id' => $member->id, 'wedding_date' => '2026-04-18', 'status' => 'completed']);

    $this->actingAs($user)->get(route('member.portal.baptism-certificate', $b))->assertNotFound();

    $this->actingAs($this->admin)->post("/certificates/baptisms/{$b->id}/issue")->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post("/certificates/weddings/{$w->id}/issue")->assertSessionHasNoErrors();

    expect($b->fresh()->certificate_number)->toBe('BSSC-'.now()->format('Y').'-001')
        ->and($w->fresh()->certificate_issued)->toBeTrue();

    $this->actingAs($user)->get(route('member.portal.baptism-certificate', $b))->assertOk();
    $this->actingAs($user)->get(route('member.portal.marriage-certificate', $w))->assertOk();
    $this->actingAs($user)->get('/member-portal')->assertInertia(fn (Assert $p) => $p->has('portal.issued_documents', 2));
});
