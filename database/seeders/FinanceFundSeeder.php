<?php

namespace Database\Seeders;

use App\Models\FinanceFund;
use App\Support\Money;

/** The church's standard funds. Safe in production: only adds funds that are missing. */
class FinanceFundSeeder extends DemoSeeder
{
    protected function allowedInProduction(): bool
    {
        return true;
    }

    protected function seed(): void
    {
        $funds = [
            ['General Fund', 'Day-to-day ministry and operations of the church.', 60000],
            ['Building Fund', 'Construction, renovation and maintenance of church buildings.', 40000],
            ['Missions Fund', 'Evangelism, church planting and missionary support.', 15000],
            ['Benevolence Fund', 'Help for members and neighbours in need.', 8000],
            ['Youth & Children Fund', 'Youth programmes, camps and Sunday School materials.', 6000],
        ];

        foreach ($funds as [$name, $description, $target]) {
            $this->firstOrMake(FinanceFund::class, ['name' => $name], [
                'description' => $description,
                'target_amount' => $target,
                'currency' => Money::base(),
                'current_balance' => 0,
                'is_active' => true,
            ]);
        }
    }
}
