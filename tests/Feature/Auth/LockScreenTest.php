<?php

use App\Enums\Role as RoleEnum;
use App\Http\Controllers\Account\LockScreenController;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->user = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

test('a locked screen sends every page to the lock screen without signing the user out', function () {
    $this->actingAs($this->user)->from('/departments')->post(route('lock-screen.lock'))->assertRedirect(route('lock-screen'));

    $this->get('/dashboard')->assertRedirect(route('lock-screen'));
    $this->getJson('/notifications')->assertStatus(423);
    $this->get(route('lock-screen'))->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('auth/lock-screen')
        ->where('user.name', $this->user->name)
        ->where('user.role', 'Admin'));
    $this->assertAuthenticatedAs($this->user);
});

test('the wrong password keeps the screen locked', function () {
    $this->actingAs($this->user)->post(route('lock-screen.lock'));

    $this->post(route('lock-screen.unlock'), ['password' => 'not-the-password'])
        ->assertSessionHasErrors(['password' => 'That password is not correct.']);

    $this->get('/dashboard')->assertRedirect(route('lock-screen'));
});

test('the right password unlocks and returns to the page the user was on', function () {
    $this->actingAs($this->user)->post(route('lock-screen.lock'));
    $this->get('/departments');   // remembered while locked

    $this->post(route('lock-screen.unlock'), ['password' => 'password'])->assertRedirect(url('/departments'));

    $this->get('/dashboard')->assertOk();
    $this->get(route('lock-screen'))->assertRedirect(route('dashboard'));
});

test('unlocking never redirects to another site', function () {
    $this->actingAs($this->user)
        ->withSession([LockScreenController::LOCKED_KEY => now()->toIso8601String(), LockScreenController::INTENDED_KEY => 'https://evil.example/phish'])
        ->post(route('lock-screen.unlock'), ['password' => 'password'])
        ->assertRedirect(route('dashboard'));
});

test('admins set the idle minutes in Church Settings and every page receives them', function () {
    $settings = ['name' => 'Grace Church', 'short_name' => 'GC', 'currency' => 'USD', 'exchange_rate' => 190, 'birthday_notifications' => true];

    $this->actingAs($this->user)->put(route('church-settings.update'), [...$settings, 'lock_screen_minutes' => 999])
        ->assertSessionHasErrors('lock_screen_minutes');
    $this->put(route('church-settings.update'), [...$settings, 'lock_screen_minutes' => 3])->assertSessionHasNoErrors();

    $this->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('screenLock.minutes', 3));
});
