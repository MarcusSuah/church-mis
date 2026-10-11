<?php

namespace App\Support;

use App\Models\Department;
use App\Models\DepartmentMember;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Models\User;

/**
 * "Does this user lead this department / ministry?" (Phase 4, F08).
 *
 * A user leads a group when the member record linked to their login is the
 * group's leader (leader_id) or holds the Leader or Co-Leader role in it.
 * IDs sent by the browser are never trusted: the member is always looked up
 * from the signed-in user.
 */
class LeadershipScope
{
    public const LEADER_ROLES = ['Leader', 'Co-Leader'];

    public static function memberIdFor(User $user): ?string
    {
        return Member::where('user_id', $user->id)->value('id');
    }

    public static function leadsDepartment(User $user, Department $department): bool
    {
        $memberId = self::memberIdFor($user);

        return $memberId !== null && (
            $department->leader_id === $memberId
            || $department->memberships()->where('member_id', $memberId)->whereIn('role', self::LEADER_ROLES)->exists()
        );
    }

    public static function leadsMinistry(User $user, Ministry $ministry): bool
    {
        $memberId = self::memberIdFor($user);

        return $memberId !== null && (
            $ministry->leader_id === $memberId
            || MinistryMember::where('ministry_id', $ministry->id)->where('member_id', $memberId)->whereIn('role', self::LEADER_ROLES)->exists()
        );
    }

    /** IDs of the departments this user leads (one query, for list pages). */
    public static function departmentIds(User $user): array
    {
        $memberId = self::memberIdFor($user);
        if (! $memberId) {
            return [];
        }

        return Department::query()
            ->where('leader_id', $memberId)
            ->orWhereIn('id', DepartmentMember::where('member_id', $memberId)->whereIn('role', self::LEADER_ROLES)->select('department_id'))
            ->pluck('id')->all();
    }

    /** IDs of the ministries this user leads (one query, for list pages). */
    public static function ministryIds(User $user): array
    {
        $memberId = self::memberIdFor($user);
        if (! $memberId) {
            return [];
        }

        return Ministry::query()
            ->where('leader_id', $memberId)
            ->orWhereIn('id', MinistryMember::where('member_id', $memberId)->whereIn('role', self::LEADER_ROLES)->select('ministry_id'))
            ->pluck('id')->all();
    }
}
