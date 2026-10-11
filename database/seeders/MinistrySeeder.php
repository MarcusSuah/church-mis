<?php

namespace Database\Seeders;

use App\Enums\MinistryCategory;
use App\Models\Ministry;

/** Sample ministries of the church. */
class MinistrySeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $ministries = [
            ['Choir', MinistryCategory::Worship, 'Leading the congregation in worship through song.', 'Bro. Samuel Doe', 'Thursdays, 6:00 PM'],
            ['Praise Team', MinistryCategory::Worship, 'Contemporary praise and worship for Sunday services.', 'Sis. Comfort Flomo', 'Saturdays, 4:00 PM'],
            ['Prayer Ministry', MinistryCategory::Prayer, 'Interceding for the church, its members and the nation.', 'Deaconess Martha Weah', 'Fridays, 6:00 PM'],
            ['Missions & Outreach', MinistryCategory::Missions, 'Church planting, village outreach and missionary support.', 'Rev. Daniel Tubman', 'Monthly planning meeting'],
            ['Youth Ministry', MinistryCategory::Youth, 'Discipleship, fellowship and leadership training for young people.', 'Bro. Emmanuel Toe', 'Fridays, 5:00 PM'],
            ['Sunday School', MinistryCategory::Education, 'Bible teaching for children, youth and adults before worship.', 'Sis. Grace Sirleaf', 'Sundays, 8:30 AM'],
            ['Benevolence Ministry', MinistryCategory::Welfare, 'Practical help for the sick, the bereaved and families in need.', 'Deacon Moses Johnson', 'As needed'],
            ['Hospital & Home Visitation', MinistryCategory::Care, 'Visiting the sick and shut-in with prayer and encouragement.', 'Rev. Esther Kpoto', 'Tuesdays, 2:00 PM'],
        ];

        foreach ($ministries as [$name, $category, $description, $leader, $schedule]) {
            $this->firstOrMake(Ministry::class, ['name' => $name], [
                'slug' => $this->slug(Ministry::class, $name),
                'category' => $category->value,
                'description' => $description,
                'leader_name' => $leader,
                'meeting_schedule' => $schedule,
                'location' => 'Church Main Hall',
                'member_count' => 0,
                'is_active' => true,
            ]);
        }
    }
}
