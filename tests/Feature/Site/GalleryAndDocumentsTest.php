<?php

use App\Enums\Role as RoleEnum;
use App\Models\Board;
use App\Models\BoardMember;
use App\Models\Document;
use App\Models\GalleryAlbum;
use App\Models\Member;
use App\Models\Sermon;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('public');
    Storage::fake('local');
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

function albumWithPhotos(int $count, array $attributes = []): GalleryAlbum
{
    $album = GalleryAlbum::create(['title' => 'Easter Sunday', 'event_date' => '2026-04-05', 'is_published' => true, ...$attributes]);
    foreach (range(1, $count) as $i) {
        $album->photos()->create(['image_path' => "gallery/{$album->id}/photo-{$i}.jpg", 'sort_order' => $i]);
    }

    return $album;
}

test('an album holds at most ten photos', function () {
    $album = albumWithPhotos(8);

    $this->actingAs($this->admin)->post(route('gallery-albums.photos.store', $album), [
        'photos' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg'), UploadedFile::fake()->image('c.jpg')],
    ])->assertSessionHasErrors('photos');
    expect($album->photos()->count())->toBe(8);

    $this->actingAs($this->admin)->post(route('gallery-albums.photos.store', $album), [
        'photos' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg')],
    ])->assertSessionHasNoErrors();
    expect($album->photos()->count())->toBe(10);
    Storage::disk('public')->assertExists($album->photos()->reorder()->latest('id')->first()->image_path);
});

test('only website managers can manage albums', function () {
    $member = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::MEMBER->value));

    $this->actingAs($member)->get(route('gallery-albums.index'))->assertForbidden();
    $this->actingAs($member)->post(route('gallery-albums.store'), ['title' => 'Hack'])->assertForbidden();
    expect(GalleryAlbum::count())->toBe(0);
});

test('the public gallery lists published albums with their photos and filters by tag', function () {
    albumWithPhotos(3, ['title' => 'Choir Night', 'tags' => ['choir']]);
    albumWithPhotos(2, ['title' => 'Youth Camp', 'tags' => ['youth']]);
    albumWithPhotos(2, ['title' => 'Draft Album', 'is_published' => false]);

    $this->get(route('site.gallery'))->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('site/gallery')
        ->has('albums.data', 2)
        ->where('tags', ['choir', 'youth']));

    $this->get(route('site.gallery', ['tag' => 'choir']))->assertOk()->assertInertia(fn (Assert $p) => $p
        ->has('albums.data', 1)
        ->where('albums.data.0.title', 'Choir Night')
        ->has('albums.data.0.photos', 3));
});

test('a sermon page shows the photos from its album', function () {
    $sermon = Sermon::create(['title' => 'The Good Shepherd', 'speaker_name' => 'Rev. Paul Kollie', 'sermon_date' => '2026-04-05', 'is_published' => true]);
    albumWithPhotos(4, ['sermon_id' => $sermon->id]);

    $this->get(route('site.sermons.show', $sermon->slug))->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('site/detail')
        ->has('photos', 4));
});

test('public documents can be viewed inline on the website but private ones cannot', function () {
    Storage::disk('local')->put('documents/constitution.pdf', '%PDF-1.4 test');
    Storage::disk('local')->put('documents/minutes.pdf', '%PDF-1.4 test');
    $public = Document::create(['title' => 'Church Constitution', 'category' => 'Policy', 'file_url' => 'documents/constitution.pdf', 'file_type' => 'pdf', 'is_public' => true]);
    $private = Document::create(['title' => 'Board Minutes', 'category' => 'Minutes', 'file_url' => 'documents/minutes.pdf', 'file_type' => 'pdf', 'is_public' => false]);

    $this->get('/')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->has('documents', 1)
        ->where('documents.0.title', 'Church Constitution'));

    $response = $this->get(route('site.documents.view', $public->slug))->assertOk();
    expect($response->headers->get('Content-Disposition'))->toStartWith('inline')
        ->and($response->headers->get('Cache-Control'))->toContain('no-store');

    $this->get(route('site.documents.view', $private->slug))->assertNotFound();
});

test('the leadership page lists active boards with their members', function () {
    $board = Board::create(['name' => 'Board of Trustees', 'is_active' => true]);
    $member = Member::create(['first_name' => 'Grace', 'last_name' => 'Osei', 'status' => 'Active']);
    BoardMember::create(['board_id' => $board->id, 'member_id' => $member->id, 'role' => 'Chairperson']);
    Board::create(['name' => 'Empty Board', 'is_active' => true]);

    $this->get(route('site.leadership'))->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('kind', 'people')
        ->has('boards', 1)
        ->where('boards.0.title', 'Board of Trustees')
        ->where('boards.0.members.0.title', 'Grace Osei')
        ->where('boards.0.members.0.subtitle', 'Chairperson'));
});
