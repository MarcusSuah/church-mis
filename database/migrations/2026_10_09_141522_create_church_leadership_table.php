<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('church_leadership', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique()->nullable();
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('title');
            $table->string('leadership_role')->default('other');
            $table->text('bio')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('office_location')->nullable();
            $table->date('ordination_date')->nullable();
            $table->date('start_date')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('leadership_role');
            $table->index('display_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('church_leadership');
    }
};
