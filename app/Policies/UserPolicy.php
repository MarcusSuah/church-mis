<?php

namespace App\Policies;

use App\Enums\Role as RoleEnum;
use App\Models\User;

/**
 * Who may manage which user accounts (Phase 2, F03).
 *
 * Permission alone is not enough: an account may only be changed by someone
 * who outranks it. Ranks: Superadmin (3) > Admin (2) > everyone else (1).
 *  - Only a Superadmin can change, block, sign out or delete a Superadmin.
 *  - Only a Superadmin can change, block, sign out or delete an Admin.
 *  - Nobody can deactivate, block or delete their own account here.
 *
 * Note: the Superadmin passes every check through Gate::before in
 * AppServiceProvider; these rules stop everyone else.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    public function view(User $user, User $model): bool
    {
        return $user->can('users.view');
    }

    public function create(User $user): bool
    {
        return $user->can('users.create');
    }

    /** Edit profile fields, email, avatar, must_change_credentials; activate. */
    public function update(User $user, User $model): bool
    {
        return $user->can('users.update') && $this->outranksOrSelf($user, $model);
    }

    public function deactivate(User $user, User $model): bool
    {
        return $user->id !== $model->id && $user->can('users.update') && self::outranks($user, $model);
    }

    public function approve(User $user, User $model): bool
    {
        return $user->can('users.approve') && self::outranks($user, $model);
    }

    public function delete(User $user, User $model): bool
    {
        return $user->id !== $model->id && $user->can('users.delete') && self::outranks($user, $model);
    }

    /** Block / unblock / sign out of all devices (Activity Log). */
    public function manageAccess(User $user, User $model): bool
    {
        return $user->id !== $model->id && $user->can('activity.manage') && self::outranks($user, $model);
    }

    public function restore(User $user, User $model): bool
    {
        return false;
    }

    public function forceDelete(User $user, User $model): bool
    {
        return false;
    }

    public static function rank(User $user): int
    {
        return match (true) {
            $user->hasRole(RoleEnum::SUPERADMIN->value) => 3,
            $user->hasRole(RoleEnum::ADMIN->value) => 2,
            default => 1,
        };
    }

    /** True when $actor's rank is above $target's, or the target is an ordinary account. */
    public static function outranks(User $actor, User $target): bool
    {
        $targetRank = self::rank($target);

        return $targetRank === 1 || self::rank($actor) > $targetRank;
    }

    private function outranksOrSelf(User $actor, User $target): bool
    {
        return $actor->id === $target->id || self::outranks($actor, $target);
    }
}
