<?php

namespace App\Http\Controllers\ChurchStructure;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\DepartmentActivity;
use App\Models\DepartmentMember;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Departments with a leader, members (with a role each) and an activity log.
 * The member's own `department` field is kept in step so Member Management,
 * the directory and the portal show the same department.
 */
class DepartmentController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $selectedId = $request->string('department')->toString() ?: null;

        $departments = Department::query()
            ->with('leader:id,first_name,last_name,photo_url')
            ->withCount('memberships')
            ->orderBy('name')
            ->get()
            ->map(fn (Department $d) => $this->present($d));

        $selected = $selectedId ? Department::with('leader:id,first_name,last_name,photo_url')->withCount('memberships')->find($selectedId) : null;

        return Inertia::render('departments/index', [
            'departments' => $departments,
            'selected' => $selected ? [
                ...$this->present($selected),
                'members' => $selected->memberships()
                    ->with('member:id,member_id,first_name,last_name,email,phone,photo_url,status')
                    ->get()
                    ->sortBy(fn (DepartmentMember $m) => [$m->member_id === $selected->leader_id ? 0 : 1, $m->member?->last_name])
                    ->values()
                    ->map(fn (DepartmentMember $m) => [
                        'id' => $m->id,
                        'member_id' => $m->member_id,
                        'role' => $m->role,
                        'joined_at' => $m->joined_at?->toIso8601String(),
                        'name' => $m->member?->full_name,
                        'initials' => $m->member?->initials,
                        'email' => $m->member?->email,
                        'member_code' => $m->member?->member_id,
                        'photo_url' => $m->member?->photo_url,
                    ]),
                'activities' => $selected->activities()->latest('activity_date')->latest()->get(),
            ] : null,
            // Loaded only when the Add Member / Change Leader picker opens.
            'memberOptions' => Inertia::optional(fn () => Member::query()
                ->whereIn('status', ['Active', 'Approved'])
                // Type-ahead: at most 50 matches for ?member_q= (F07); this used to load every member.
                ->search(mb_substr((string) request('member_q', ''), 0, 100))
                ->orderBy('last_name')->orderBy('first_name')
                ->limit(50)
                ->get(['id', 'member_id', 'first_name', 'last_name', 'department', 'photo_url'])
                ->map(fn (Member $m) => [
                    'id' => $m->id,
                    'name' => $m->full_name,
                    'initials' => $m->initials,
                    'code' => $m->member_id,
                    'department' => $m->department,
                    'photo_url' => $m->photo_url,
                ])),
            'categories' => Department::CATEGORIES,
            'roles' => Department::ROLES,
            'can' => [
                'create' => $user->can('departments.create'),
                'update' => $user->can('departments.update'),
                'delete' => $user->can('departments.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $department = Department::create($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$department->name} created."]);

        return back();
    }

    public function update(Request $request, Department $department): RedirectResponse
    {
        $data = $request->validate($this->rules($department));
        $oldName = $department->name;

        DB::transaction(function () use ($department, $data, $oldName) {
            $department->update($data);
            // Keep members' department label in step with a rename.
            if ($oldName !== $department->name) {
                Member::where('department', $oldName)->update(['department' => $department->name]);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$department->name} updated."]);

        return back();
    }

    public function destroy(Department $department): RedirectResponse
    {
        DB::transaction(function () use ($department) {
            Member::where('department', $department->name)->update(['department' => null]);
            $department->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$department->name} deleted."]);

        return back();
    }

    public function addMember(Request $request, Department $department): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'uuid', 'exists:members,id', Rule::unique('department_members')->where('department_id', $department->id)],
            'as_leader' => ['boolean'],
        ], ['member_id.unique' => 'That member is already in this department.']);

        DB::transaction(function () use ($department, $data, $request) {
            $department->memberships()->create(['member_id' => $data['member_id'], 'role' => 'Member', 'joined_at' => now()]);
            $member = Member::find($data['member_id']);
            if (blank($member->department)) {
                $member->update(['department' => $department->name]);
            }
            if ($request->boolean('as_leader')) {
                $this->assignLeader($department, $member);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Member added to the department.']);

        return back();
    }

    public function updateMember(Request $request, Department $department, DepartmentMember $departmentMember): RedirectResponse
    {
        abort_unless($departmentMember->department_id === $department->id, 404);

        $data = $request->validate(['role' => ['required', Rule::in(Department::ROLES)]]);

        DB::transaction(function () use ($department, $departmentMember, $data) {
            if ($data['role'] === 'Leader') {
                $this->assignLeader($department, $departmentMember->member);
            } else {
                $departmentMember->update(['role' => $data['role']]);
                if ($department->leader_id === $departmentMember->member_id) {
                    $department->update(['leader_id' => null]);
                }
            }
        });

        return back();
    }

    /** Make an existing department member (or any member — they get added) the leader. */
    public function setLeader(Request $request, Department $department): RedirectResponse
    {
        $data = $request->validate(['member_id' => ['required', 'uuid', 'exists:members,id']]);
        $member = Member::find($data['member_id']);

        DB::transaction(function () use ($department, $member) {
            if (! $department->memberships()->where('member_id', $member->id)->exists()) {
                $department->memberships()->create(['member_id' => $member->id, 'role' => 'Member', 'joined_at' => now()]);
                if (blank($member->department)) {
                    $member->update(['department' => $department->name]);
                }
            }
            $this->assignLeader($department, $member);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$member->full_name} is now the department leader."]);

        return back();
    }

    public function removeMember(Department $department, DepartmentMember $departmentMember): RedirectResponse
    {
        abort_unless($departmentMember->department_id === $department->id, 404);

        DB::transaction(function () use ($department, $departmentMember) {
            if ($department->leader_id === $departmentMember->member_id) {
                $department->update(['leader_id' => null]);
            }
            Member::where('id', $departmentMember->member_id)->where('department', $department->name)->update(['department' => null]);
            $departmentMember->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Removed from the department.']);

        return back();
    }

    public function storeActivity(Request $request, Department $department): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'activity_type' => ['required', Rule::in(DepartmentActivity::TYPES)],
            'activity_date' => ['required', 'date'],
            'location' => ['nullable', 'string', 'max:150'],
            'attendees_count' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'description' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $department->activities()->create([...$data, 'attendees_count' => $data['attendees_count'] ?? 0, 'created_by' => $request->user()->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Activity logged.']);

        return back();
    }

    public function destroyActivity(Department $department, DepartmentActivity $activity): RedirectResponse
    {
        abort_unless($activity->department_id === $department->id, 404);
        $activity->delete();

        return back();
    }

    /* ------------------------------------------------------------------ */

    private function assignLeader(Department $department, Member $member): void
    {
        // Previous leader drops back to Co-Leader rather than vanishing.
        $department->memberships()->where('role', 'Leader')->where('member_id', '!=', $member->id)->update(['role' => 'Co-Leader']);
        $department->memberships()->where('member_id', $member->id)->update(['role' => 'Leader']);
        $department->update(['leader_id' => $member->id]);
    }

    private function rules(?Department $department = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150', Rule::unique('departments', 'name')->ignore($department?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => ['required', Rule::in(Department::CATEGORIES)],
            'meeting_schedule' => ['nullable', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:150'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'banner_url' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ];
    }

    /** @return array<string, mixed> */
    private function present(Department $d): array
    {
        return [
            'id' => $d->id,
            'name' => $d->name,
            'description' => $d->description,
            'category' => $d->category,
            'leader_id' => $d->leader_id,
            'leader_name' => $d->leader?->full_name,
            'leader_photo' => $d->leader?->photo_url,
            'leader_initials' => $d->leader?->initials,
            'member_count' => (int) ($d->memberships_count ?? 0),
            'meeting_schedule' => $d->meeting_schedule,
            'location' => $d->location,
            'contact_email' => $d->contact_email,
            'contact_phone' => $d->contact_phone,
            'banner_url' => $d->banner_url,
            'is_active' => $d->is_active,
            'created_at' => $d->created_at?->toIso8601String(),
        ];
    }
}
