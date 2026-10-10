<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('service_date');
            $table->string('service_name');
            $table->string('officiant')->nullable();
            $table->string('location')->nullable();
            $table->integer('attendance_count')->default(0);
            $table->string('elements_used')->nullable();
            $table->string('scripture_reference')->nullable();
            $table->text('notes')->nullable();
            $table->string('banner_image')->nullable();
            $table->timestamps();

            $table->index('service_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communions');
    }
};
