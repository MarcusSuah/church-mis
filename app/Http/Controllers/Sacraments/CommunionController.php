<?php

namespace App\Http\Controllers\Sacraments;

use App\Models\Communion;
use Illuminate\Database\Eloquent\Model;

class CommunionController extends RecordsController
{
    protected string $model = Communion::class;

    protected string $page = 'communions/index';

    protected string $permission = 'communions';

    protected string $label = 'Communion service';

    protected string $orderBy = 'service_date';

    protected function searchColumns(): array
    {
        return ['service_name', 'officiant', 'scripture_reference'];
    }

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        $count = (clone $all)->count();

        return [
            'total' => $count,
            'this_year' => (clone $all)->whereBetween('service_date', [now()->startOfYear()->toDateString(), now()->endOfYear()->toDateTimeString()])->count(),
            'participants' => (int) (clone $all)->sum('attendance_count'),
            'average' => $count ? (int) round((clone $all)->avg('attendance_count')) : 0,
        ];
    }

    protected function rules(): array
    {
        return [
            'service_date' => ['required', 'date'],
            'service_name' => ['required', 'string', 'max:255'],
            'officiant' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'attendance_count' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'elements_used' => ['nullable', 'string', 'max:255'],
            'scripture_reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'banner_image' => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $data['attendance_count'] = (int) ($data['attendance_count'] ?? 0);

        return $data;
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'service_name', 'officiant', 'location', 'elements_used', 'scripture_reference', 'notes', 'banner_image']),
            'attendance_count' => (int) $r->attendance_count,
            'service_date' => self::d($r->service_date),
        ];
    }
}
