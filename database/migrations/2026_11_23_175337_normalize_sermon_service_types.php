<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sermons')
            ->where('service_type', 'Sunday Worship')
            ->update([
                'service_type' => 'sunday_worship',
            ]);

        DB::table('sermons')
            ->where('service_type', 'Bible Study')
            ->update([
                'service_type' => 'bible_study',
            ]);

        DB::table('sermons')
            ->where('service_type', 'Prayer Meeting')
            ->update([
                'service_type' => 'prayer_meeting',
            ]);

        DB::table('sermons')
            ->where('service_type', 'Special Service')
            ->update([
                'service_type' => 'special_service',
            ]);

        DB::table('sermons')
            ->where('service_type', 'Youth Service')
            ->update([
                'service_type' => 'youth_service',
            ]);
    }

    public function down(): void
    {
        DB::table('sermons')
            ->where('service_type', 'sunday_worship')
            ->update([
                'service_type' => 'Sunday Worship',
            ]);

        DB::table('sermons')
            ->where('service_type', 'bible_study')
            ->update([
                'service_type' => 'Bible Study',
            ]);

        DB::table('sermons')
            ->where('service_type', 'prayer_meeting')
            ->update([
                'service_type' => 'Prayer Meeting',
            ]);

        DB::table('sermons')
            ->where('service_type', 'special_service')
            ->update([
                'service_type' => 'Special Service',
            ]);

        DB::table('sermons')
            ->where('service_type', 'youth_service')
            ->update([
                'service_type' => 'Youth Service',
            ]);
    }
};