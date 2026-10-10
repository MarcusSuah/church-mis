<?php

namespace App\Http\Controllers\WorshipCare;

use App\Http\Controllers\Controller;
use App\Enums\AttendanceStatus;
use App\Enums\ServiceType;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    private const ROSTER_STATUSES = ['Active', 'Approved'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $type = $request->string('type', 'sunday_worship')->toString();
        $type = array_key_exists($type, AttendanceSession::TYPES) ? $type : 'sunday_worship';

        $sessions = AttendanceSession::query()
            ->where('service_type', $type)
            ->withCount([
                'records as present_count' => fn($q) => $q->where('attendance_status', AttendanceStatus::Present->value),
                'records as absent_count' => fn($q) => $q->where('attendance_status', AttendanceStatus::Absent->value),
                'records as late_count' => fn($q) => $q->where('attendance_status', AttendanceStatus::Late->value),
                'records as excused_count' => fn($q) => $q->where('attendance_status', AttendanceStatus::Excused->value),
            ])
            ->orderByDesc('service_date')
            ->orderByDesc('created_at')
            ->get();

        $selectedId = $request->string('session')->toString() ?: null;
        $selected = $selectedId ? $sessions->firstWhere('id', $selectedId) : null;

        return Inertia::render('attendance/index', [
            'type' => $type,
            'types' => collect(AttendanceSession::TYPES)->map(fn($label, $key) => ['key' => $key, 'label' => $label])->values(),
            'stats' => $this->stats($sessions),
            'sessions' => $sessions->map(fn(AttendanceSession $s) => $this->presentSession($s)),
            'selected' => $selected ? [
                ...$this->presentSession($selected),
                'notes' => $selected->notes,
                'roster' => $this->roster($selected),
            ] : null,
            'can' => [
                'create' => $user->can('attendance.create'),
                'update' => $user->can('attendance.update'),
                'delete' => $user->can('attendance.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        $session = AttendanceSession::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$session->typeLabel()} session created."]);
        Inertia::flash('openSession', $session->id);

        return back();
    }

    public function update(Request $request, AttendanceSession $session): RedirectResponse
    {
        $session->update($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Session updated.']);

        return back();
    }

    public function destroy(AttendanceSession $session): RedirectResponse
    {
        $session->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Session deleted.']);

        return back();
    }

    public function mark(Request $request, AttendanceSession $session): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'uuid', 'exists:members,id'],
            'status' => ['required', Rule::in(array_map(fn($case) => $case->value, AttendanceStatus::cases()))],
        ]);

        $existing = $session->records()->where('member_id', $data['member_id'])->first();

        if ($existing && $existing->attendance_status->value === $data['status']) {
            $existing->delete();
        } else {
            AttendanceRecord::updateOrCreate(
                ['session_id' => $session->id, 'member_id' => $data['member_id']],
                $this->recordFields($session, $data['status']),
            );
        }

        return back();
    }

    public function markRemaining(Request $request, AttendanceSession $session): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn($case) => $case->value, AttendanceStatus::cases()))],
        ]);

        $marked = $session->records()->pluck('member_id');
        $ids = Member::whereIn('status', self::ROSTER_STATUSES)->whereNotIn('id', $marked)->pluck('id');

        DB::transaction(function () use ($ids, $session, $data) {
            foreach ($ids as $id) {
                AttendanceRecord::create([
                    'session_id' => $session->id,
                    'member_id' => $id,
                    ...$this->recordFields($session, $data['status']),
                ]);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$ids->count()} " . str('member')->plural($ids->count()) . " marked {$data['status']}."]);

        return back();
    }

    private function recordFields(AttendanceSession $session, string $status): array
    {
        return [
            'attendance_status' => $status,
            'present' => in_array($status, [AttendanceStatus::Present->value, AttendanceStatus::Late->value], true),
            'service_name' => $session->typeLabel(),
            'service_date' => $session->service_date->toDateString(),
        ];
    }

    private function rules(): array
    {
        return [
            'service_type' => ['required', Rule::in(array_keys(AttendanceSession::TYPES))],
            'service_date' => ['required', 'date'],
            'title' => ['nullable', 'string', 'max:200'],
            'sermon_topic' => ['nullable', 'string', 'max:200'],
            'preacher' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @param Collection<int, AttendanceSession> $sessions */
    private function stats(Collection $sessions): array
    {
        $n = $sessions->count();
        $present = $sessions->sum('present_count');
        $late = $sessions->sum('late_count');
        $absent = $sessions->sum('absent_count');
        $excused = $sessions->sum('excused_count');
        $marked = $present + $late + $absent + $excused;

        return [
            'sessions' => $n,
            'avg_present' => $n ? (int) round($present / $n) : 0,
            'avg_absent' => $n ? (int) round($absent / $n) : 0,
            'avg_late' => $n ? (int) round($late / $n) : 0,
            'rate' => $marked ? (int) round(($present + $late) / $marked * 100) : 0,
        ];
    }

    private function presentSession(AttendanceSession $s): array
    {
        $marked = $s->present_count + $s->absent_count + $s->late_count + $s->excused_count;

        return [
            'id' => $s->id,
            'service_type' => $s->service_type instanceof ServiceType ? $s->service_type->value : $s->service_type,
            'type_label' => $s->typeLabel(),
            'service_date' => $s->service_date->format('Y-m-d'),
            'title' => $s->title,
            'sermon_topic' => $s->sermon_topic,
            'preacher' => $s->preacher,
            'notes' => $s->notes,
            'present' => (int) $s->present_count,
            'absent' => (int) $s->absent_count,
            'late' => (int) $s->late_count,
            'excused' => (int) $s->excused_count,
            'rate' => $marked ? (int) round(($s->present_count + $s->late_count) / $marked * 100) : 0,
        ];
    }
private function roster(AttendanceSession $session): array
{
    $marks = $session->records()->pluck('attendance_status', 'member_id');

    return Member::query()
        ->where(fn ($q) => $q->whereIn('status', self::ROSTER_STATUSES)->orWhereIn('id', $marks->keys()))
        ->orderBy('first_name')
        ->orderBy('last_name')
        ->get(['id', 'member_id', 'first_name', 'last_name', 'department', 'photo_url'])
        ->map(fn (Member $m) => [
            'member_id' => $m->id,
            'code' => $m->member_id,
            'name' => $m->full_name,
            'initials' => $m->initials,
            'department' => $m->department,
            'photo_url' => $m->photo_url,
            'status' => $marks->get($m->id)?->value,
        ])
        ->all();
}
}
