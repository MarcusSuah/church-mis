<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sunday Worship offerings record which service they came from
     * (App\Enums\ServiceSession: first_service / second_service), as sermons do.
     */
    public function up(): void
    {
        Schema::table('offerings', function (Blueprint $table) {
            $table->string('service_session', 50)->nullable()->after('service_type');
        });
    }

    public function down(): void
    {
        Schema::table('offerings', function (Blueprint $table) {
            $table->dropColumn('service_session');
        });
    }
};
