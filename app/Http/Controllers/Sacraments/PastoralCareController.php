<?php

namespace App\Http\Controllers\Sacraments;

use App\Models\Leader;
use App\Models\PastoralCare;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class PastoralCareController extends RecordsController
{
    public const CARE_TYPES = ['Marriage Counseling', 'Grief Support', 'Hospital Visit', 'Youth Crisis Intervention', 'Family Reconciliation', 'Spiritual Direction', 'Addiction Recovery', 'Financial Counseling', 'General Counseling'];

    public const STATUSES = ['Open', 'In Progress', 'Completed', 'Referred'];

    public const PRIORITIES = ['Normal', 'High', 'Urgent'];

    protected string $model = PastoralCare::class;

    protected string $page = 'pastoral-care/index';

    protected string $permission = 'pastoral-care';

    protected string $label = 'Care case';

    protected string $orderBy = 'created_at';

    protected function rules(): array
    {
        return [
            'member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'member_name' => ['required', 'string', 'max:255'],
            'care_type' => ['required', Rule::in(self::CARE_TYPES)],
            'description' => ['required', 'string', 'max:5000'],
            'assigned_pastor' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'priority' => ['required', Rule::in(self::PRIORITIES)],
            'visit_date' => ['nullable', 'date'],
            'follow_up_date' => ['nullable', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'outcome' => ['nullable', 'string', 'max:5000'],
            'is_confidential' => ['boolean'],
        ];
    }

    /**
     * F04: cases marked confidential are visible only to holders of
     * pastoral-care.confidential (the Pastor role; the Superadmin passes all checks).
     */
    protected function visibleQuery(): \Illuminate\Database\Eloquent\Builder
    {
        $query = PastoralCare::query();

        return request()->user()?->can('pastoral-care.confidential')
            ? $query
            : $query->where('is_confidential', false);
    }

    protected function searchColumns(): array
    {
        return ['member_name', 'care_type', 'assigned_pastor'];
    }

    protected function filters(): array
    {
        return [
            'type' => ['values' => self::CARE_TYPES, 'apply' => fn ($q, $v) => $q->where('care_type', $v)],
            'status' => ['values' => self::STATUSES, 'apply' => fn ($q, $v) => $q->where('status', $v)],
            'priority' => ['values' => self::PRIORITIES, 'apply' => fn ($q, $v) => $q->where('priority', $v)],
        ];
    }

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        $byStatus = (clone $all)->toBase()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        return [
            'total' => (int) $byStatus->sum(),
            'open' => (int) ($byStatus['Open'] ?? 0),
            'in_progress' => (int) ($byStatus['In Progress'] ?? 0),
            'urgent' => (clone $all)->where('priority', 'Urgent')->count(),
        ];
    }

    protected int $perPage = 10;

    /** "Close Case" button. */
    public function status(\Illuminate\Http\Request $request, string $id): \Illuminate\Http\RedirectResponse
    {
        $this->visibleQuery()->findOrFail($id)->update($request->validate(['status' => ['required', Rule::in(self::STATUSES)]]));
        \Inertia\Inertia::flash('toast', ['type' => 'success', 'message' => 'Case updated.']);

        return back();
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'member_id', 'member_name', 'care_type', 'description', 'assigned_pastor', 'status', 'priority', 'location', 'notes', 'outcome', 'is_confidential']),
            'visit_date' => self::d($r->visit_date),
            'follow_up_date' => self::d($r->follow_up_date),
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }

    protected function extraProps(): array
    {
        return [
            'careTypes' => self::CARE_TYPES,
            'statuses' => self::STATUSES,
            'priorities' => self::PRIORITIES,
            // Assign to active church leaders (Leadership page).
            'pastors' => Leader::where('is_active', true)->orderBy('display_order')->get()
                ->map(fn ($l) => trim("{$l->title} {$l->first_name} {$l->last_name}"))->values(),
        ];
    }
}
