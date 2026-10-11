<?php

namespace Database\Seeders;

use App\Models\Event;

/** Sample upcoming and past church events. */
class EventSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $events = [
            ['Harvest Thanksgiving Service', 'Special Service', 10, 'Upcoming', 'A joyful service of thanksgiving for God\'s provision through the year. Bring your harvest offering.'],
            ['Youth Revival Night', 'Revival', 17, 'Upcoming', 'An evening of worship, testimony and preaching for young people and their friends.'],
            ['Women\'s Prayer Breakfast', 'Fellowship', 24, 'Upcoming', 'Breakfast, prayer and encouragement for the women of the church and community.'],
            ['Community Health Outreach', 'Outreach', 31, 'Upcoming', 'Free health screening and gospel outreach in partnership with local nurses.'],
            ['Baptism Sunday', 'Baptism & Sacraments', 38, 'Upcoming', 'Believers who have completed baptism class will be baptized after morning worship.'],
            ['Church Anniversary Celebration', 'Celebration', 60, 'Upcoming', 'Celebrating God\'s faithfulness with a special service, fellowship meal and programme.'],
            ['Men\'s Fellowship Retreat', 'Retreat', -20, 'Completed', 'A weekend of teaching, prayer and fellowship for the men of the church.'],
            ['Vacation Bible School', 'Children Event', -45, 'Completed', 'A week of Bible stories, songs and crafts for children aged 4 to 12.'],
        ];

        foreach ($events as [$title, $type, $days, $status, $description]) {
            $start = now()->startOfDay()->addDays($days)->setTime($type === 'Revival' ? 18 : 10, 0);
            $this->firstOrMake(Event::class, ['title' => $title], [
                'slug' => $this->slug(Event::class, $title),
                'description' => $description,
                'event_type' => $type,
                'start_date' => $start,
                'end_date' => $start->copy()->addHours(3),
                'location' => 'Church Main Sanctuary',
                'organizer_name' => 'Church Office',
                'max_attendees' => 300,
                'registered_count' => $days < 0 ? 180 : 40,
                'is_public' => true,
                'status' => $status,
            ]);
        }
    }
}
