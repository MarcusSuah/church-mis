<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('committee_members', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('committee_id')->constrained('committees')->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained('members')->cascadeOnDelete();
            $table->string('role')->default('Member');
            $table->timestamp('joined_at')->useCurrent();

            $table->unique(['committee_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('committee_members');
    }
};
