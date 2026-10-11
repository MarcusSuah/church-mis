<?php

use App\Enums\Role;
use App\Models\Announcement;
use App\Models\AttendanceSession;
use App\Models\Board;
use App\Models\Committee;
use App\Models\Department;
use App\Models\Event;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Notification;
use App\Models\PrayerRequest;
use App\Models\SitePage;
use App\Models\Tithe;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('the database seeder creates setup data and a complete, repeatable demo dataset', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class); // running twice must not duplicate anything

    expect(SitePage::count())->toBe(3)
        ->and(Department::count())->toBe(8)
        ->and(Member::where('email', 'like', '%@example.org')->count())->toBe(36)
        ->and(Member::where('status', 'Pending')->whereNotNull('reg_ref')->count())->toBe(3)
        ->and(Event::whereNotNull('slug')->count())->toBe(8)
        ->and(Tithe::count())->toBeGreaterThan(100)
        ->and(AttendanceSession::count())->toBe(8);

    // Seeding is quiet: no notifications and no member logins were created.
    expect(Notification::count())->toBe(0)
        ->and(User::count())->toBe(1);
});

test('a member added by staff with the registration-style form keeps the photo and family details', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(Role::ADMIN->value));
    Storage::fake('public');

    $this->actingAs($admin)->post(route('members.store'), [
        'photo' => UploadedFile::fake()->image('face.jpg', 400, 400),
        'first_name' => 'Abena', 'last_name' => 'Kollie', 'gender' => 'Female', 'status' => 'Active',
        'membership_type' => 'Regular Member', 'interests' => 'Choir, Ushers',
        'family' => ['spouse_name' => 'Kofi Kollie', 'spouse_is_member' => '1', 'children' => [['name' => 'Ama Kollie', 'date_of_birth' => '2015-04-02']]],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $member = Member::where('first_name', 'Abena')->firstOrFail();
    expect($member->photo_url)->toContain('/storage/uploads/members/')
        ->and($member->family['spouse_name'])->toBe('Kofi Kollie')
        ->and($member->family['children'][0]['name'])->toBe('Ama Kollie')
        ->and($member->member_id)->not->toBeNull();
});

test('every seeded record can be saved from its edit form, including a new banner image', function () {
    $this->seed(DatabaseSeeder::class);
    $super = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(Role::SUPERADMIN->value));
    $banner = 'http://localhost/storage/uploads/images/new-banner.jpg';

    // [index page, prop holding the rows, update route, model] — the edit form sends the row back as it was shown.
    $forms = [
        ['/departments', 'departments', 'departments.update', Department::class],
        ['/ministries', 'ministries', 'ministries.update', Ministry::class],
        ['/boards', 'boards', 'boards.update', Board::class],
        ['/committees', 'committees', 'committees.update', Committee::class],
        ['/events', 'records', 'events.update', Event::class],
        ['/announcements', 'records', 'announcements.update', Announcement::class],
    ];

    foreach ($forms as [$page, $prop, $route, $model]) {
        // Through JSON, as the browser receives it (enums become their string value).
        $rows = json_decode(json_encode($this->actingAs($super)->get($page)->assertOk()->viewData('page')['props'][$prop]), true);
        expect($rows)->not->toBeEmpty();

        foreach ($rows as $row) {
            $this->patch(route($route, $row['id']), [...$row, 'banner_url' => $banner])
                ->assertSessionHasNoErrors();
            expect($model::find($row['id'])->banner_url)->toBe($banner, "{$route} did not save the banner");
        }
    }
});

test('every seeded prayer request can be edited and saved', function () {
    $this->seed(DatabaseSeeder::class);
    $super = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(Role::SUPERADMIN->value));

    $rows = $this->actingAs($super)->get('/prayer-requests')->viewData('page')['props']['requests'];
    expect($rows)->not->toBeEmpty();

    foreach ($rows as $row) {
        $this->patch(route('prayer-requests.update', $row['id']), [
            ...$row, 'subject' => $row['raw_subject'] ?? $row['subject'], 'notes' => 'Followed up by phone.',
        ])->assertSessionHasNoErrors();
        expect(PrayerRequest::find($row['id'])->notes)->toBe('Followed up by phone.');
    }
});
