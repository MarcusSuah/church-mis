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
        Schema::create('announcements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->string('title');
            $table->text('content');
            $table->string('category')->default('General');
            $table->string('priority')->default('Normal');
            $table->string('author_name')->nullable();
            $table->string('banner_url')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_published')->default(true);
            $table->string('target_audience')->default('All Members');
            $table->timestamps();

            $table->index('is_published');
            $table->index('is_pinned');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
