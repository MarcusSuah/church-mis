<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('message');
            $table->string('notification_type')->default('info');
            $table->string('recipient_type')->default('all');
            $table->uuid('recipient_id')->nullable();
            $table->boolean('is_read')->default(false);
            $table->boolean('is_sent')->default(true);
            $table->timestamp('sent_at')->useCurrent();
            $table->string('created_by')->nullable();
            $table->string('link_url')->nullable();
            $table->timestamps();

            $table->index('is_read');
            $table->index('notification_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
