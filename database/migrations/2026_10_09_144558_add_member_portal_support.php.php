<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Columns/tables the Member Portal, prayer requests and notifications need.
 * Every step is guarded so it is safe on a database that already has some
 * of these pieces.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Prayer requests: private flag, a response the member can read, and who logged it.
        Schema::table('prayer_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('prayer_requests', 'is_private')) {
                $table->boolean('is_private')->default(false)->after('is_urgent');
            }
            if (! Schema::hasColumn('prayer_requests', 'response')) {
                $table->text('response')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('prayer_requests', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('resolved_at')->constrained('users')->nullOnDelete();
            }
        });

        // Documents a member asks the church office for.
        if (! Schema::hasTable('document_requests')) {
            Schema::create('document_requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('member_id')->constrained('members')->cascadeOnDelete();
                $table->string('document_type', 100);
                $table->text('notes')->nullable();
                $table->string('status', 20)->default('Pending'); // Pending, Ready, Collected, Rejected
                $table->string('file_path')->nullable();
                $table->text('staff_note')->nullable();
                $table->timestamps();
                $table->index(['member_id', 'status']);
            });
        }

        // Read state per user (notifications.is_read can't express "read by me").
        if (! Schema::hasTable('notification_reads')) {
            Schema::create('notification_reads', function (Blueprint $table) {
                $table->foreignUuid('notification_id')->constrained('notifications')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('read_at')->useCurrent();
                $table->primary(['notification_id', 'user_id']);
            });
        }

        // Notifications can target one member (system messages) or a role.
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('recipient_id', 64)->nullable()->change();
            $table->index(['recipient_type', 'recipient_id']);
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['recipient_type', 'recipient_id']);
        });
        Schema::dropIfExists('notification_reads');
        Schema::dropIfExists('document_requests');
        Schema::table('prayer_requests', function (Blueprint $table) {
            if (Schema::hasColumn('prayer_requests', 'created_by')) {
                $table->dropConstrainedForeignId('created_by');
            }
            $table->dropColumn(array_filter(['is_private', 'response'], fn ($c) => Schema::hasColumn('prayer_requests', $c)));
        });
    }
};
