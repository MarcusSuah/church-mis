<?php

namespace App\Http\Controllers\Sacraments;

use App\Models\Funeral;
use App\Models\Member;
use Illuminate\Database\Eloquent\Model;

class FuneralController extends RecordsController
{
    protected string $model = Funeral::class;

    protected string $page = 'funerals/index';

    protected string $permission = 'funerals';

    protected string $label = 'Funeral record';

    protected string $orderBy = 'funeral_date';

    protected function rules(): array
    {
        return [
            'member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'deceased_name' => ['required', 'string', 'max:255'],
            'deceased_photo' => ['nullable', 'string', 'max:500'],
            'date_of_death' => ['nullable', 'date'],
            'funeral_date' => ['required', 'date'],
            'funeral_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'burial_location' => ['nullable', 'string', 'max:255'],
            'officiant' => ['nullable', 'string', 'max:255'],
            'eulogy_by' => ['nullable', 'string', 'max:255'],
            'family_contact' => ['nullable', 'string', 'max:255'],
            'family_phone' => ['nullable', 'string', 'max:50'],
            'banner_image' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        // A funeral for a member marks their record Inactive (deceased).
        if (! empty($data['member_id'])) {
            Member::whereKey($data['member_id'])->where('status', '!=', 'Inactive')->update(['status' => 'Inactive']);
        }

        return $data;
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'member_id', 'deceased_name', 'deceased_photo', 'location', 'burial_location', 'officiant', 'eulogy_by', 'family_contact', 'family_phone', 'banner_image', 'notes']),
            'date_of_death' => self::d($r->date_of_death),
            'funeral_date' => self::d($r->funeral_date),
            'funeral_time' => self::t($r->funeral_time),
        ];
    }

    protected function searchColumns(): array
    {
        return ['deceased_name', 'family_contact', 'officiant'];
    }

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        return [
            'total' => (clone $all)->count(),
            'this_year' => (clone $all)->whereBetween('funeral_date', [now()->startOfYear()->toDateString(), now()->endOfYear()->toDateTimeString()])->count(),
            'with_contact' => (clone $all)->whereNotNull('family_contact')->where('family_contact', '!=', '')->count(),
            'with_burial' => (clone $all)->whereNotNull('burial_location')->where('burial_location', '!=', '')->count(),
        ];
    }

    /** Members are picked with the type-ahead lookup (/lookup/members) (F07). */
    protected function extraProps(): array
    {
        return [];
    }
}
