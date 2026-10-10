<?php

namespace App\Models\Concerns;

use App\Support\Money;
use App\Support\StatsCache;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Shared by tithes, offerings, donations and expenses (Phase 3, F06).
 *
 *  - exchange_rate: the LRD-per-USD rate in force when the record was
 *    saved. Totals convert with this stored rate, so changing the rate in
 *    Church Settings no longer rewrites last year's income.
 *  - Soft deletes: a deleted financial record stays in the database (and in
 *    the audit log) instead of disappearing.
 */
trait RecordsMoney
{
    use SoftDeletes;

    public function initializeRecordsMoney(): void
    {
        $this->mergeFillable(['exchange_rate']);
        $this->mergeCasts(['exchange_rate' => 'decimal:6']);
    }

    public static function bootRecordsMoney(): void
    {
        static::creating(function ($model) {
            if (blank($model->exchange_rate)) {
                $model->exchange_rate = Money::rate();
            }
        });

        // Cached whole-table counts and totals for this model are now stale.
        $flush = fn ($model) => StatsCache::flush($model::class);
        static::saved($flush);
        static::deleted($flush);
        static::restored($flush);
    }

    /** Amount in the church's current base currency, using the rate stored on this record. */
    public function amountInBase(): float
    {
        return Money::toBase((float) $this->amount, $this->currency, $this->exchange_rate !== null ? (float) $this->exchange_rate : null);
    }
}
