<?php

namespace App\Policies;

use App\Models\Department;
use App\Models\User;
use App\Support\LeadershipScope;

/**
 * Departments (Phase 4, F08).
 *
 * departments.update alone covers only the departments the user leads.
 * departments.manage-any (Admin, Supervisor) covers every department.
 * The Superadmin passes through App\Support\Authorization.
 */
class DepartmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('departments.view');
    }

    public function create(User $user): bool
    {
        return $user->can('departments.create');
    }

    /** Edit details, members, leader and activities. */
    public function update(User $user, Department $department): bool
    {
        return $user->can('departments.update') && $this->inScope($user, $department);
    }

    public function delete(User $user, Department $department): bool
    {
        return $user->can('departments.delete') && $this->inScope($user, $department);
    }

    private function inScope(User $user, Department $department): bool
    {
        return $user->can('departments.manage-any') || LeadershipScope::leadsDepartment($user, $department);
    }
}
