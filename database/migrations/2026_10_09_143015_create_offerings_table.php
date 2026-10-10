<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offerings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('member_name');
            $table->string('member_photo')->nullable();
            $table->string('offering_type')->default('Regular Offering');
            $table->decimal('amount', 12, 2);
            $table->string('payment_method')->default('cash');
            $table->foreignUuid('fund_id')->nullable()->constrained('finance_funds')->nullOnDelete();
            $table->string('fund_name')->default('General Fund');
            $table->string('reference_number')->nullable();
            $table->string('receipt_number')->nullable();
            $table->date('offering_date');
            $table->string('service_type')->default('Sunday Worship');
            $table->text('notes')->nullable();
            $table->string('recorded_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offerings');
    }
};
