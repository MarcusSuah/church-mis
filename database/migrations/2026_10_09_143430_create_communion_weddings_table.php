<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weddings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('groom_name');
            $table->string('bride_name');
            $table->foreignUuid('groom_member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->foreignUuid('bride_member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->date('wedding_date');
            $table->time('wedding_time')->nullable();
            $table->string('location')->nullable();
            $table->string('officiant')->nullable();
            $table->text('witnesses')->nullable();
            $table->string('reception_venue')->nullable();
            $table->string('certificate_number')->nullable();
            $table->boolean('certificate_issued')->default(false);
            $table->date('certificate_date')->nullable();
            $table->string('banner_image')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('wedding_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weddings');
    }
};
