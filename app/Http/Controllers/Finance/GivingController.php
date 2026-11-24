<?php

namespace App\Http\Controllers\Finance;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Sacraments\RecordsController;
use App\Models\Member;
use App\Support\ChurchSettings;
use App\Support\Money;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/** Shared bits for tithes, offerings and donations. */
abstract class GivingController extends RecordsController
{
    protected function methods(): array
    {
        return array_map(fn ($c) => $c->value, PaymentMethod::cases());
    }

    protected function commonRules(): array
    {
        return [
            'member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:100000000'],
            'currency' => ['nullable', Rule::in(ChurchSettings::CURRENCIES)],
            'payment_method' => ['required', Rule::in($this->methods())],
            'fund_id' => ['nullable', 'uuid', 'exists:finance_funds,id'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'receipt_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** Fund name, member name/photo, recorder, and a receipt number when none was given. */
    protected function prepareGiving(array $data, ?Model $record, string $nameKey = 'member_name'): array
    {
        $data = $this->withFund($data);
        $data['currency'] = $data['currency'] ?? null ?: Money::base();
        if (! empty($data['member_id']) && ($m = Member::find($data['member_id']))) {
            $data[$nameKey] = $data[$nameKey] ?? null ?: $m->full_name;
            if ($nameKey === 'member_name') {
                $data['member_photo'] = $m->photo_url;
            }
        }
        $data['recorded_by'] = $record?->recorded_by ?? auth()->user()?->name;
        // Keep the rate of the day the gift was first recorded (F06).
        $data['exchange_rate'] = $record?->exchange_rate ?? Money::rate();
        if (empty($data['receipt_number'])) {
            $data['receipt_number'] = $record?->receipt_number ?: self::nextReceipt();
        }

        return $data;
    }

    /**
     * REC-2026-0001, shared across tithes, offerings and donations.
     * Taken from a locked counter, so two cashiers saving at once can never
     * get the same number (Phase 3, F06). Numbers past 9999 keep growing.
     */
    public static function nextReceipt(): string
    {
        $prefix = 'REC-'.now()->format('Y').'-';
        $n = Sequence::next('receipt:'.now()->format('Y'),
            fn () => Sequence::highestIn(['tithes', 'offerings', 'donations'], 'receipt_number', $prefix));

        return $prefix.str_pad((string) $n, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Cash has no bank or mobile-money reference, so one is generated when the
     * cashier leaves it blank: CASH-2026-0001, shared by offerings and donations.
     * An existing record keeps its reference when edited.
     */
    protected function withCashReference(array $data, ?Model $record): array
    {
        if (($data['payment_method'] ?? null) === PaymentMethod::Cash->value && empty($data['reference_number'])) {
            $data['reference_number'] = $record?->reference_number ?: self::nextCashReference();
        }

        return $data;
    }

    /** Next cash reference, from a locked counter like receipt numbers (never repeats). */
    public static function nextCashReference(): string
    {
        $prefix = 'CASH-'.now()->format('Y').'-';
        $n = Sequence::next('cash-reference:'.now()->format('Y'),
            fn () => Sequence::highestIn(['offerings', 'donations'], 'reference_number', $prefix));

        return $prefix.str_pad((string) $n, 4, '0', STR_PAD_LEFT);
    }

    /** Members are picked with the type-ahead lookup (/lookup/members), not a full list (F07). */
    protected function extraProps(): array
    {
        return ['funds' => $this->fundOptions(), 'methods' => $this->methods()];
    }

    /** First and last day of this month, as dates. */
    protected static function thisMonth(): array
    {
        return [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateTimeString()];
    }
}
