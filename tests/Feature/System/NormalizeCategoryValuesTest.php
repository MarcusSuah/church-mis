<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

test('stored categories the edit forms reject are mapped to accepted values', function () {
    $now = now();
    $row = fn (array $values) => ['id' => (string) Str::uuid(), 'created_at' => $now, 'updated_at' => $now, ...$values];
    DB::table('boards')->insert([
        $row(['name' => 'Board of Deacons', 'slug' => 'a', 'board_type' => 'Spiritual']),
        $row(['name' => 'Board X', 'slug' => 'b', 'board_type' => 'Something Odd']),
        $row(['name' => 'Board Y', 'slug' => 'c', 'board_type' => 'Trustees']),
    ]);
    DB::table('committees')->insert($row(['name' => 'Anniversary', 'slug' => 'd', 'committee_type' => 'Ad hoc']));

    (require database_path('migrations/2026_10_11_013249_normalize_category_values_on_church_records.php'))->up();

    expect(DB::table('boards')->pluck('board_type', 'name')->all())->toEqual(['Board of Deacons' => 'Deacons', 'Board X' => 'Other', 'Board Y' => 'Trustees'])
        ->and(DB::table('committees')->value('committee_type'))->toBe('Ad Hoc');
});
