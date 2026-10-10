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
       Schema::create('sermons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->string('title', 200);
            $table->string('speaker_name', 150);
            $table->string('speaker_photo',500)->nullable();
            $table->string('series_name', 200)->nullable();
            $table->string('scripture_reference', 200)->nullable();
            $table->text('description')->nullable();
            $table->date('sermon_date');
            $table->string('service_type', 100)->default('Sunday Worship');
            $table->string('audio_url', 500)->nullable();
            $table->string('video_url', 500)->nullable();
            $table->string('notes_url', 500)->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->json('tags')->nullable();
            $table->boolean('is_published')->default(true);
            $table->unsignedInteger('view_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('sermon_date');
            $table->index('speaker_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sermons');
    }
};
