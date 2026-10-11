<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Loads a complete set of sample church data for demos and training:
 *
 *   php artisan db:seed --class=DemoDataSeeder
 *
 * Each seeder skips records that already exist, and none of them run in
 * production (see DemoSeeder).
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            DepartmentSeeder::class,
            MinistrySeeder::class,
            BoardSeeder::class,
            CommitteeSeeder::class,
            LeadershipSeeder::class,
            MemberSeeder::class,
            BoardMemberSeeder::class,   // needs members, so after MemberSeeder
            EventSeeder::class,
            SermonSeeder::class,
            AnnouncementSeeder::class,
            GivingSeeder::class,
            ExpenseBudgetSeeder::class,
            PrayerRequestSeeder::class,
            AttendanceSeeder::class,
        ]);
    }
}
