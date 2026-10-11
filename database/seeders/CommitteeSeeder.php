<?php

namespace Database\Seeders;

use App\Models\Committee;

/** Sample standing committees. */
class CommitteeSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $committees = [
            ['Building Committee', 'Standing', 'Engr. Alexander Weah', 'Plan and supervise the new sanctuary and repairs to church property.'],
            ['Welfare Committee', 'Standing', 'Deaconess Martha Weah', 'Coordinate support for members facing sickness, bereavement or hardship.'],
            ['Anniversary Planning Committee', 'Ad Hoc', 'Mrs. Patience Johnson', 'Organise the church\'s anniversary programme and thanksgiving service.'],
            ['Education Committee', 'Standing', 'Sis. Grace Sirleaf', 'Oversee Sunday School curriculum, scholarships and teacher training.'],
        ];

        foreach ($committees as [$name, $type, $chair, $objectives]) {
            $this->firstOrMake(Committee::class, ['name' => $name], [
                'slug' => $this->slug(Committee::class, $name),
                'committee_type' => $type,
                'chairperson_name' => $chair,
                'description' => $objectives,
                'objectives' => $objectives,
                'meeting_schedule' => 'Every second Tuesday, 5:30 PM',
                'location' => 'Church Conference Room',
                'member_count' => 0,
                'is_active' => true,
            ]);
        }
    }
}
