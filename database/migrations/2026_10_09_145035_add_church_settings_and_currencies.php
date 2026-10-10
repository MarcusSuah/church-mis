<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * - church_settings: editable church profile, default currency, LRD/USD rate.
 * - currency column on every money table, so a record can be in USD or LRD.
 * - member_messages: birthday / congratulation messages sent to members.
 */
return new class extends Migration
{
    private const MONEY_TABLES = ['tithes', 'offerings', 'donations', 'expenses', 'budgets', 'finance_funds'];

    public function up(): void
    {
        if (! Schema::hasTable('church_settings')) {
            Schema::create('church_settings', function (Blueprint $table) {
                $table->string('key', 80)->primary();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }

        $default = strtoupper((string) config('church.currency', 'USD'));
        $default = in_array($default, ['USD', 'LRD'], true) ? $default : 'USD';

        foreach (self::MONEY_TABLES as $t) {
            if (Schema::hasTable($t) && ! Schema::hasColumn($t, 'currency')) {
                Schema::table($t, fn (Blueprint $table) => $table->string('currency', 3)->default('USD')->after(
                    in_array($t, ['budgets'], true) ? 'allocated_amount' : (in_array($t, ['finance_funds'], true) ? 'target_amount' : 'amount')
                ));
                // Existing records were entered in the church's configured currency.
                DB::table($t)->update(['currency' => $default]);
            }
        }

        if (! Schema::hasTable('member_messages')) {
            Schema::create('member_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
                $table->string('member_name');
                $table->string('occasion', 60);
                $table->string('subject');
                $table->text('message');
                $table->json('channels')->nullable();          // ["in_app","email"]
                $table->string('email_status', 20)->nullable(); // sent / failed / no_email / skipped
                $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['member_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('member_messages');
        foreach (self::MONEY_TABLES as $t) {
            if (Schema::hasColumn($t, 'currency')) {
                Schema::table($t, fn (Blueprint $table) => $table->dropColumn('currency'));
            }
        }
        Schema::dropIfExists('church_settings');
    }
};
