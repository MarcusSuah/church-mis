<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('funerals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('deceased_name');
            $table->string('deceased_photo')->nullable();
            $table->date('date_of_death')->nullable();
            $table->date('funeral_date');
            $table->time('funeral_time')->nullable();
            $table->string('location')->nullable();
            $table->string('burial_location')->nullable();
            $table->string('officiant')->nullable();
            $table->string('eulogy_by')->nullable();
            $table->string('family_contact')->nullable();
            $table->string('family_phone')->nullable();
            $table->string('banner_image')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('funeral_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funerals');
    }
};
