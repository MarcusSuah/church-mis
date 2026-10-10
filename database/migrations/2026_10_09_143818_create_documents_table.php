<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->default('Other');
            $table->string('file_url')->nullable();
            $table->string('file_name')->nullable();
            $table->integer('file_size_kb')->nullable();
            $table->string('file_type')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->string('version')->default('1.0');
            $table->string('author_name')->nullable();
            $table->string('department')->nullable();
            $table->boolean('is_public')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->json('tags')->nullable();
            $table->integer('download_count')->default(0);
            $table->timestamps();

            $table->index('category');
            $table->index('is_archived');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
