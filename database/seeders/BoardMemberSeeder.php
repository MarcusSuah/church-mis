<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\BoardMember;
use App\Models\Member;

/**
 * Sample members for each board, so "Board members" on the public
 * Leadership page has people to show. Runs after MemberSeeder.
 */
class BoardMemberSeeder extends DemoSeeder
{
    private const ROLES = ['Chairperson', 'Vice-Chairperson', 'Secretary', 'Treasurer', 'Member'];

    protected function seed(): void
    {
        $members = Member::where('status', 'Active')->orderBy('last_name')->orderBy('first_name')->limit(15)->pluck('id');
        if ($members->isEmpty()) {
            return;
        }

        foreach (Board::orderBy('name')->get() as $index => $board) {
            if ($board->memberships()->exists()) {
                continue;
            }

            $picked = $members->slice(($index * 5) % max(1, $members->count()), count(self::ROLES))->values();
            foreach ($picked as $position => $memberId) {
                BoardMember::forceCreate([
                    'board_id' => $board->id,
                    'member_id' => $memberId,
                    'role' => self::ROLES[$position],
                    'term_start' => now()->subYear()->startOfYear()->toDateString(),
                    'joined_at' => now()->subYear(),
                ]);
            }

            $board->forceFill(['member_count' => $picked->count()])->saveQuietly();
        }
    }
}
