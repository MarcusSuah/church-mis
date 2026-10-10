<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceFund extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'name', 'description', 'target_amount', 'currency', 'current_balance', 'banner_url', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'current_balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function tithes(): HasMany
    {
        return $this->hasMany(Tithe::class, 'fund_id');
    }

    public function offerings(): HasMany
    {
        return $this->hasMany(Offering::class, 'fund_id');
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class, 'fund_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'fund_id');
    }

    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class, 'fund_id');
    }
}
