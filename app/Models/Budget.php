<?php

namespace App\Models;

use App\Enums\BudgetPeriod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Budget extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'category', 'description', 'period', 'fiscal_year', 'allocated_amount', 'currency', 'spent_amount',
        'fund_id', 'fund_name', 'icon', 'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'period' => BudgetPeriod::class,
            'allocated_amount' => 'decimal:2',
            'spent_amount' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function fund(): BelongsTo
    {
        return $this->belongsTo(FinanceFund::class, 'fund_id');
    }

    public function getRemainingAttribute(): string
    {
        return bcsub((string) $this->allocated_amount, (string) $this->spent_amount, 2);
    }
}
