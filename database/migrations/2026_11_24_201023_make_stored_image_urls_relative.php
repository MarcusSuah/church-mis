<?php

use App\Support\PublicFile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Uploaded images used to be saved with the host they were uploaded from
 * ("http://localhost:8000/storage/…", "https://live-site/storage/…"), so each
 * one showed only on that host. This rewrites every such value to the
 * root-relative "/storage/…" form (App\Support\PublicFile), which works on
 * any host. Only values of exactly that shape are touched; external image
 * URLs are left alone.
 */
return new class extends Migration
{
    /** Columns that can hold an uploaded image URL ("value" covers key/value settings, e.g. the church logo). */
    private const COLUMN_PATTERN = '/(photo|image|banner|thumbnail|logo|avatar|cover)|^value$/i';

    public function up(): void
    {
        // On MySQL getTables() also lists other databases on the server; only this app's tables are touched.
        $connection = DB::connection();
        $ownTables = collect(Schema::getTables())->filter(fn (array $t) => ! in_array($connection->getDriverName(), ['mysql', 'mariadb'], true)
            || ($t['schema'] ?? null) === $connection->getDatabaseName())
            ->pluck('name')->unique();

        foreach ($ownTables as $name) {
            foreach (Schema::getColumns($name) as $column) {
                if (! preg_match(self::COLUMN_PATTERN, $column['name']) || ! preg_match('/char|text/i', $column['type'])) {
                    continue;
                }

                DB::table($name)->where($column['name'], 'like', 'http%/storage/%')
                    ->distinct()->pluck($column['name'])
                    ->each(function (string $url) use ($name, $column) {
                        $relative = PublicFile::normalize($url);
                        if ($relative !== $url) {
                            DB::table($name)->where($column['name'], $url)->update([$column['name'] => $relative]);
                        }
                    });
            }
        }
    }

    /** The original hosts are not kept, and relative URLs keep working, so there is nothing to undo. */
    public function down(): void {}
};
