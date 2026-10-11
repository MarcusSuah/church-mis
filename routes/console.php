<?php

use App\Models\UserActivity;
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

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Remove activity-log rows older than config('church.activity_retention_days').
Schedule::command('model:prune', ['--model' => [UserActivity::class]])->daily();

// Phase 4: delete API tokens that expired more than a day ago.
Schedule::command('sanctum:prune-expired', ['--hours' => 24])->daily();
