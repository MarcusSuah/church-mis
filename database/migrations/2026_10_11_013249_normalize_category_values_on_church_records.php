<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The demo seeders stored categories and types that the edit forms do not
 * accept ("Spiritual" boards, "Ad hoc" committees, "All" announcement
 * audience…). Every save of those records failed validation, so changes such
 * as a new banner image never stuck. This maps each stored value to one the
 * form accepts: a known replacement first, then the same word in another
 * case, then the column's general value.
 *
 * The allowed lists are copied here (not read from the models) so this
 * migration keeps working when the lists change later.
 */
return new class extends Migration
{
    /** @var array<string, array{column: string, allowed: list<string>, map: array<string, string>, fallback: string}> */
    private const COLUMNS = [
        'departments' => [
            'column' => 'category',
            'allowed' => ['Praise & Worship', 'Administration', 'Ministry', 'Education', 'Communications', 'Service', 'Youth', 'Young Adults', 'Children', 'Community & Outreach', 'Choir', 'Evangelism', 'Hospitality', 'Media', 'Missions', 'Men', 'Women', 'Seniors', 'Prayer', 'Technical Support', 'Ushering', 'General', 'Other'],
            'map' => ['Worship' => 'Praise & Worship', 'Music' => 'Praise & Worship', 'Outreach' => 'Evangelism'],
            'fallback' => 'General',
        ],
        'ministries' => [
            'column' => 'category',
            'allowed' => ['worship', 'outreach', 'education', 'care', 'youth', 'men', 'women', 'seniors', 'missions', 'pastoral', 'finance', 'welfare', 'prayer', 'deacon', 'leadership', 'other'],
            'map' => [],
            'fallback' => 'other',
        ],
        'boards' => [
            'column' => 'board_type',
            'allowed' => ['Trustees', 'Deacons', 'Deaconesses', 'Elders', 'Advisory', 'Pastoral', 'Finance', 'Other'],
            'map' => ['Spiritual' => 'Deacons', 'Administrative' => 'Trustees', 'Financial' => 'Finance'],
            'fallback' => 'Other',
        ],
        'committees' => [
            'column' => 'committee_type',
            'allowed' => ['Standing', 'Ad Hoc', 'Special', 'Advisory', 'Task Force'],
            'map' => [],
            'fallback' => 'Special',
        ],
        'events' => [
            'column' => 'event_type',
            'allowed' => ['Sunday Worship', 'Special Service', 'Youth Event', 'Outreach', 'Retreat', 'Prayer Meeting', 'Children Event', 'Revival', 'Fellowship', 'Celebration', 'Baptism & Sacraments', 'General'],
            'map' => ['Service' => 'Special Service', 'Sacrament' => 'Baptism & Sacraments', 'Children' => 'Children Event', 'Youth' => 'Youth Event', 'Worship' => 'Sunday Worship'],
            'fallback' => 'General',
        ],
        'prayer_requests' => [
            'column' => 'category',
            'allowed' => ['General', 'Health & Healing', 'Financial', 'Marriage & Family', 'Spiritual Growth', 'Church & Ministry', 'Youth', 'Bereavement', 'Employment'],
            'map' => ['Health' => 'Health & Healing', 'Healing' => 'Health & Healing', 'Family' => 'Marriage & Family', 'Marriage' => 'Marriage & Family', 'Finance' => 'Financial', 'Provision' => 'Financial', 'Education' => 'Spiritual Growth', 'Spiritual' => 'Spiritual Growth', 'Ministry' => 'Church & Ministry', 'Job' => 'Employment'],
            'fallback' => 'General',
        ],
    ];

    /** Announcements have two such columns. */
    private const ANNOUNCEMENT_COLUMNS = [
        ['column' => 'category', 'allowed' => ['General', 'Service Update', 'Finance', 'Ministry', 'Bereavement', 'Membership', 'Outreach', 'Youth', 'Events', 'Sacraments'], 'map' => [], 'fallback' => 'General'],
        ['column' => 'target_audience', 'allowed' => ['All Members', 'Leadership', 'Choir Members', 'Youth', 'Men', 'Women', 'Deacons'], 'map' => ['All' => 'All Members', 'Everyone' => 'All Members'], 'fallback' => 'All Members'],
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as $table => $spec) {
            $this->normalize($table, $spec);
        }
        foreach (self::ANNOUNCEMENT_COLUMNS as $spec) {
            $this->normalize('announcements', $spec);
        }
    }

    /** Data fix only; the old values were never valid, so there is nothing to restore. */
    public function down(): void {}

    /** @param  array{column: string, allowed: list<string>, map: array<string, string>, fallback: string}  $spec */
    private function normalize(string $table, array $spec): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $spec['column'])) {
            return;
        }

        $column = $spec['column'];
        $byLowercase = [];
        foreach ($spec['allowed'] as $value) {
            $byLowercase[mb_strtolower($value)] = $value;
        }
        foreach ($spec['map'] as $from => $to) {
            $byLowercase[mb_strtolower($from)] = $to;
        }

        $stored = DB::table($table)->whereNotNull($column)->distinct()->pluck($column);
        foreach ($stored as $value) {
            if (in_array($value, $spec['allowed'], true)) {
                continue;
            }

            $replacement = $byLowercase[mb_strtolower(trim((string) $value))] ?? $spec['fallback'];
            DB::table($table)->where($column, $value)->update([$column => $replacement]);
        }
    }
};
