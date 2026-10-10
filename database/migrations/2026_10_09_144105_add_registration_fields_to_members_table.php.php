<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            if (! Schema::hasColumn('members', 'nationality')) {
                $table->string('nationality', 100)->nullable()->after('marital_status');
            }
            if (! Schema::hasColumn('members', 'family')) {
                // { spouse_name, spouse_is_member, children: [{ name, date_of_birth }] }
                $table->json('family')->nullable()->after('emergency_relation');
            }
            if (! Schema::hasColumn('members', 'skills')) {
                $table->text('skills')->nullable()->after('family');
            }
            if (! Schema::hasColumn('members', 'interests')) {
                $table->string('interests')->nullable()->after('skills');
            }
            if (! Schema::hasColumn('members', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
       Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['nationality', 'family', 'skills', 'interests', 'reviewed_at']);
        });
    }
};
