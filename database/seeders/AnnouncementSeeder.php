<?php

namespace Database\Seeders;

use App\Models\Announcement;

/** Sample church announcements. */
class AnnouncementSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $announcements = [
            ['Baptism class begins next Sunday', 'Anyone who wishes to be baptized should register with the church office. Classes run for four Sundays after morning worship.', 'Sacraments', 'High', true],
            ['Building fund update', 'Thank you for your faithful giving. The roof of the new sanctuary is complete; work on the windows begins this month.', 'Finance', 'Normal', false],
            ['Choir auditions', 'The choir welcomes new voices. Auditions are on Thursday at 6:00 PM in the music room.', 'Ministry', 'Normal', false],
            ['Midweek Bible study moves online', 'Wednesday Bible study will also be streamed on the church\'s social media pages for those who cannot attend in person.', 'General', 'Normal', false],
            ['Welfare drive for flood victims', 'Please bring rice, oil, clothing and toiletries to the church office this week to support families affected by flooding.', 'Outreach', 'Urgent', true],
        ];

        foreach ($announcements as $n => [$title, $content, $category, $priority, $pinned]) {
            $this->firstOrMake(Announcement::class, ['title' => $title], [
                'slug' => $this->slug(Announcement::class, $title),
                'content' => $content,
                'category' => $category,
                'priority' => $priority,
                'author_name' => 'Church Office',
                'start_date' => now()->subDays($n * 3)->toDateString(),
                'end_date' => now()->addDays(30)->toDateString(),
                'is_pinned' => $pinned,
                'is_published' => true,
                'target_audience' => 'All Members',
            ]);
        }
    }
}
