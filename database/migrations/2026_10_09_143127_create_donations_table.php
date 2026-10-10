<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('donor_name');
            $table->string('donor_email')->nullable();
            $table->string('donor_phone')->nullable();
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->boolean('is_anonymous')->default(false);
            $table->decimal('amount', 12, 2);
            $table->string('payment_method')->default('cash');
            $table->foreignUuid('fund_id')->nullable()->constrained('finance_funds')->nullOnDelete();
            $table->string('fund_name')->default('General Fund');
            $table->string('purpose')->nullable();
            $table->string('reference_number')->nullable();
            $table->string('receipt_number')->nullable();
            $table->date('donation_date');
            $table->boolean('is_recurring')->default(false);
            $table->text('notes')->nullable();
            $table->string('recorded_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
