<?php

namespace App\Http\Controllers\Sacraments;

use App\Models\Baptism;
use App\Models\Member;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class BaptismController extends RecordsController
{
    public const TYPES = ['immersion', 'sprinkling', 'pouring'];

    protected string $model = Baptism::class;

    protected string $page = 'baptisms/index';

    protected string $permission = 'baptisms';

    protected string $label = 'Baptism record';

    protected string $orderBy = 'baptism_date';

    protected function rules(): array
    {
        return [
            'member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'candidate_name' => ['required', 'string', 'max:255'],
            'candidate_photo' => ['nullable', 'string', 'max:500'],
            'baptism_date' => ['required', 'date'],
            'baptism_type' => ['required', Rule::in(self::TYPES)],
            'officiant' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'witnesses' => ['nullable', 'string', 'max:2000'],
            'certificate_number' => ['nullable', 'string', 'max:100'],
            'certificate_issued' => ['boolean'],
            'certificate_date' => ['nullable', 'date'],
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

        // A baptism recorded for a member marks them baptized on their record.
        if (! empty($data['member_id'])) {
            Member::whereKey($data['member_id'])->update(['baptized' => true, 'baptism_date' => $data['baptism_date']]);
        }

        return $data;
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'member_id', 'candidate_name', 'candidate_photo', 'baptism_type', 'officiant', 'location', 'witnesses', 'certificate_number', 'certificate_issued', 'notes']),
            'baptism_date' => self::d($r->baptism_date),
            'certificate_date' => self::d($r->certificate_date),
        ];
    }

    protected function searchColumns(): array
    {
        return ['candidate_name', 'certificate_number'];
    }

    protected function filters(): array
    {
        return [
            'type' => ['values' => self::TYPES, 'apply' => fn ($q, $v) => $q->where('baptism_type', $v)],
            'certificate' => ['values' => ['Issued', 'Pending'], 'apply' => fn ($q, $v) => $q->where('certificate_issued', $v === 'Issued')],
        ];
    }

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        return [
            'total' => (clone $all)->count(),
            'this_year' => (clone $all)->whereBetween('baptism_date', [now()->startOfYear()->toDateString(), now()->endOfYear()->toDateTimeString()])->count(),
            'issued' => (clone $all)->where('certificate_issued', true)->count(),
            'pending' => (clone $all)->where('certificate_issued', false)->count(),
        ];
    }

    /** Members are picked with the type-ahead lookup (/lookup/members) (F07). */
    protected function extraProps(): array
    {
        return ['types' => self::TYPES];
    }
}
