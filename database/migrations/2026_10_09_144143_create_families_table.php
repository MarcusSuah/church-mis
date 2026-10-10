<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('families', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('family_name', 150);
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('status', 20)->default('Active'); // Active, Inactive
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('family_name');
        });

        // A household member is either a linked church member (member_id) or
        // someone who isn't a member yet — usually a child (name only).
        Schema::create('family_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('family_id')->constrained('families')->cascadeOnDelete();
            $table->foreignUuid('member_id')->nullable()->unique()->constrained('members')->nullOnDelete();
            $table->string('name', 150)->nullable();
            $table->string('role', 30); // Head of Household, Spouse, Child, Dependent, Relative
            $table->date('date_of_birth')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
            $table->index(['family_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_members');
        Schema::dropIfExists('families');
    }
};
