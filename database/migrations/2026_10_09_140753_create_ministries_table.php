<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ministries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->string('category')->default('other');
            $table->foreignUuid('leader_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('leader_name')->nullable();
            $table->string('leader_photo')->nullable();
            $table->integer('member_count')->default(0);
            $table->string('meeting_schedule')->nullable();
            $table->string('location')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('banner_url')->nullable();
            $table->text('vision')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ministries');
    }
};
