<?php

/*
 * Header live search (/search): who may use it, what each role can find,
 * and that hidden records (confidential care, anonymous requesters) stay hidden.
 */

use App\Enums\Role as RoleEnum;
use App\Http\Controllers\System\GlobalSearchController;
use App\Models\Baptism;
use App\Models\Member;
use App\Models\PastoralCare;
use App\Models\PrayerRequest;
use App\Models\Tithe;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function searcher(RoleEnum $role): User
{
    return tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole($role->value));
}

/** @return array<string, array<string, mixed>> groups keyed by module */
function searchGroups(User $user, string $q): array
{
    return collect(test()->actingAs($user)->getJson('/search?'.http_build_query(['q' => $q]))->assertOk()->json('groups'))
        ->keyBy('key')->all();
}

test('guests are sent to sign in and member-only accounts are refused', function () {
    $this->getJson('/search?q=ama')->assertUnauthorized();
    $this->actingAs(searcher(RoleEnum::MEMBER))->getJson('/search?q=ama')->assertForbidden();
});

test('staff find matching records across modules, each linked to its page', function () {
    $member = Member::create(['first_name' => 'Zephaniah', 'last_name' => 'Kollie', 'status' => 'Active']);
    $tithe = Tithe::create(['member_name' => 'Zephaniah Kollie', 'amount' => 75, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);
    $baptism = Baptism::create(['candidate_name' => 'Zephaniah Kollie', 'baptism_date' => now()->toDateString()]);
    Member::create(['first_name' => 'Unrelated', 'last_name' => 'Person', 'status' => 'Active']);

    $groups = searchGroups(searcher(RoleEnum::ADMIN), 'zephan');

    expect($groups['members']['items'])->toHaveCount(1)
        ->and($groups['members']['items'][0])->toMatchArray(['id' => $member->id, 'title' => 'Zephaniah Kollie', 'url' => '/member-management?search=zephan'])
        ->and($groups['tithes']['items'][0]['id'])->toBe((string) $tithe->id)
        ->and($groups['tithes']['items'][0]['subtitle'])->toContain('USD 75.00')
        // Admins may edit baptisms, so the link opens the record.
        ->and($groups['baptisms']['items'][0]['url'])->toBe("/baptisms?search=zephan&edit={$baptism->id}");
});

test('a module is searched only when the user may open its page', function () {
    Member::create(['first_name' => 'Zephaniah', 'last_name' => 'Kollie', 'status' => 'Active']);
    Tithe::create(['member_name' => 'Zephaniah Kollie', 'amount' => 75, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);

    // The Pastor role has members.view but not tithes.view.
    expect(searchGroups(searcher(RoleEnum::PASTOR), 'zephan'))->toHaveKey('members')->not->toHaveKey('tithes');
});

test('confidential pastoral care is found only by users allowed to see it', function () {
    PastoralCare::create(['member_name' => 'Quinton Secret', 'care_type' => 'Counseling', 'description' => 'Private matter', 'status' => 'Open', 'priority' => 'High', 'is_confidential' => true]);

    expect(searchGroups(searcher(RoleEnum::ADMIN), 'quinton'))->not->toHaveKey('pastoral_care')
        ->and(searchGroups(searcher(RoleEnum::PASTOR), 'quinton')['pastoral_care']['items'])->toHaveCount(1);
});

test('anonymous prayer requests are never matched by the requester name', function () {
    PrayerRequest::create(['requester_name' => 'Hidden Requester', 'subject' => 'Healing', 'request_details' => 'Please pray', 'category' => 'Health', 'is_anonymous' => true, 'status' => 'Active']);
    PrayerRequest::create(['requester_name' => 'Hidden Requester', 'subject' => 'Travel', 'request_details' => 'Safe trip', 'category' => 'Family', 'is_anonymous' => false, 'status' => 'Active']);

    $items = searchGroups(searcher(RoleEnum::ADMIN), 'hidden requester')['prayer_requests']['items'];

    expect($items)->toHaveCount(1)->and($items[0]['title'])->toBe('Travel');
});

test('short queries return nothing and long result lists link to the full list', function () {
    foreach (range(1, GlobalSearchController::PER_GROUP + 2) as $i) {
        Member::create(['first_name' => 'Zebulon', 'last_name' => "Number{$i}", 'status' => 'Active']);
    }
    $admin = searcher(RoleEnum::ADMIN);

    expect(searchGroups($admin, 'z'))->toBe([]);

    $members = searchGroups($admin, 'zebulon')['members'];
    expect($members['items'])->toHaveCount(GlobalSearchController::PER_GROUP)
        ->and($members['more_url'])->toBe('/member-management?search=zebulon');
});
