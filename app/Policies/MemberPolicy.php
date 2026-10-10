<?php

namespace App\Policies;

use App\Models\Member;
use App\Models\User;

/**
 * Lets controllers/blade use $user->can('update', $member) etc. Super admins
 * are let through by the Gate::before hook in AppServiceProvider.
 */
class MemberPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('members.view');
    }

    public function view(User $user, Member $member): bool
    {
        return $user->can('members.view') || $member->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->can('members.create');
    }

    public function update(User $user, Member $member): bool
    {
        return $user->can('members.update');
    }

    public function delete(User $user, Member $member): bool
    {
        return $user->can('members.delete');
    }

    public function restore(User $user, Member $member): bool
    {
        return false;
    }

    public function forceDelete(User $user, Member $member): bool
    {
        return false;
    }
}
