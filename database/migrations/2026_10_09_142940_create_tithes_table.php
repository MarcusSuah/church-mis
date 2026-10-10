<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tithes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('member_name');
            $table->string('member_photo')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method')->default('cash');
            $table->foreignUuid('fund_id')->nullable()->constrained('finance_funds')->nullOnDelete();
            $table->string('fund_name')->default('General Fund');
            $table->string('reference_number')->nullable();
            $table->string('receipt_number')->nullable();
            $table->date('tithe_date');
            $table->text('notes')->nullable();
            $table->string('recorded_by')->nullable();
            $table->timestamps();

            $table->index('member_id');
            $table->index('tithe_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tithes');
    }
};
