<?php

namespace Database\Seeders;

use App\Models\Department;

/** Sample church departments. */
class DepartmentSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $departments = [
            ['Men Department', 'Fellowship, discipleship and service for the men of the church.', 'Men', 'Deacon Joseph Kollie', 'First Saturday, 4:00 PM'],
            ['Women Department', 'Prayer, Bible study and outreach led by the women of the church.', 'Women', 'Deaconess Martha Weah', 'Second Saturday, 3:00 PM'],
            ['Youth Department', 'Young people growing in faith through worship, teaching and service.', 'Youth', 'Bro. Emmanuel Toe', 'Fridays, 5:00 PM'],
            ['Children Department', 'Sunday School and children\'s church for ages 3 to 12.', 'Children', 'Sis. Grace Sirleaf', 'Sundays, 8:30 AM'],
            ['Music Department', 'Choir, praise team and instrumentalists who lead worship.', 'Praise & Worship', 'Bro. Samuel Doe', 'Thursdays, 6:00 PM'],
            ['Ushering Department', 'Welcoming worshippers and keeping services orderly.', 'Service', 'Bro. Peter Kamara', 'Last Saturday, 10:00 AM'],
            ['Evangelism Department', 'Sharing the gospel in the community and following up new believers.', 'Evangelism', 'Rev. Daniel Tubman', 'Wednesdays, 4:00 PM'],
            ['Senior Saints Department', 'Fellowship and care for the elders of the church.', 'Seniors', 'Deacon Moses Johnson', 'First Sunday after service'],
        ];

        foreach ($departments as [$name, $description, $category, $leader, $schedule]) {
            $this->firstOrMake(Department::class, ['name' => $name], [
                'slug' => $this->slug(Department::class, $name),
                'description' => $description,
                'category' => $category,
                'leader_name' => $leader,
                'meeting_schedule' => $schedule,
                'location' => 'Church Main Hall',
                'member_count' => 0,
                'is_active' => true,
            ]);
        }
    }
}
