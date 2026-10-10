<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Sacraments\RecordsController;
use App\Models\Event;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class EventController extends RecordsController
{
    public const TYPES = ['Sunday Worship', 'Special Service', 'Youth Event', 'Outreach', 'Retreat', 'Prayer Meeting', 'Children Event', 'General'];

    public const STATUSES = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];

    protected string $model = Event::class;

    protected string $page = 'events/index';

    protected string $permission = 'events';

    protected string $label = 'Event';

    protected string $orderBy = 'start_date';

    protected function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'event_type' => ['required', Rule::in(self::TYPES)],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'location' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'banner_url' => ['nullable', 'string', 'max:500'],
            'organizer_name' => ['nullable', 'string', 'max:255'],
            'max_attendees' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'registered_count' => ['nullable', 'integer', 'min:0'],
            'is_public' => ['boolean'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $data['registered_count'] = $data['registered_count'] ?? $record?->registered_count ?? 0;

        return $data;
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'title', 'description', 'event_type', 'location', 'address', 'banner_url', 'organizer_name', 'max_attendees', 'registered_count', 'is_public', 'status', 'notes']),
            'start_date' => $r->start_date?->format('Y-m-d\TH:i'),
            'end_date' => $r->end_date?->format('Y-m-d\TH:i'),
        ];
    }

    protected function searchColumns(): array
    {
        return ['title', 'organizer_name', 'location'];
    }

    protected function filters(): array
    {
        return [
            'type' => ['values' => self::TYPES, 'apply' => fn ($q, $v) => $q->where('event_type', $v)],
            'status' => ['values' => self::STATUSES, 'apply' => fn ($q, $v) => $q->where('status', $v)],
        ];
    }

    /** Soonest first, as the page showed them. */
    protected function sort(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->orderBy('start_date')->orderBy('id');
    }

    protected int $perPage = 9;

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        $byStatus = (clone $all)->toBase()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        return [
            'total' => (int) $byStatus->sum(),
            'upcoming' => (int) ($byStatus['Upcoming'] ?? 0),
            'this_month' => (clone $all)->whereBetween('start_date', [now()->startOfMonth(), now()->endOfMonth()])->count(),
            'completed' => (int) ($byStatus['Completed'] ?? 0),
        ];
    }

    protected function extraProps(): array
    {
        return ['types' => self::TYPES, 'statuses' => self::STATUSES];
    }
}
