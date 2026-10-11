<?php

namespace Database\Seeders;

use App\Enums\BudgetPeriod;
use App\Enums\ExpenseCategory;
use App\Models\Budget;
use App\Models\Expense;
use App\Models\FinanceFund;
use App\Support\Money;
use App\Support\StatsCache;

/** This year's budget lines and six months of sample expenses. */
class ExpenseBudgetSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $general = FinanceFund::where('name', 'General Fund')->first();
        $year = (int) now()->year;

        $budgets = [
            [ExpenseCategory::StaffSalaries, 24000, 'UserGroupIcon'],
            [ExpenseCategory::Utilities, 4800, 'BoltIcon'],
            [ExpenseCategory::Maintenance, 6000, 'WrenchScrewdriverIcon'],
            [ExpenseCategory::Outreach, 5000, 'GlobeAltIcon'],
            [ExpenseCategory::YouthPrograms, 3000, 'SparklesIcon'],
            [ExpenseCategory::MusicWorship, 2500, 'MusicalNoteIcon'],
            [ExpenseCategory::Administration, 3600, 'BriefcaseIcon'],
        ];
        foreach ($budgets as [$category, $amount, $icon]) {
            $this->firstOrMake(Budget::class, ['category' => $category->value, 'fiscal_year' => $year], [
                'description' => str($category->value)->replace('_', ' ')->title().' budget',
                'period' => BudgetPeriod::Annual->value,
                'allocated_amount' => $amount,
                'currency' => Money::base(),
                'spent_amount' => 0,
                'fund_id' => $general?->id,
                'fund_name' => $general?->name ?? 'General Fund',
                'icon' => $icon,
                'is_active' => true,
            ]);
        }

        $items = [
            ['Electricity bill', ExpenseCategory::Utilities, 180, 'LEC'],
            ['Pastoral staff allowance', ExpenseCategory::StaffSalaries, 1800, 'Church payroll'],
            ['Generator fuel', ExpenseCategory::Utilities, 120, 'Total Energies'],
            ['Sound system repair', ExpenseCategory::MusicWorship, 250, 'Sound Masters Ltd'],
            ['Youth camp supplies', ExpenseCategory::YouthPrograms, 300, 'City Supermarket'],
            ['Office stationery', ExpenseCategory::Administration, 90, 'Stationery World'],
        ];
        foreach (range(5, 0) as $monthsAgo) {
            foreach ($items as $n => [$title, $category, $amount, $vendor]) {
                $date = now()->subMonths($monthsAgo)->startOfMonth()->addDays(5 + $n * 3);
                if ($date->isFuture() || Expense::where('expense_date', $date->toDateString())->where('title', $title)->exists()) {
                    continue;
                }
                Expense::forceCreate([
                    'title' => $title,
                    'category' => $category->value,
                    'amount' => $amount + $monthsAgo * 5,
                    'currency' => 'USD',
                    'exchange_rate' => Money::rate(),
                    'payment_method' => $n % 2 ? 'bank_transfer' : 'cash',
                    'fund_id' => $general?->id,
                    'fund_name' => $general?->name ?? 'General Fund',
                    'vendor_name' => $vendor,
                    'expense_date' => $date->toDateString(),
                    'status' => $monthsAgo === 0 && $n > 3 ? 'Pending' : 'Paid',
                    'approved_by' => $monthsAgo === 0 && $n > 3 ? null : 'Finance Board',
                    'notes' => 'Sample data',
                ]);
            }
        }

        StatsCache::flush(Expense::class);
    }
}
