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
        Schema::create('prayer_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('requester_name');
            $table->uuid('requester_member_id')->nullable();
            $table->string('subject');
            $table->text('request_details');
            $table->string('category')->default('General');
            $table->boolean('is_anonymous')->default(false);
            $table->boolean('is_urgent')->default(false);
            $table->string('status')->default('Active');
            $table->string('assigned_to')->nullable();
            $table->uuid('assigned_pastor_id')->nullable();
            $table->integer('prayer_count')->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prayer_requests');
    }
};
