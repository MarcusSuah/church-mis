<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\ServiceSession;
use App\Models\Concerns\RecordsMoney;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Offering extends Model
{
    use HasFactory, HasUuids, RecordsMoney;

    protected $fillable = [
        'is_collection', 'counted_by', 'verified_by',
        'member_id', 'member_name', 'member_photo', 'offering_type', 'amount', 'currency', 'payment_method',
        'fund_id', 'fund_name', 'reference_number', 'receipt_number', 'offering_date', 'service_type',
        'service_session', 'notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'is_collection' => 'boolean',
            'amount' => 'decimal:2',
            'payment_method' => PaymentMethod::class,
            'offering_date' => 'date',
            'service_session' => ServiceSession::class,
        ];
    }

    /** "Sunday Worship — 1st Service", or just the service type when it has no session. */
    public function serviceLabel(): string
    {
        return $this->service_session instanceof ServiceSession
            ? "{$this->service_type} — {$this->service_session->label()}"
            : (string) $this->service_type;
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
