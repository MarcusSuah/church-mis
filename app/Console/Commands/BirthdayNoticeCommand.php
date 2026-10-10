<?php

namespace App\Console\Commands;

use App\Support\Birthdays;
use Illuminate\Console\Command;

class BirthdayNoticeCommand extends Command
{
    protected $signature = 'members:birthdays {--force : Send even if today\'s notice already went out}';

    protected $description = "Notify staff about today's member birthdays";

    public function handle(): int
    {
        $n = Birthdays::notifyStaff((bool) $this->option('force'));
        $this->info($n ? "Notified staff about {$n} birthday(s)." : 'No birthday notice sent (none today, already sent, or turned off).');

        return self::SUCCESS;
    }
}
