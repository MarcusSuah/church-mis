<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Offering extends Model
{
    use HasUuids, HasFactory, \App\Models\Concerns\RecordsMoney;

    protected $fillable = [
        'is_collection', 'counted_by', 'verified_by',
        'member_id', 'member_name', 'member_photo', 'offering_type', 'amount', 'currency', 'payment_method',
        'fund_id', 'fund_name', 'reference_number', 'receipt_number', 'offering_date', 'service_type',
        'notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'is_collection' => 'boolean',
            'amount' => 'decimal:2',
            'payment_method' => PaymentMethod::class,
            'offering_date' => 'date',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function fund(): BelongsTo
    {
        return $this->belongsTo(FinanceFund::class, 'fund_id');
    }
}
