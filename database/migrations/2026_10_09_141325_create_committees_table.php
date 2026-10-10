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
         Schema::create('committees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->string('committee_type')->default('Standing');
            $table->foreignUuid('chairperson_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('chairperson_name')->nullable();
            $table->string('chairperson_photo')->nullable();
            $table->integer('member_count')->default(0);
            $table->string('meeting_schedule')->nullable();
            $table->string('location')->nullable();
            $table->string('contact_email')->nullable();
            $table->text('objectives')->nullable();
            $table->string('banner_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('committees');
    }
};
