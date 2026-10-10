<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Keeps the denormalized `member_count` counter columns on departments,
 * ministries, boards, and committees in sync no matter how pivot rows are
 * written — Eloquent::create(), attach()/detach()/sync(), or a raw insert.
 *
 * This mirrors the trigger-based approach the original Supabase/Postgres
 * schema used for the same columns. Eloquent model events alone can't do
 * this reliably because belongsToMany::attach()/detach()/sync() perform
 * raw bulk queries that bypass model events entirely.
 */
return new class extends Migration
{
    private array $tables = [
        ['pivot' => 'department_members', 'parent' => 'departments', 'fk' => 'department_id'],
        ['pivot' => 'ministry_members', 'parent' => 'ministries', 'fk' => 'ministry_id'],
        ['pivot' => 'board_members', 'parent' => 'boards', 'fk' => 'board_id'],
        ['pivot' => 'committee_members', 'parent' => 'committees', 'fk' => 'committee_id'],
    ];

    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            // SQLite/other local drivers: skip. Production target is MySQL,
            // and the Eloquent-level booted() hooks already cover the
            // common create()/delete() path for local dev/testing.
            return;
        }

        foreach ($this->tables as $t) {
            DB::unprepared("
                CREATE TRIGGER trg_{$t['pivot']}_count_ins
                AFTER INSERT ON {$t['pivot']}
                FOR EACH ROW
                UPDATE {$t['parent']} SET member_count = member_count + 1 WHERE id = NEW.{$t['fk']};
            ");

            DB::unprepared("
                CREATE TRIGGER trg_{$t['pivot']}_count_del
                AFTER DELETE ON {$t['pivot']}
                FOR EACH ROW
                UPDATE {$t['parent']} SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.{$t['fk']};
            ");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        foreach ($this->tables as $t) {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_{$t['pivot']}_count_ins");
            DB::unprepared("DROP TRIGGER IF EXISTS trg_{$t['pivot']}_count_del");
        }
    }
};
