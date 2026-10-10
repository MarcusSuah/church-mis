<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Certificate template + message chosen by the admin.
        Schema::table('document_requests', function (Blueprint $t) {
            if (! Schema::hasColumn('document_requests', 'template')) {
                $t->string('template', 30)->nullable()->after('status');
                $t->text('custom_message')->nullable()->after('template');
            }
        });
        foreach (['baptisms', 'weddings'] as $table) {
            Schema::table($table, function (Blueprint $t) use ($table) {
                if (! Schema::hasColumn($table, 'certificate_template')) {
                    $t->string('certificate_template', 30)->nullable();
                    $t->text('certificate_message')->nullable();
                }
            });
        }

        // Basket / plate collections counted per service.
        Schema::table('offerings', function (Blueprint $t) {
            if (! Schema::hasColumn('offerings', 'is_collection')) {
                $t->boolean('is_collection')->default(false)->after('offering_type');
                $t->string('counted_by')->nullable();
                $t->string('verified_by')->nullable();
            }
        });
        // Existing anonymous plate offerings become collections.
        DB::table('offerings')->whereNull('member_id')->where('member_name', 'like', 'Congregation%')->update(['is_collection' => true]);

        // Show who did it by name, not only email.
        Schema::table('audit_logs', function (Blueprint $t) {
            if (! Schema::hasColumn('audit_logs', 'performed_by_name')) {
                $t->string('performed_by_name')->nullable()->after('performed_by');
            }
        });
        foreach (DB::table('users')->get(['email', 'name']) as $u) {
            DB::table('audit_logs')->where('performed_by', $u->email)->whereNull('performed_by_name')->update(['performed_by_name' => $u->name]);
        }
    }

    public function down(): void
    {
        Schema::table('audit_logs', fn (Blueprint $t) => $t->dropColumn('performed_by_name'));
        Schema::table('offerings', fn (Blueprint $t) => $t->dropColumn(['is_collection', 'counted_by', 'verified_by']));
        foreach (['baptisms', 'weddings'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn(['certificate_template', 'certificate_message']));
        }
        Schema::table('document_requests', fn (Blueprint $t) => $t->dropColumn(['template', 'custom_message']));
    }
};
