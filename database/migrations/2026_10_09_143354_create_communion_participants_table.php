<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communion_participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('communion_id')->nullable()->constrained('communions')->cascadeOnDelete();
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('member_name');
            $table->string('member_photo')->nullable();
            $table->timestamp('participated_at')->useCurrent();

            $table->index('communion_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communion_participants');
    }
};
