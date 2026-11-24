<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_signatures', function (Blueprint $table) {
            $table->id();
            $table->string('report_type', 50);
            $table->date('period_from');
            $table->date('period_to');
            $table->string('position', 50);
            // Keep the signature if the user account is later removed; name is snapshotted.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('signer_name');
            $table->string('signature_path');
            // sha256 of the report figures at signing time, used to flag later changes.
            $table->string('data_hash', 64);
            $table->timestamp('signed_at');
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->unique(['report_type', 'period_from', 'period_to', 'position'], 'report_signatures_slot_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_signatures');
    }
};
