<?php

namespace Database\Seeders;

use App\Models\Sermon;

/** Sample published sermons for the sermon archive. */
class SermonSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $sermons = [
            ['Walking by Faith', 'Rev. Samuel Kollie', 'Faith That Works', '2 Corinthians 5:7', 'Trusting God when we cannot see the way ahead.'],
            ['The Power of Prayer', 'Rev. Esther Kpoto', 'Life of Prayer', 'James 5:13-18', 'Why the prayer of a righteous person is powerful and effective.'],
            ['Called to Serve', 'Rev. Samuel Kollie', 'Faith That Works', 'Mark 10:42-45', 'Following Christ\'s example of humble service.'],
            ['Hope in Hard Times', 'Rev. Daniel Tubman', null, 'Romans 8:28-39', 'Nothing can separate us from the love of God in Christ.'],
            ['The Good Shepherd', 'Rev. Samuel Kollie', 'I Am', 'John 10:1-18', 'Jesus knows, leads and lays down His life for His sheep.'],
            ['Faithful Giving', 'Rev. Esther Kpoto', 'Stewardship', '2 Corinthians 9:6-15', 'Giving cheerfully as an act of worship.'],
            ['The Light of the World', 'Rev. Samuel Kollie', 'I Am', 'John 8:12', 'Living as children of light in a dark world.'],
            ['Unity in the Body', 'Rev. Daniel Tubman', null, 'Ephesians 4:1-16', 'Many members, one body, growing together in love.'],
        ];

        foreach ($sermons as $week => [$title, $speaker, $series, $scripture, $description]) {
            $this->firstOrMake(Sermon::class, ['title' => $title], [
                'slug' => $this->slug(Sermon::class, $title),
                'speaker_name' => $speaker,
                'series_name' => $series,
                'scripture_reference' => $scripture,
                'description' => $description,
                'sermon_date' => now()->previous('Sunday')->subWeeks($week)->toDateString(),
                'service_type' => 'Sunday Worship',
                'duration_minutes' => 40 + ($week * 3) % 15,
                'tags' => array_values(array_filter([$series ? strtolower($series) : null, 'sunday worship'])),
                'is_published' => true,
                'view_count' => 25 * (8 - $week),
            ]);
        }
    }
}
