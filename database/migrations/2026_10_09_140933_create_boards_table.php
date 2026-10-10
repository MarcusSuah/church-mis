<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('boards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->string('board_type')->default('Trustees');
            $table->foreignUuid('chairperson_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('chairperson_name')->nullable();
            $table->string('chairperson_photo')->nullable();
            $table->integer('member_count')->default(0);
            $table->string('meeting_schedule')->nullable();
            $table->string('location')->nullable();
            $table->string('contact_email')->nullable();
            $table->text('mandate')->nullable();
            $table->string('banner_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('boards');
    }
};
