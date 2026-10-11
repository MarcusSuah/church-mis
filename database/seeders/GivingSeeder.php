<?php

namespace Database\Seeders;

use App\Http\Controllers\Finance\GivingController;
use App\Models\Donation;
use App\Models\FinanceFund;
use App\Models\Member;
use App\Models\Offering;
use App\Models\Tithe;
use App\Support\Money;
use App\Support\StatsCache;

/**
 * Six months of sample giving: monthly tithes from active sample members,
 * a basket collection every Sunday and a few donations. Receipt numbers
 * come from the same counter the app uses. Each record is checked before it
 * is added (by indexed columns), so an interrupted run can simply be repeated.
 */
class GivingSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $members = Member::where('email', 'like', '%@example.org')->whereIn('status', Member::ACCEPTED)->get();
        $general = FinanceFund::where('name', 'General Fund')->first();
        $building = FinanceFund::where('name', 'Building Fund')->first();
        $common = ['currency' => 'USD', 'exchange_rate' => Money::rate(), 'notes' => 'Sample data', 'recorded_by' => 'Seeder'];

        foreach (range(5, 0) as $monthsAgo) {
            $month = now()->subMonths($monthsAgo)->startOfMonth();

            foreach ($members as $n => $member) {
                $date = $month->copy()->addDays(($n * 3) % 27);
                if ($date->isFuture() || Tithe::where('member_id', $member->id)->where('tithe_date', $date->toDateString())->exists()) {
                    continue;
                }
                Tithe::forceCreate([...$common,
                    'member_id' => $member->id,
                    'member_name' => $member->full_name,
                    'amount' => 20 + ($n * 13) % 180,
                    'payment_method' => ['cash', 'momo', 'bank_transfer'][$n % 3],
                    'fund_id' => $general?->id,
                    'fund_name' => $general?->name ?? 'General Fund',
                    'receipt_number' => GivingController::nextReceipt(),
                    'tithe_date' => $date->toDateString(),
                ]);
            }

            for ($sunday = $month->copy()->next('Sunday'); $sunday->month === $month->month && ! $sunday->isFuture(); $sunday = $sunday->addWeek()) {
                if (Offering::where('offering_date', $sunday->toDateString())->where('member_name', 'Congregation (plate offering)')->where('recorded_by', 'Seeder')->exists()) {
                    continue;
                }
                Offering::forceCreate([...$common,
                    'member_name' => 'Congregation (plate offering)',
                    'offering_type' => 'Regular Offering',
                    'is_collection' => true,
                    'service_type' => 'Sunday Worship',
                    'amount' => 300 + ($sunday->day * 17) % 400,
                    'payment_method' => 'cash',
                    'fund_id' => $general?->id,
                    'fund_name' => $general?->name ?? 'General Fund',
                    'receipt_number' => GivingController::nextReceipt(),
                    'offering_date' => $sunday->toDateString(),
                    'counted_by' => 'Ushering Department',
                ]);
            }

            $donationDate = $month->copy()->addDays(14)->min(now())->toDateString();
            if (Donation::where('donation_date', $donationDate)->where('recorded_by', 'Seeder')->exists()) {
                continue;
            }
            Donation::forceCreate([...$common,
                'donor_name' => ['Grace Foundation', 'Anonymous Donor', 'Liberia Baptist Convention'][$monthsAgo % 3],
                'is_anonymous' => $monthsAgo % 3 === 1,
                'amount' => 500 + $monthsAgo * 150,
                'payment_method' => 'bank_transfer',
                'fund_id' => $building?->id,
                'fund_name' => $building?->name ?? 'Building Fund',
                'purpose' => 'Building project',
                'receipt_number' => GivingController::nextReceipt(),
                'donation_date' => $donationDate,
                'is_recurring' => $monthsAgo % 2 === 0,
            ]);
        }

        foreach ([Tithe::class, Offering::class, Donation::class] as $model) {
            StatsCache::flush($model);
        }
    }
}
