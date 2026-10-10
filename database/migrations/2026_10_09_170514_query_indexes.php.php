<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3, F12 / F17 — indexes that match the queries the app really runs.
 *
 * Each index names the query it serves. Confirm on production-sized data
 * with EXPLAIN (see docs in the Phase 3 report) before and after.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Member list: WHERE status = ? ORDER BY last_name, first_name.
        Schema::table('members', function (Blueprint $t) {
            $t->index(['status', 'last_name', 'first_name']);
        });

        // Blank values mean "none": store them as NULL so unique indexes allow many.
        DB::table('members')->where('reg_ref', '')->update(['reg_ref' => null]);
        DB::table('members')->where('email', '')->update(['email' => null]);

        // Registration references must be unique (F11). Rename any duplicates first.
        $this->renameDuplicates('members', 'reg_ref');
        Schema::table('members', fn (Blueprint $t) => $t->unique('reg_ref'));

        // Member emails should be unique, but existing data may disagree: only
        // enforce it when it is already true, otherwise log what to clean up.
        $dupes = DB::table('members')->whereNotNull('email')->where('email', '!=', '')
            ->select('email')->groupBy('email')->havingRaw('count(*) > 1')->pluck('email');
        if ($dupes->isEmpty()) {
            Schema::table('members', fn (Blueprint $t) => $t->unique('email', 'members_email_unique'));
        } else {
            // Still index it for portal linking and duplicate checks.
            Schema::table('members', fn (Blueprint $t) => $t->index('email'));
            Log::warning('members.email has duplicates; unique index NOT added. Run `php artisan members:duplicates`, fix them, then `php artisan members:duplicates --add-index`.', ['emails' => $dupes->take(50)->all()]);
        }

        // F17: word search on names and email (MySQL / MariaDB only).
        if ($this->isMysql()) {
            DB::statement('ALTER TABLE members ADD FULLTEXT members_search_fulltext (first_name, last_name, email)');
        }

        // Topbar bell on every page: WHERE is_sent AND recipient_type/recipient_id … ORDER BY sent_at.
        // A second index on (is_sent, sent_at) lets the bell read newest-first and stop after 8 rows.
        Schema::table('notifications', function (Blueprint $t) {
            $t->index(['is_sent', 'recipient_type', 'recipient_id', 'sent_at'], 'notifications_visible_index');
            $t->index(['is_sent', 'sent_at'], 'notifications_sent_index');
        });

        // Audit log page: filter by module, newest first; export by date range.
        Schema::table('audit_logs', function (Blueprint $t) {
            $t->index(['module', 'created_at']);
            $t->index('created_at');
        });

        // Prayer list ordering, and "my requests" in the member portal.
        Schema::table('prayer_requests', function (Blueprint $t) {
            $t->index(['status', 'is_urgent', 'created_at']);
            $t->index('requester_member_id');
        });

        // Activity log: WHERE event … ORDER BY created_at already indexed; add user list lookups.
        if (Schema::hasTable('user_activities')) {
            Schema::table('user_activities', fn (Blueprint $t) => $t->index(['email', 'event', 'created_at']));
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('user_activities')) {
            Schema::table('user_activities', fn (Blueprint $t) => $t->dropIndex(['email', 'event', 'created_at']));
        }
        Schema::table('prayer_requests', function (Blueprint $t) {
            $t->dropIndex(['status', 'is_urgent', 'created_at']);
            $t->dropIndex(['requester_member_id']);
        });
        Schema::table('audit_logs', function (Blueprint $t) {
            $t->dropIndex(['module', 'created_at']);
            $t->dropIndex(['created_at']);
        });
        Schema::table('notifications', function (Blueprint $t) {
            $t->dropIndex('notifications_visible_index');
            $t->dropIndex('notifications_sent_index');
        });
        if ($this->isMysql()) {
            DB::statement('ALTER TABLE members DROP INDEX members_search_fulltext');
        }
        $names = collect(Schema::getIndexes('members'))->pluck('name');
        Schema::table('members', function (Blueprint $t) use ($names) {
            if ($names->contains('members_email_unique')) {
                $t->dropUnique('members_email_unique');
            }
            if ($names->contains('members_email_index')) {
                $t->dropIndex(['email']);
            }
            $t->dropUnique(['reg_ref']);
            $t->dropIndex(['status', 'last_name', 'first_name']);
        });
    }

    private function renameDuplicates(string $table, string $column): void
    {
        $dupes = DB::table($table)->whereNotNull($column)->select($column)->groupBy($column)->havingRaw('count(*) > 1')->pluck($column);
        foreach ($dupes as $value) {
            $ids = DB::table($table)->where($column, $value)->orderBy('created_at')->orderBy('id')->pluck('id');
            foreach ($ids->slice(1)->values() as $i => $id) {
                DB::table($table)->where('id', $id)->update([$column => $value.'-D'.($i + 2)]);
                Log::warning("Duplicate {$table}.{$column} {$value} renamed", ['id' => $id]);
            }
        }
    }

    private function isMysql(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true);
    }
};
