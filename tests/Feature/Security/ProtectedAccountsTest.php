<?php

use App\Enums\Role as RoleEnum;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => $this->seed(RolePermissionSeeder::class));

function accountWithRole(string $role): User
{
    return tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole($role));
}

test('a Superadmin account cannot be deleted, even by another Superadmin', function () {
    $target = accountWithRole(RoleEnum::SUPERADMIN->value);

    $this->actingAs(accountWithRole(RoleEnum::SUPERADMIN->value))
        ->delete(route('admin.users.destroy', $target))
        ->assertSessionHasErrors(['user' => 'A Superadmin account cannot be deleted.']);

    expect(User::find($target->id))->not->toBeNull();
});

test('other accounts can still be deleted', function () {
    $target = accountWithRole(RoleEnum::MEMBER->value);

    $this->actingAs(accountWithRole(RoleEnum::SUPERADMIN->value))
        ->delete(route('admin.users.destroy', $target))
        ->assertSessionHasNoErrors();

    expect(User::find($target->id))->toBeNull();
});

test('the users list marks Superadmin accounts as protected', function () {
    $super = accountWithRole(RoleEnum::SUPERADMIN->value);
    accountWithRole(RoleEnum::MEMBER->value);

    $this->actingAs($super)->get(route('admin.users.index'))->assertInertia(fn (Assert $p) => $p
        ->where('users.data', fn ($rows) => collect($rows)->firstWhere('id', $super->id)['is_protected'] === true
            && collect($rows)->where('is_protected', false)->count() === 1));
});
