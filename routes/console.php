<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily birthday notice for staff (the dashboard only falls back to it when the scheduler is not running).
Schedule::command('members:birthdays')->dailyAt('07:00');

// Remove API tokens that expired more than a day ago.
Schedule::command('sanctum:prune-expired --hours=24')->daily();
