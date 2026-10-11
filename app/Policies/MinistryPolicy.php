<?php

namespace App\Policies;

use App\Models\Ministry;
use App\Models\User;
use App\Support\LeadershipScope;

/**
 * Ministries (Phase 4, F08).
 *
 * ministries.update alone covers only the ministries the user leads.
 * ministries.manage-any (Admin, Supervisor) covers every ministry.
 * The Superadmin passes through App\Support\Authorization.
 */
class MinistryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('ministries.view');
    }

    public function create(User $user): bool
    {
        return $user->can('ministries.create');
    }

    /** Edit details, members and leader. */
    public function update(User $user, Ministry $ministry): bool
    {
        return $user->can('ministries.update') && $this->inScope($user, $ministry);
    }

    public function delete(User $user, Ministry $ministry): bool
    {
        return $user->can('ministries.delete') && $this->inScope($user, $ministry);
    }

    private function inScope(User $user, Ministry $ministry): bool
    {
        return $user->can('ministries.manage-any') || LeadershipScope::leadsMinistry($user, $ministry);
    }
}
