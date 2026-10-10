<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('baptisms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('candidate_name');
            $table->string('candidate_photo')->nullable();
            $table->date('baptism_date');
            $table->string('baptism_type')->default('immersion');
            $table->string('officiant')->nullable();
            $table->string('location')->nullable();
            $table->text('witnesses')->nullable();
            $table->string('certificate_number')->nullable();
            $table->boolean('certificate_issued')->default(false);
            $table->date('certificate_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('baptism_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('baptisms');
    }
};
