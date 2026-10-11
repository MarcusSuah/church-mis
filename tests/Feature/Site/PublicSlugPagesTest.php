<?php

use App\Enums\Role;
use App\Models\Department;
use App\Models\Event;
use App\Models\GalleryAlbum;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Sermon;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

test('records get a unique slug from their title or name', function () {
    $first = Event::create(['title' => 'Easter Sunday Service', 'start_date' => now()->addWeek()]);
    $second = Event::create(['title' => 'Easter Sunday Service', 'start_date' => now()->addWeeks(2)]);
    $member = Member::create(['first_name' => 'Grace', 'last_name' => 'Osei', 'status' => 'Active']);

    expect($first->slug)->toBe('easter-sunday-service')
        ->and($second->slug)->toBe('easter-sunday-service-2')
        ->and($member->slug)->toBe('grace-osei');
});

test('the slug follows the title when it is edited, and id links still work', function () {
    $event = Event::create(['title' => 'Youth Raly', 'start_date' => now()->addWeek(), 'is_public' => true]);
    $event->update(['title' => 'Youth Rally']);
    $event->update(['location' => 'Main hall']); // unrelated edits keep the slug

    expect($event->fresh()->slug)->toBe('youth-rally');
    $this->get('/church/events/youth-rally')->assertOk();
    $this->get("/church/events/{$event->id}")->assertOk();
});
test('public detail pages open by slug and listings link to them', function () {
    $event = Event::create(['title' => 'Harvest Thanksgiving', 'start_date' => now()->addDays(3), 'is_public' => true, 'status' => 'Upcoming']);

    $this->get('/church/events')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('site/listing')
        ->where('items.0.href', route('site.events.show', 'harvest-thanksgiving')));

    $this->get('/church/events/harvest-thanksgiving')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('site/detail')
        ->where('item.title', 'Harvest Thanksgiving')
        ->where('back.url', route('site.events')));

    // Links built from the id before slugs existed still resolve.
    $this->get("/church/events/{$event->id}")->assertOk();
});

test('hidden or unpublished content is not reachable by slug', function () {
    Event::create(['title' => 'Staff Retreat', 'start_date' => now()->addDays(3), 'is_public' => false]);
    Sermon::create(['title' => 'Draft Message', 'speaker_name' => 'Pastor', 'sermon_date' => now()->toDateString(), 'is_published' => false]);
    Ministry::create(['name' => 'Closed Ministry', 'is_active' => false]);

    $this->get('/church/events/staff-retreat')->assertNotFound();
    $this->get('/church/sermons/draft-message')->assertNotFound();
    $this->get('/church/ministries/closed-ministry')->assertNotFound();
    $this->get('/church/events/does-not-exist')->assertNotFound();
});

test('staff group pages open a group by its slug, and old id links still work', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = tap(User::factory()->create(['must_change_credentials' => false]), fn ($u) => $u->assignRole(Role::ADMIN->value));
    $choir = Department::create(['name' => 'Mass Choir', 'category' => 'Choir']);

    $this->actingAs($admin)->get('/departments?department=mass-choir')->assertInertia(fn (Assert $p) => $p
        ->where('selected.name', 'Mass Choir')
        ->where('departments.0.slug', 'mass-choir'));
    $this->get("/departments?department={$choir->id}")->assertInertia(fn (Assert $p) => $p->where('selected.name', 'Mass Choir'));
});

test('the gallery department filter accepts the department slug', function () {
    $youth = Department::create(['name' => 'Youth Fellowship', 'category' => 'Youth']);
    $other = Department::create(['name' => 'Ushers Board', 'category' => 'Ushering']);
    foreach ([[$youth, 'Youth Camp'], [$other, 'Ushers Day']] as [$department, $title]) {
        $album = GalleryAlbum::create(['title' => $title, 'department_id' => $department->id, 'is_published' => true, 'event_date' => now()->toDateString()]);
        $album->photos()->create(['image_path' => "gallery/{$album->id}/photo.jpg", 'sort_order' => 1]);
    }

    $this->get('/gallery?department=youth-fellowship')->assertInertia(fn (Assert $p) => $p
        ->where('albums.data', fn ($albums) => collect($albums)->pluck('title')->all() === ['Youth Camp']));
});

test('load-test members from perf:seed get slugs like members created in the app', function () {
    $this->artisan('perf:seed', ['--members' => 2, '--gifts' => 0, '--expenses' => 0])->assertSuccessful();

    expect(Member::where('member_id', 'like', 'PERF-M-%')->whereNull('slug')->count())->toBe(0)
        ->and(Member::where('member_id', 'like', 'PERF-M-%')->pluck('slug')->unique()->count())->toBe(2);
});
