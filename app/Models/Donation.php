<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Donation extends Model
{
    use HasUuids, HasFactory, \App\Models\Concerns\RecordsMoney;

    protected $fillable = [
        'donor_name', 'donor_email', 'donor_phone', 'member_id', 'is_anonymous', 'amount', 'currency',
        'payment_method', 'fund_id', 'fund_name', 'purpose', 'reference_number', 'receipt_number',
        'donation_date', 'is_recurring', 'notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_method' => PaymentMethod::class,
            'donation_date' => 'date',
            'is_anonymous' => 'boolean',
            'is_recurring' => 'boolean',
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
