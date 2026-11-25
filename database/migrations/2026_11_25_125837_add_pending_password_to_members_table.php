<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The (hashed) password a member chose on the public registration form.
     * It is moved onto their login when staff approve them, then cleared.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('pending_password')->nullable()->after('reg_ref');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('pending_password');
        });
    }
};
