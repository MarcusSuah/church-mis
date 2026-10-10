<?php

use App\Enums\Role as RoleEnum;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Member;
use App\Models\Notification as AppNotification;
use App\Notifications\MemberAccountInvitation;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use App\Models\PrayerRequest;
use App\Models\Tithe;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * These tests need MySQL/MariaDB (the project's migrations use MySQL-only SQL):
 *   DB_CONNECTION=mysql DB_DATABASE=church_test php artisan test --filter=MemberPortalAccount
 */

beforeEach(fn () => $this->seed(RolePermissionSeeder::class));

function portalMember(array $attrs = []): Member
{
    return Member::create([
        'first_name' => 'Kwame', 'last_name' => 'Boateng', 'email' => 'kwame@example.test',
        'status' => 'Active', 'date_joined' => '2019-01-15', 'baptized' => true, ...$attrs,
    ]);
}

test('an approved member gets a login with a random password and an emailed set-password link', function () {
    Notification::fake();

    $member = portalMember();
    $user = $member->fresh()->user;

    expect($user)->not->toBeNull()
        ->and($user->hasRole(RoleEnum::MEMBER->value))->toBeTrue()
        ->and($user->must_change_credentials)->toBeFalse()
        // F01: no shared default password — the old one no longer works.
        ->and(Hash::check('SSBCm@2026#', $user->password))->toBeFalse()
        ->and($user->hasVerifiedEmail())->toBeFalse();

    Notification::assertSentTo($user, MemberAccountInvitation::class, function (MemberAccountInvitation $n) use ($user) {
        // The emailed token is a real password-reset token for this user.
        return Password::broker()->tokenExists($user, $n->token);
    });

    // Following the link sets the password and verifies the email.
    $token = Password::broker()->createToken($user);
    $this->post(route('password.update'), [
        'token' => $token, 'email' => $user->email, 'password' => 'Better@Pass12', 'password_confirmation' => 'Better@Pass12',
    ])->assertSessionHasNoErrors();

    $user->refresh();
    expect(Hash::check('Better@Pass12', $user->password))->toBeTrue()
        ->and($user->hasVerifiedEmail())->toBeTrue();
    $this->actingAs($user)->get('/member-portal')->assertOk();
});

test('the change-password page never sends a default password to the browser', function () {
    $user = User::factory()->create(['must_change_credentials' => true]);
    $user->assignRole(RoleEnum::MEMBER->value);

    $this->actingAs($user)->get('/member-portal')->assertRedirect(route('password.change'));
    $this->actingAs($user)->get(route('password.change'))
        ->assertInertia(fn (Assert $p) => $p->component('auth/change-password')->where('forced', true)
            ->missing('defaultPassword')->missing('usingDefault'));
});

test('a pending self-registration gets no login until staff approve it', function () {
    Notification::fake();

    $member = portalMember(['status' => 'Pending', 'reg_ref' => Member::nextRegRef()]);
    expect($member->fresh()->user_id)->toBeNull()
        ->and(User::where('email', 'kwame@example.test')->exists())->toBeFalse();

    $member->update(['status' => 'Active']);
    expect($member->fresh()->user)->not->toBeNull();
    Notification::assertSentTo($member->fresh()->user, MemberAccountInvitation::class);
});

test('an existing member-only account with the same email is linked instead of duplicated', function () {
    $existing = User::factory()->create(['email' => 'kwame@example.test']);
    $existing->assignRole(RoleEnum::MEMBER->value);
    $member = portalMember();

    expect($member->fresh()->user_id)->toBe($existing->id)->and(User::where('email', 'kwame@example.test')->count())->toBe(1);
});

test('a member record is never linked to a staff account (F05)', function () {
    $pastor = User::factory()->create(['email' => 'kwame@example.test', 'status' => 'approved']);
    $pastor->assignRole(RoleEnum::PASTOR->value);

    $member = portalMember();
    expect($member->fresh()->user_id)->toBeNull();

    // Rejecting that member must not touch the pastor's account.
    $admin = User::factory()->create();
    $admin->assignRole(RoleEnum::ADMIN->value);
    $member->forceFill(['user_id' => $pastor->id])->saveQuietly(); // even if someone linked it by hand
    $this->actingAs($admin)->patch(route('members.status', $member), ['status' => 'Rejected'])->assertSessionHasNoErrors();
    expect($pastor->fresh()->status->value)->toBe('approved');
});

test('the portal shows the member\'s own attendance, giving, prayers and certificates', function () {
    $member = portalMember();
    $user = $member->fresh()->user;
    $user->forceFill(['must_change_credentials' => false, 'email_verified_at' => now()])->save();

    $s = AttendanceSession::create(['service_type' => 'sunday_worship', 'service_date' => '2026-08-10', 'title' => 'Sunday Worship']);
    AttendanceRecord::create(['session_id' => $s->id, 'member_id' => $member->id, 'attendance_status' => 'present', 'present' => true]);
    Tithe::create(['member_id' => $member->id, 'member_name' => 'Kwame', 'amount' => 450, 'payment_method' => 'check', 'tithe_date' => now()->toDateString()]);

    $this->actingAs($user)->post(route('member.portal.prayer'), ['category' => 'Financial', 'request' => 'Please pray for a new job.'])->assertSessionHasNoErrors();
    $this->actingAs($user)->post(route('member.portal.document'), ['document_type' => 'Membership Certificate'])->assertSessionHasNoErrors();
    $this->actingAs($user)->post(route('member.portal.document'), ['document_type' => 'Membership Certificate'])->assertSessionHasErrors('document_type');

    $this->actingAs($user)->get('/member-portal')->assertInertia(fn (Assert $p) => $p
        ->component('member/portal')
        ->where('portal.stats.attendance_present', 1)
        ->where('portal.stats.giving_ytd', 450)
        ->where('portal.giving.0.method', 'Check')
        ->has('portal.prayer_requests', 1)
        ->has('portal.document_requests', 1)
        );

    $this->actingAs($user)->get(route('member.portal.giving-statement'))->assertOk();
    
    $this->actingAs($user)->get('/member-management')->assertForbidden();

    // Only staff who can act on them were notified (F04); a private request's text is not in the alert.
    expect(AppNotification::where('recipient_type', 'permission')->where('recipient_id', 'prayer-requests.view')->where('title', 'New prayer request')->value('message'))
        ->toBe('Kwame Boateng submitted a private prayer request.')
        ->and(AppNotification::where('recipient_type', 'permission')->where('recipient_id', 'certificates.view')->where('title', 'Document request')->exists())->toBeTrue();
});

test('notifications reach the right people and read state is per user', function () {
    $admin = User::factory()->create();
    $admin->assignRole(RoleEnum::ADMIN->value);
    $member = portalMember(['status' => 'Pending', 'reg_ref' => Member::nextRegRef()]);

    $member->update(['status' => 'Active']); // approval creates the login and notifies the member only
    $memberUser = $member->fresh()->user;
    $memberUser->forceFill(['must_change_credentials' => false, 'email_verified_at' => now()])->save();

    expect(AppNotification::visibleTo($memberUser)->count())->toBe(1)
        ->and(AppNotification::visibleTo($admin)->count())->toBe(0);

    $this->actingAs($admin)->post(route('notifications.store'), [
        'title' => 'Choir practice', 'message' => 'Saturday 4pm', 'notification_type' => 'event', 'recipient' => 'all',
    ])->assertSessionHasNoErrors();
    $this->actingAs($memberUser)->post(route('notifications.store'), ['title' => 'x', 'message' => 'y', 'notification_type' => 'info', 'recipient' => 'all'])->assertForbidden();

    $this->actingAs($memberUser)->post(route('notifications.read-all'));
    expect(AppNotification::visibleTo($memberUser)->unreadBy($memberUser)->count())->toBe(0)
        ->and(AppNotification::visibleTo($admin)->unreadBy($admin)->count())->toBe(1);

    // A pastoral response notifies the requester.
    $pr = PrayerRequest::create(['requester_member_id' => $member->id, 'requester_name' => 'Kwame', 'subject' => 'Job', 'request_details' => 'Pray for a job', 'category' => 'Financial', 'status' => 'Active']);
    $this->actingAs($admin)->patch(route('prayer-requests.update', $pr), [
        'subject' => 'Job', 'request_details' => 'Pray for a job', 'category' => 'Financial', 'status' => 'Active', 'response' => 'We are praying with you',
    ])->assertSessionHasNoErrors();
    expect(AppNotification::visibleTo($memberUser)->unreadBy($memberUser)->first()?->title)->toBe('Response to your prayer request');
});
