<?php

use App\Enums\Role as RoleEnum;
use App\Models\SitePage;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SitePageSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RolePermissionSeeder::class, SitePageSeeder::class]);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

test('the seeded legal pages are shown on the website and linked in the footer', function () {
    $this->get('/privacy')->assertRedirect(route('site.page', 'privacy-policy'));
    $this->get('/terms')->assertRedirect(route('site.page', 'terms-and-conditions'));

    $this->get(route('site.page', 'terms-of-use'))->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('site/page')
        ->where('page.title', 'Terms of Use')
        ->has('footerPages', 3));
});

test('admins can edit a page; hidden pages disappear from the site and the footer', function () {
    $privacy = SitePage::where('slug', 'privacy-policy')->firstOrFail();

    $this->actingAs($this->admin)->patch(route('site-pages.update', $privacy), [
        'title' => 'Privacy Notice', 'slug' => 'something-else', 'summary' => 'How we use data.',
        'body' => "## Our promise\nWe keep your data safe.", 'is_published' => false, 'show_in_footer' => true, 'sort_order' => 1,
    ])->assertRedirect();

    $privacy->refresh();
    expect($privacy->title)->toBe('Privacy Notice')
        ->and($privacy->slug)->toBe('privacy-policy'); // fixed address for core pages

    $this->get(route('site.page', 'privacy-policy'))->assertNotFound();
    $this->get(route('site.page', 'terms-of-use'))->assertInertia(fn (Assert $p) => $p->has('footerPages', 2));
});

test('admins can add and delete extra pages but not delete the core legal pages', function () {
    $this->actingAs($this->admin)->post(route('site-pages.store'), [
        'title' => 'Child Safeguarding', 'body' => 'Our safeguarding policy.', 'is_published' => true, 'show_in_footer' => false,
    ])->assertRedirect();
    $page = SitePage::where('slug', 'child-safeguarding')->firstOrFail();

    $this->actingAs($this->admin)->delete(route('site-pages.destroy', $page))->assertRedirect();
    expect(SitePage::where('slug', 'child-safeguarding')->exists())->toBeFalse();

    $core = SitePage::where('slug', 'terms-of-use')->firstOrFail();
    $this->actingAs($this->admin)->delete(route('site-pages.destroy', $core))->assertStatus(422);
    expect($core->fresh())->not->toBeNull();
});

test('people without the website permission cannot manage pages', function () {
    $pastor = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::PASTOR->value));

    $this->actingAs($pastor)->get(route('site-pages.index'))->assertForbidden();
});
