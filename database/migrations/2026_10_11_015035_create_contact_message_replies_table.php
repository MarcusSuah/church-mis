<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every reply to a website contact message is kept as its own row, so a
 * second reply no longer overwrites the first: the whole conversation stays
 * on record. Replies are never edited or deleted from the app.
 *
 * Contact messages are soft-deleted: "Delete" hides a message from the
 * inbox but keeps it, and its replies, for the record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_message_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_message_id')->constrained('contact_messages')->cascadeOnDelete();
            $table->text('body');
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            // Kept as text too, so the record still says who replied if the account is removed.
            $table->string('sent_by_name', 150);
            $table->string('sent_to', 190);
            $table->boolean('email_sent')->default(false);
            $table->timestamps();

            $table->index(['contact_message_id', 'created_at']);
        });

        Schema::table('contact_messages', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Keep the replies saved before this table existed.
        $users = DB::table('users')->pluck('name', 'id');
        DB::table('contact_messages')->whereNotNull('response')->orderBy('id')->each(function (object $m) use ($users) {
            DB::table('contact_message_replies')->insert([
                'contact_message_id' => $m->id,
                'body' => $m->response,
                'sent_by' => $m->responded_by,
                'sent_by_name' => $users[$m->responded_by] ?? 'Church office',
                'sent_to' => $m->email,
                'email_sent' => true,
                'created_at' => $m->responded_at ?? $m->updated_at,
                'updated_at' => $m->responded_at ?? $m->updated_at,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::dropIfExists('contact_message_replies');
    }
};
