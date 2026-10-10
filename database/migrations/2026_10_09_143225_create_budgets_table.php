<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('category');
            $table->text('description')->nullable();
            $table->string('period')->default('annual');
            $table->integer('fiscal_year')->default(2026);
            $table->decimal('allocated_amount', 12, 2);
            $table->decimal('spent_amount', 12, 2)->default(0);
            $table->foreignUuid('fund_id')->nullable()->constrained('finance_funds')->nullOnDelete();
            $table->string('fund_name')->default('General Fund');
            $table->string('icon')->default('BanknotesIcon');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
