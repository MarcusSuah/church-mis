<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
Use Illuminate\Database\Eloquent\SoftDeletes;

class Tithe extends Model
{
    use HasUuids, HasFactory, \App\Models\Concerns\RecordsMoney;

    protected $fillable = [
        'member_id', 'member_name', 'member_photo', 'amount', 'currency', 'payment_method', 'fund_id', 'fund_name',
        'reference_number', 'receipt_number', 'tithe_date', 'notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_method' => PaymentMethod::class,
            'tithe_date' => 'date',
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
