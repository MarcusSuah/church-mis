<?php

namespace Database\Seeders;

use App\Enums\LeadershipRole;
use App\Models\ChurchLeadership;

/** Sample church leadership team shown on the website. */
class LeadershipSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $leaders = [
            ['Samuel', 'Kollie', 'Senior Pastor', LeadershipRole::SeniorPastor, 'Rev. Kollie has shepherded the congregation for over fifteen years, with a heart for expository preaching and discipleship.'],
            ['Esther', 'Kpoto', 'Associate Pastor', LeadershipRole::AssociatePastor, 'Rev. Kpoto leads pastoral care, women\'s ministry and the hospital visitation team.'],
            ['Daniel', 'Tubman', 'Minister of Evangelism', LeadershipRole::Minister, 'Rev. Tubman coordinates outreach, missions and new-believer follow-up.'],
            ['Joseph', 'Kollie', 'Chairman, Board of Deacons', LeadershipRole::Deacon, 'Deacon Kollie serves the church in spiritual care and the administration of the Lord\'s Supper.'],
            ['Martha', 'Weah', 'Head Deaconess', LeadershipRole::Deaconess, 'Deaconess Weah leads the prayer ministry and the welfare committee.'],
            ['Henry', 'Mensah', 'Chairman, Board of Trustees', LeadershipRole::Trustee, 'Mr. Mensah oversees church property and long-term planning.'],
        ];

        foreach ($leaders as $order => [$first, $last, $title, $role, $bio]) {
            $this->firstOrMake(ChurchLeadership::class, ['first_name' => $first, 'last_name' => $last, 'title' => $title], [
                'slug' => $this->slug(ChurchLeadership::class, "{$first} {$last}"),
                'leadership_role' => $role->value,
                'bio' => $bio,
                'email' => strtolower("{$first}.{$last}@example.org"),
                'display_order' => $order + 1,
                'start_date' => now()->subYears(5 + $order)->toDateString(),
                'is_active' => true,
            ]);
        }
    }
}
