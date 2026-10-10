<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The original members migration only created 9 columns, but the Member
 * model, the form requests and the React form all use ~30. Every create or
 * update therefore failed with "Unknown column 'middle_name'...".
 *
 * Written as an additive migration (with hasColumn guards) so it is safe to
 * run on a database where the first members migration already ran.
 */
return new class extends Migration
{
    public function up(): void
    {
       Schema::table('members', function (Blueprint $table) {
            $table->string('slug')->unique()->nullable()->after('id');
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('gender')->nullable()->after('last_name');
            $table->date('date_of_birth')->nullable()->after('gender');
            $table->string('marital_status')->nullable()->after('date_of_birth');
            $table->string('alt_phone')->nullable()->after('phone');
            $table->string('address')->nullable()->after('alt_phone');
            $table->string('city')->nullable()->after('address');
            $table->string('state')->nullable()->after('city');
            $table->string('country')->nullable()->after('state');
            $table->string('membership_type')->default('Regular Member')->after('country');
            $table->date('date_joined')->nullable()->after('membership_type');
            $table->string('ministry')->nullable()->after('department');
            $table->boolean('baptized')->default(false)->after('ministry');
            $table->date('baptism_date')->nullable()->after('baptized');
            $table->boolean('communion_participant')->default(false)->after('baptism_date');
            $table->string('previous_church')->nullable()->after('communion_participant');
            $table->string('previous_denomination')->nullable()->after('previous_church');
            $table->string('occupation')->nullable()->after('previous_denomination');
            $table->string('employer')->nullable()->after('occupation');
            $table->string('emergency_name')->nullable()->after('employer');
            $table->string('emergency_phone')->nullable()->after('emergency_name');
            $table->string('emergency_relation')->nullable()->after('emergency_phone');
            $table->text('notes')->nullable()->after('emergency_relation');
            $table->string('reg_ref')->nullable()->after('notes');

            $table->index('gender');
            $table->index('membership_type');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            if (Schema::hasColumn('members', 'user_id')) {
                $table->dropConstrainedForeignId('user_id');
            }
            $table->dropColumn([
                'middle_name', 'gender', 'date_of_birth', 'marital_status', 'alt_phone',
                'address', 'city', 'state', 'country', 'ministry', 'membership_type',
                'date_joined', 'baptized', 'baptism_date', 'communion_participant',
                'previous_church', 'previous_denomination', 'occupation', 'employer',
                'emergency_name', 'emergency_phone', 'emergency_relation', 'notes', 'reg_ref',
            ]);
        });
    }
};
