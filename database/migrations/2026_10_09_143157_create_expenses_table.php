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
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->default('other');
            $table->decimal('amount', 12, 2);
            $table->string('payment_method')->default('check');
            $table->foreignUuid('fund_id')->nullable()->constrained('finance_funds')->nullOnDelete();
            $table->string('fund_name')->default('General Fund');
            $table->string('vendor_name')->nullable();
            $table->string('reference_number')->nullable();
            $table->string('receipt_url')->nullable();
            $table->date('expense_date');
            $table->string('approved_by')->nullable();
            $table->string('paid_by')->nullable();
            $table->string('status')->default('Paid');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
