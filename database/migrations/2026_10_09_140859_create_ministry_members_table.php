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
       Schema::create('ministry_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ministry_id')->constrained('ministries')->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained('members')->cascadeOnDelete();
            $table->string('role')->default('Member');
            $table->timestamp('joined_at')->useCurrent();

            $table->unique(['ministry_id', 'member_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ministry_members');
    }
};
