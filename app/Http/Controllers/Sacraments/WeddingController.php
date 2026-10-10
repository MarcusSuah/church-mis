<?php

namespace App\Http\Controllers\Sacraments;

use App\Models\Wedding;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class WeddingController extends RecordsController
{
    public const STATUSES = ['scheduled', 'completed', 'cancelled', 'postponed'];

    protected string $model = Wedding::class;

    protected string $page = 'weddings/index';

    protected string $permission = 'weddings';

    protected string $label = 'Wedding record';

    protected string $orderBy = 'wedding_date';

    protected function rules(): array
    {
        return [
            'groom_name' => ['required', 'string', 'max:255'],
            'bride_name' => ['required', 'string', 'max:255'],
            'groom_member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'bride_member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'wedding_date' => ['required', 'date'],
            'wedding_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'officiant' => ['nullable', 'string', 'max:255'],
            'witnesses' => ['nullable', 'string', 'max:2000'],
            'reception_venue' => ['nullable', 'string', 'max:255'],
            'certificate_number' => ['nullable', 'string', 'max:100'],
            'certificate_issued' => ['boolean'],
            'certificate_date' => ['nullable', 'date'],
            'banner_image' => ['nullable', 'string', 'max:500'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        if (! ($data['certificate_issued'] ?? false)) {
            $data['certificate_date'] = null;
        } elseif (empty($data['certificate_date'])) {
            $data['certificate_date'] = now()->toDateString();
        }

        return $data;
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'groom_name', 'bride_name', 'groom_member_id', 'bride_member_id', 'location', 'officiant', 'witnesses', 'reception_venue', 'certificate_number', 'certificate_issued', 'banner_image', 'status', 'notes']),
            'wedding_date' => self::d($r->wedding_date),
            'wedding_time' => self::t($r->wedding_time),
            'certificate_date' => self::d($r->certificate_date),
        ];
    }

    protected function searchColumns(): array
    {
        return ['groom_name', 'bride_name', 'certificate_number'];
    }

    protected function filters(): array
    {
        return [
            'status' => ['values' => self::STATUSES, 'apply' => fn ($q, $v) => $q->where('status', $v)],
            'certificate' => ['values' => ['Issued', 'Pending'], 'apply' => fn ($q, $v) => $q->where('certificate_issued', $v === 'Issued')],
        ];
    }

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        return [
            'total' => (clone $all)->count(),
            'scheduled' => (clone $all)->where('status', 'scheduled')->count(),
            'completed' => (clone $all)->where('status', 'completed')->count(),
            'issued' => (clone $all)->where('certificate_issued', true)->count(),
        ];
    }

    /** Members are picked with the type-ahead lookup (/lookup/members) (F07). */
    protected function extraProps(): array
    {
        return ['statuses' => self::STATUSES];
    }
}
