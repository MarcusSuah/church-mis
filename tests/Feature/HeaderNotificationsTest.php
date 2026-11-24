<?php

/*
 * Header bell: edits across the backend and birthday messages reach the
 * notification summary, including for the person who made the change.
 */

use App\Enums\Role as RoleEnum;
use App\Models\Member;
use App\Models\User;
use App\Models\Wedding;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    // Activity alerts are off for console runs by default; tests run in the console.
    config(['activity.in_console' => true]);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

/** @return array<int, string> titles in the user's header bell */
function bellTitles(User $user): array
{
    $titles = [];
    test()->actingAs($user)->get('/dashboard')->assertInertia(function (Assert $page) use (&$titles) {
        $titles = collect($page->toArray()['props']['notificationSummary']['items'])->pluck('title')->all();
    });

    return $titles;
}

test('editing a record notifies staff in the header, including the person who edited it', function () {
    $colleague = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
    $wedding = Wedding::create(['groom_name' => 'Kofi', 'bride_name' => 'Ama', 'wedding_date' => now()->toDateString(), 'status' => 'scheduled']);

    $this->actingAs($this->admin)->patch("/weddings/{$wedding->id}", [
        'groom_name' => 'Kofi', 'bride_name' => 'Ama', 'wedding_date' => now()->toDateString(),
        'status' => 'scheduled', 'location' => 'Main Sanctuary', 'certificate_issued' => false,
    ])->assertSessionHasNoErrors();

    expect(bellTitles($this->admin))->toContain('Wedding record updated')
        ->and(bellTitles($colleague))->toContain('Wedding record updated');

    $this->actingAs($this->admin)->get('/dashboard')->assertInertia(fn (Assert $p) => $p
        ->where('notificationSummary.unread', fn ($n) => $n >= 1)
        ->where('notificationSummary.items.0.message', fn ($m) => str_contains($m, 'Kofi Ama') && str_contains($m, 'location')));
});

test('sending birthday messages tells staff who received them', function () {
    $ama = Member::create(['first_name' => 'Ama', 'last_name' => 'Owusu', 'status' => 'Active']);
    $kofi = Member::create(['first_name' => 'Kofi', 'last_name' => 'Mensah', 'status' => 'Active']);

    $this->actingAs($this->admin)->post('/birthdays/send', [
        'member_ids' => [$ama->id, $kofi->id], 'occasion' => 'Birthday',
        'subject' => 'Happy birthday', 'message' => 'Blessings!', 'channels' => ['in_app'],
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->get('/dashboard')->assertInertia(fn (Assert $p) => $p
        ->where('notificationSummary.items', fn ($items) => collect($items)->contains(fn ($n) => $n['title'] === 'Birthday message sent'
            && str_contains($n['message'], 'Ama Owusu') && str_contains($n['message'], 'Kofi Mensah')
            && $n['link_url'] === '/birthdays')));
});

test('staff without access to a module are not told about its changes', function () {
    $wedding = Wedding::create(['groom_name' => 'Kofi', 'bride_name' => 'Ama', 'wedding_date' => now()->toDateString(), 'status' => 'scheduled']);
    $wedding->update(['location' => 'Chapel']);

    // The Finance Officer role cannot manage weddings.
    $finance = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::FINANCEOFFICER->value));

    expect(bellTitles($finance))->not->toContain('Wedding record updated');
});
