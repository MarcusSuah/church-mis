<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Sacraments\RecordsController;
use App\Models\FinanceFund;
use App\Support\ChurchSettings;
use App\Support\Money;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/** Funds are managed from the Finance Overview ("Add Fund"). */
class FundController extends RecordsController
{
    protected string $model = FinanceFund::class;

    protected string $page = 'finance-management/index';

    protected string $permission = 'finance';

    protected string $label = 'Fund';

    protected string $orderBy = 'name';

    protected function rules(): array
    {
        $id = request()->route('id');

        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('finance_funds', 'name')->ignore($id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'target_amount' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'currency' => ['nullable', Rule::in(ChurchSettings::CURRENCIES)],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $data['target_amount'] = $data['target_amount'] ?? 0;
        $data['currency'] = $data['currency'] ?? null ?: Money::base();

        return $data;
    }

    protected function present(Model $r): array
    {
        return $r->only(['id', 'name']);
    }
}
