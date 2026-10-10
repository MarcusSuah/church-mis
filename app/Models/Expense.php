<?php

namespace App\Models;

use App\Enums\ExpenseCategory;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasUuids, HasFactory, \App\Models\Concerns\RecordsMoney;

    protected $fillable = [
        'title', 'description', 'category', 'amount', 'currency', 'payment_method', 'fund_id', 'fund_name',
        'vendor_name', 'reference_number', 'receipt_url', 'expense_date', 'approved_by', 'paid_by',
        'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'category' => ExpenseCategory::class,
            'amount' => 'decimal:2',
            'payment_method' => PaymentMethod::class,
            'expense_date' => 'date',
        ];
    }

    public function fund(): BelongsTo
    {
        return $this->belongsTo(FinanceFund::class, 'fund_id');
    }
}
