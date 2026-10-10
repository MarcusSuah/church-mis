<?php

namespace App\Console\Commands;

use App\Models\Member;
use Illuminate\Console\Command;

/**
 * Lists member records that share an email address (Phase 3, F12).
 * The unique index on members.email is only added once there are none.
 *
 *   php artisan members:duplicates              # list them
 *   php artisan members:duplicates --add-index  # add the unique index once there are none
 */
class MemberDuplicatesCommand extends Command
{
    protected $signature = 'members:duplicates {--add-index : Add the unique index on members.email when there are no duplicates}';

    protected $description = 'List members that share an email address';

    public function handle(): int
    {
        $emails = Member::query()->whereNotNull('email')->where('email', '!=', '')
            ->select('email')->groupBy('email')->havingRaw('count(*) > 1')->pluck('email');

        if ($emails->isEmpty()) {
            $this->info('No duplicate member emails.');
            $hasIndex = collect(\Illuminate\Support\Facades\Schema::getIndexes('members'))->contains(fn ($i) => $i['name'] === 'members_email_unique');
            if ($this->option('add-index') && ! $hasIndex) {
                Member::query()->where('email', '')->update(['email' => null]);
                $plain = collect(\Illuminate\Support\Facades\Schema::getIndexes('members'))->contains(fn ($i) => $i['name'] === 'members_email_index');
                \Illuminate\Support\Facades\Schema::table('members', function ($t) use ($plain) {
                    $t->unique('email', 'members_email_unique');
                    if ($plain) {
                        $t->dropIndex('members_email_index');   // the unique index replaces it
                    }
                });
                $this->info('Unique index members_email_unique added.');
            } elseif (! $hasIndex) {
                $this->line('Run again with --add-index to enforce unique member emails in the database.');
            }

            return self::SUCCESS;
        }

        $rows = Member::whereIn('email', $emails)->orderBy('email')->orderBy('created_at')
            ->get(['email', 'member_id', 'reg_ref', 'first_name', 'last_name', 'status', 'created_at'])
            ->map(fn (Member $m) => [$m->email, $m->member_id ?: $m->reg_ref, $m->full_name, $m->status, $m->created_at?->toDateString()]);

        $this->table(['Email', 'Member ID / Ref', 'Name', 'Status', 'Created'], $rows);
        $this->warn("{$emails->count()} email(s) are shared. Merge or correct these records, then run: php artisan members:duplicates --add-index");

        return self::FAILURE;
    }
}
