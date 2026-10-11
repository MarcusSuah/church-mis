<?php

namespace Database\Seeders;

use App\Models\Member;
use App\Models\PrayerRequest;

/** Sample prayer requests, including an anonymous and an urgent one. */
class PrayerRequestSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $member = fn (int $n) => Member::where('email', 'like', '%@example.org')->orderBy('member_id')->skip($n)->first();

        $requests = [
            ['Healing for my mother', 'My mother is in hospital after an operation. Please pray for her full recovery.', 'Health & Healing', false, true, 'Active', 0],
            ['Guidance in my studies', 'I am writing my final university exams next month. Pray for wisdom and peace.', 'Spiritual Growth', false, false, 'Active', 2],
            ['Employment', 'I have been looking for work for six months. Please pray for an open door.', 'Employment', false, false, 'Active', 4],
            ['Family reconciliation', 'Pray for peace and forgiveness in my family.', 'Marriage & Family', true, false, 'Active', 6],
            ['Safe travel', 'Thank you for praying for my journey to Ganta — I arrived safely!', 'General', false, false, 'Answered', 8],
        ];

        foreach ($requests as [$subject, $details, $category, $anonymous, $urgent, $status, $n]) {
            $requester = $member($n);
            $this->firstOrMake(PrayerRequest::class, ['subject' => $subject], [
                'requester_name' => $anonymous ? 'Anonymous' : ($requester?->full_name ?? 'Church member'),
                'requester_member_id' => $requester?->id,
                'request_details' => $details,
                'category' => $category,
                'is_anonymous' => $anonymous,
                'is_urgent' => $urgent,
                'is_private' => false,
                'status' => $status,
                'assigned_to' => 'Prayer Ministry',
                'prayer_count' => 12 + $n,
                'resolved_at' => $status === 'Answered' ? now()->subDays(2) : null,
            ]);
        }
    }
}
