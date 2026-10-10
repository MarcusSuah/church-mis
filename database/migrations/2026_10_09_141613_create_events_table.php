<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('event_type', 100)->default('General');
            $table->timestamp('start_date');
            $table->timestamp('end_date')->nullable();
            $table->string('location', 200)->nullable();
            $table->string('address', 200)->nullable();
            $table->string('banner_url')->nullable();
            $table->string('organizer_name', 150)->nullable();
            $table->uuid('organizer_id')->nullable();
            $table->integer('max_attendees')->nullable();
            $table->integer('registered_count')->default(0);
            $table->boolean('is_public')->default(true);
            $table->string('status', 100)->default('Upcoming');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('start_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
