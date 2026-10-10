<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
    
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->boolean('present')->default(false)->after('attendance_status');
            $table->string('service_name')->nullable()->after('present');
            $table->date('service_date')->nullable()->after('service_name');
            $table->time('service_time')->nullable()->after('service_date');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn(['present', 'service_name', 'service_date', 'service_time']);
        });
    }
};
