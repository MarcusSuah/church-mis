<?php

namespace Database\Seeders;

use App\Models\Board;

/** Sample governing boards. */
class BoardSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $boards = [
            ['Board of Deacons', 'Deacons', 'Deacon Joseph Kollie', 'Assist the pastor in spiritual care, the Lord\'s Supper and the welfare of members.'],
            ['Board of Trustees', 'Trustees', 'Mr. Henry Mensah', 'Hold and care for church property, assets and legal matters.'],
            ['Finance Board', 'Finance', 'Mrs. Patience Johnson', 'Oversee budgets, giving records, expenses and financial reporting.'],
        ];

        foreach ($boards as [$name, $type, $chair, $mandate]) {
            $this->firstOrMake(Board::class, ['name' => $name], [
                'slug' => $this->slug(Board::class, $name),
                'board_type' => $type,
                'chairperson_name' => $chair,
                'description' => $mandate,
                'mandate' => $mandate,
                'meeting_schedule' => 'Monthly, first Monday, 6:00 PM',
                'location' => 'Church Conference Room',
                'member_count' => 0,
                'is_active' => true,
            ]);
        }
    }
}
