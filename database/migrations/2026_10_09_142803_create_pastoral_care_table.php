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
       Schema::create('pastoral_care', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('member_name');
            $table->uuid('member_id')->nullable();
            $table->string('care_type');
            $table->text('description');
            $table->string('assigned_pastor')->nullable();
            $table->uuid('assigned_pastor_id')->nullable();
            $table->string('status')->default('Open');
            $table->string('priority')->default('Normal');
            $table->date('visit_date')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->text('outcome')->nullable();
            $table->boolean('is_confidential')->default(true);
            $table->timestamps();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pastoral_care');
    }
};
