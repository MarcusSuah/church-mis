<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Fills the `slug` column (unique, created with each table but never set)
 * for every existing row. New rows get their slug from the HasSlug trait.
 *
 * Slugs are generated in memory per table and written in batches with one
 * UPDATE ... CASE statement each, so large tables (members) finish quickly.
 */
return new class extends Migration
{
    /** @var array<string, list<string>> table => columns the slug is built from */
    private const SOURCES = [
        'announcements' => ['title'],
        'boards' => ['name'],
        'church_leadership' => ['first_name', 'last_name'],
        'committees' => ['name'],
        'departments' => ['name'],
        'documents' => ['title'],
        'events' => ['title'],
        'members' => ['first_name', 'last_name'],
        'ministries' => ['name'],
        'sermons' => ['title'],
    ];

    private const BATCH = 500;

    public function up(): void
    {
        foreach (self::SOURCES as $table => $columns) {
            $this->backfill($table, $columns);
        }
    }

    public function down(): void
    {
        // Slugs are additive; the columns existed before this migration.
    }

    /** @param  list<string>  $columns */
    private function backfill(string $table, array $columns): void
    {
        $taken = array_fill_keys(DB::table($table)->whereNotNull('slug')->pluck('slug')->all(), true);
        $fallback = Str::singular(Str::slug($table));

        DB::table($table)->whereNull('slug')->select(['id', ...$columns])->orderBy('id')
            ->chunkById(self::BATCH, function ($rows) use ($table, $columns, &$taken, $fallback) {
                $slugs = [];
                foreach ($rows as $row) {
                    $source = trim(implode(' ', array_map(fn ($c) => (string) $row->{$c}, $columns)));
                    $base = Str::limit(Str::slug($source), 180, '') ?: $fallback;
                    $slug = $base;
                    for ($n = 2; isset($taken[$slug]); $n++) {
                        $slug = "{$base}-{$n}";
                    }
                    $taken[$slug] = true;
                    $slugs[$row->id] = $slug;
                }

                $cases = implode(' ', array_fill(0, count($slugs), 'WHEN ? THEN ?'));
                $bindings = [];
                foreach ($slugs as $id => $slug) {
                    array_push($bindings, $id, $slug);
                }
                $placeholders = implode(',', array_fill(0, count($slugs), '?'));

                DB::update(
                    "UPDATE {$table} SET slug = CASE id {$cases} END WHERE id IN ({$placeholders})",
                    [...$bindings, ...array_keys($slugs)],
                );
            });
    }
};
