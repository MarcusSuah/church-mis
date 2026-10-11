<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\DepartmentMember;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\MinistryMember;

/**
 * Sample members with full registration details, a few pending
 * self-registrations for the review queue, six households and department /
 * ministry memberships. Emails use the reserved example.org domain, and no
 * logins or invitation emails are created.
 */
class MemberSeeder extends DemoSeeder
{
    private const FIRST = [
        'Male' => ['Samuel', 'Joseph', 'Emmanuel', 'Daniel', 'Peter', 'Moses', 'Henry', 'Alexander', 'Prince', 'James', 'Abraham', 'Isaac', 'Benjamin', 'Charles', 'David', 'Edwin', 'Francis', 'George'],
        'Female' => ['Grace', 'Martha', 'Comfort', 'Esther', 'Patience', 'Ruth', 'Mary', 'Deborah', 'Hannah', 'Rebecca', 'Sarah', 'Victoria', 'Precious', 'Mercy', 'Josephine', 'Florence', 'Elizabeth', 'Naomi'],
    ];

    private const LAST = ['Kollie', 'Weah', 'Toe', 'Sirleaf', 'Doe', 'Kamara', 'Tubman', 'Johnson', 'Mensah', 'Flomo', 'Kpoto', 'Cooper', 'Taylor', 'Gbowee', 'Brown', 'Dennis', 'Kromah', 'Barclay'];

    private const OCCUPATIONS = ['Teacher', 'Nurse', 'Accountant', 'Trader', 'Engineer', 'Farmer', 'Civil servant', 'Student', 'Driver', 'Tailor', 'Pharmacist', 'Banker'];

    protected function seed(): void
    {
        if (Member::where('email', 'like', '%@example.org')->count() >= 30) {
            $this->command?->info('MemberSeeder: sample members already present.');

            return;
        }

        $departments = Department::pluck('id', 'name');
        $ministries = Ministry::pluck('id', 'name');
        $members = [];

        for ($i = 0; $i < 36; $i++) {
            $gender = $i % 2 === 0 ? 'Male' : 'Female';
            $first = self::FIRST[$gender][intdiv($i, 2) % count(self::FIRST[$gender])];
            $last = self::LAST[$i % count(self::LAST)];
            $selfRegistered = $i >= 32; // the last four wait in Pending Registrations
            $status = $selfRegistered ? ($i === 35 ? 'Under Review' : 'Pending') : ($i % 11 === 0 ? 'Inactive' : 'Active');
            $email = strtolower("{$first}.{$last}{$i}@example.org");
            $dob = now()->subYears(18 + ($i * 7) % 55)->subDays(($i * 37) % 365)->toDateString();
            $department = $departments->keys()->get($i % max(1, $departments->count()));
            $ministry = $ministries->keys()->get(($i * 3) % max(1, $ministries->count()));

            $member = Member::query()->where('email', $email)->first() ?? Member::forceCreate([
                'slug' => $this->slug(Member::class, "{$first} {$last}"),
                'member_id' => $selfRegistered ? null : Member::nextMemberId(),
                'reg_ref' => $selfRegistered ? Member::nextRegRef() : null,
                'first_name' => $first,
                'last_name' => $last,
                'gender' => $gender,
                'date_of_birth' => $dob,
                'marital_status' => $i % 3 === 0 ? 'Married' : ($i % 5 === 0 ? 'Widowed' : 'Single'),
                'nationality' => 'Liberian',
                'email' => $email,
                'phone' => '+231 77 '.str_pad((string) (100000 + $i * 7919 % 900000), 6, '0', STR_PAD_LEFT),
                'address' => (10 + $i).' Broad Street',
                'city' => ['Monrovia', 'Paynesville', 'Gbarnga', 'Buchanan'][$i % 4],
                'state' => ['Montserrado', 'Montserrado', 'Bong', 'Grand Bassa'][$i % 4],
                'country' => 'Liberia',
                'membership_type' => ['Regular Member', 'Regular Member', 'Associate Member', 'Junior Member', 'Transfer Member'][$i % 5],
                'date_joined' => now()->subMonths(($i * 5) % 60)->toDateString(),
                'department' => $selfRegistered ? null : $department,
                'ministry' => $selfRegistered ? null : $ministry,
                'baptized' => $i % 4 !== 3,
                'baptism_date' => $i % 4 !== 3 ? now()->subYears(1 + $i % 20)->toDateString() : null,
                'communion_participant' => $i % 4 !== 3,
                'occupation' => self::OCCUPATIONS[$i % count(self::OCCUPATIONS)],
                'emergency_name' => self::FIRST['Female'][($i + 3) % 18].' '.$last,
                'emergency_phone' => '+231 88 '.str_pad((string) (200000 + $i * 104729 % 700000), 6, '0', STR_PAD_LEFT),
                'emergency_relation' => ['Spouse', 'Mother', 'Father', 'Sibling', 'Relative'][$i % 5],
                'skills' => ['Singing', 'Teaching children', 'Accounting', 'Carpentry', 'IT support', 'Cooking'][$i % 6],
                'interests' => ['Choir', 'Ushers', 'Prayer Ministry', 'Youth Ministry', 'Sunday School'][$i % 5],
                'status' => $status,
            ]);
            $members[] = $member;

            if (! $selfRegistered && $department && isset($departments[$department])) {
                DepartmentMember::firstOrCreate(['department_id' => $departments[$department], 'member_id' => $member->id], ['role' => 'Member', 'joined_at' => now()]);
            }
            if (! $selfRegistered && $ministry && isset($ministries[$ministry])) {
                $this->firstOrMake(MinistryMember::class, ['ministry_id' => $ministries[$ministry], 'member_id' => $member->id], ['role' => 'Member', 'joined_at' => now()]);
            }
        }

        // Six households: a married couple and two children each.
        foreach (array_slice(array_filter($members, fn (Member $m) => $m->marital_status === 'Married'), 0, 6) as $head) {
            $family = $this->firstOrMake(Family::class, ['family_name' => "The {$head->last_name} Family"], [
                'address' => $head->address,
                'city' => $head->city,
                'country' => $head->country,
                'phone' => $head->phone,
                'email' => $head->email,
                'status' => 'Active',
            ]);
            $this->firstOrMake(FamilyMember::class, ['family_id' => $family->id, 'member_id' => $head->id], ['name' => $head->full_name, 'role' => 'Head']);
            foreach (['Junior', 'Little'] as $n => $prefix) {
                $this->firstOrMake(FamilyMember::class, ['family_id' => $family->id, 'name' => "{$prefix} {$head->last_name}"], [
                    'role' => 'Child',
                    'date_of_birth' => now()->subYears(6 + $n * 4)->toDateString(),
                ]);
            }
        }

        $this->refreshGroupCounts();
    }

    /** Model events are off while seeding, so update the cached member counts directly. */
    private function refreshGroupCounts(): void
    {
        foreach (Department::all() as $department) {
            $department->forceFill(['member_count' => DepartmentMember::where('department_id', $department->id)->count()])->saveQuietly();
        }
        foreach (Ministry::all() as $ministry) {
            $ministry->forceFill(['member_count' => MinistryMember::where('ministry_id', $ministry->id)->count()])->saveQuietly();
        }
    }
}
