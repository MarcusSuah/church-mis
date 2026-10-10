<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('activity_type')->default('meeting');
            $table->timestamp('activity_date');
            $table->string('location')->nullable();
            $table->integer('attendees_count')->default(0);
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_activities');
    }
};
