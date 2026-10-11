<?php

namespace App\Http\Controllers\ChurchStructure;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Support\LeadershipScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ministries with a leader and members (each with a role). The member's own
 * `ministry` field is kept in step so the rest of the app shows the same value.
 */
class MinistryController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        // Leaders without ministries.manage-any may only edit the groups they lead (F08).
        $manageAny = $user->can('ministries.manage-any');
        $ledIds = $manageAny ? [] : LeadershipScope::ministryIds($user);
        $inScope = fn (Ministry $x) => $manageAny || in_array($x->id, $ledIds, false);
        $abilities = fn (Ministry $x) => [
            'can_update' => $user->can('ministries.update') && $inScope($x),
            'can_delete' => $user->can('ministries.delete') && $inScope($x),
        ];
        $selectedId = $request->string('ministry')->toString() ?: null;

        $ministries = Ministry::query()
            ->with('leader:id,first_name,last_name,photo_url')
            ->withCount('memberships')
            ->orderBy('name')
            ->get()
            ->map(fn (Ministry $m) => [...$this->present($m), ...$abilities($m)]);

        $selected = $selectedId ? Ministry::with('leader:id,first_name,last_name,photo_url')->withCount('memberships')->whereSlugOrKey($selectedId)->first() : null;

        return Inertia::render('ministries/index', [
            'ministries' => $ministries,
            'selected' => $selected ? [
                ...$this->present($selected),
                ...$abilities($selected),
                'members' => $selected->memberships()
                    ->with('member:id,member_id,first_name,last_name,email,photo_url')
                    ->get()
                    ->sortBy(fn (MinistryMember $m) => [$m->member_id === $selected->leader_id ? 0 : 1, $m->member?->last_name])
                    ->values()
                    ->map(fn (MinistryMember $m) => [
                        'id' => $m->id,
                        'member_id' => $m->member_id,
                        'role' => $m->role,
                        'name' => $m->member?->full_name,
                        'initials' => $m->member?->initials,
                        'email' => $m->member?->email,
                        'photo_url' => $m->member?->photo_url,
                    ]),
            ] : null,
            'memberOptions' => Inertia::optional(fn () => Member::query()
                ->whereIn('status', ['Active', 'Approved'])
                // Type-ahead: at most 50 matches for ?member_q= (F07); this used to load every member.
                ->search(mb_substr((string) request('member_q', ''), 0, 100))
                ->orderBy('last_name')->orderBy('first_name')
                ->limit(50)
                ->get(['id', 'first_name', 'last_name', 'email', 'photo_url'])
                ->map(fn (Member $m) => [
                    'id' => $m->id,
                    'name' => $m->full_name,
                    'initials' => $m->initials,
                    'email' => $m->email,
                    'photo_url' => $m->photo_url,
                ])),
            'categories' => Ministry::CATEGORIES,
            'roles' => Ministry::ROLES,
            'can' => [
                'create' => $user->can('ministries.create'),
                'update' => $user->can('ministries.update'),
                'delete' => $user->can('ministries.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $ministry = Ministry::create($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$ministry->name} created successfully."]);

        return back();
    }

    public function update(Request $request, Ministry $ministry): RedirectResponse
    {
        Gate::authorize('update', $ministry);

        $data = $request->validate($this->rules($ministry));
        $oldName = $ministry->name;

        DB::transaction(function () use ($ministry, $data, $oldName) {
            $ministry->update($data);
            if ($oldName !== $ministry->name) {
                Member::where('ministry', $oldName)->update(['ministry' => $ministry->name]);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$ministry->name} updated successfully."]);

        return back();
    }

    public function destroy(Ministry $ministry): RedirectResponse
    {
        Gate::authorize('delete', $ministry);

        DB::transaction(function () use ($ministry) {
            Member::where('ministry', $ministry->name)->update(['ministry' => null]);
            $ministry->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$ministry->name} deleted successfully."]);

        return back();
    }

    public function addMember(Request $request, Ministry $ministry): RedirectResponse
    {
        Gate::authorize('update', $ministry);

        $data = $request->validate([
            'member_id' => ['required', 'uuid', 'exists:members,id', Rule::unique('ministry_members')->where('ministry_id', $ministry->id)],
        ], ['member_id.unique' => 'That member is already in this ministry.']);

        DB::transaction(function () use ($ministry, $data) {
            $ministry->memberships()->create(['member_id' => $data['member_id'], 'role' => 'Member', 'joined_at' => now()]);
            Member::where('id', $data['member_id'])->where(fn ($q) => $q->whereNull('ministry')->orWhere('ministry', ''))->update(['ministry' => $ministry->name]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Member added to the ministry successfully.']);

        return back();
    }

    public function updateMember(Request $request, Ministry $ministry, MinistryMember $ministryMember): RedirectResponse
    {
        Gate::authorize('update', $ministry);

        abort_unless($ministryMember->ministry_id === $ministry->id, 404);

        $data = $request->validate(['role' => ['required', Rule::in(Ministry::ROLES)]]);

        DB::transaction(function () use ($ministry, $ministryMember, $data) {
            if ($data['role'] === 'Leader') {
                $this->assignLeader($ministry, $ministryMember->member_id);
            } else {
                $ministryMember->update(['role' => $data['role']]);
                if ($ministry->leader_id === $ministryMember->member_id) {
                    $ministry->update(['leader_id' => null]);
                }
            }
        });

        return back();
    }

    public function setLeader(Request $request, Ministry $ministry): RedirectResponse
    {
        Gate::authorize('update', $ministry);

        $data = $request->validate(['member_id' => ['required', 'uuid', 'exists:members,id']]);

        DB::transaction(function () use ($ministry, $data) {
            if (! $ministry->memberships()->where('member_id', $data['member_id'])->exists()) {
                $ministry->memberships()->create(['member_id' => $data['member_id'], 'role' => 'Member', 'joined_at' => now()]);
            }
            $this->assignLeader($ministry, $data['member_id']);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ministry leader updated successfully.']);

        return back();
    }

    public function removeMember(Ministry $ministry, MinistryMember $ministryMember): RedirectResponse
    {
        Gate::authorize('update', $ministry);

        abort_unless($ministryMember->ministry_id === $ministry->id, 404);

        DB::transaction(function () use ($ministry, $ministryMember) {
            if ($ministry->leader_id === $ministryMember->member_id) {
                $ministry->update(['leader_id' => null]);
            }
            Member::where('id', $ministryMember->member_id)->where('ministry', $ministry->name)->update(['ministry' => null]);
            $ministryMember->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Removed from the ministry.']);

        return back();
    }

    private function assignLeader(Ministry $ministry, string $memberId): void
    {
        $ministry->memberships()->where('role', 'Leader')->where('member_id', '!=', $memberId)->update(['role' => 'Co-Leader']);
        $ministry->memberships()->where('member_id', $memberId)->update(['role' => 'Leader']);
        $ministry->update(['leader_id' => $memberId]);
    }

    private function rules(?Ministry $ministry = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150', Rule::unique('ministries', 'name')->ignore($ministry?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'vision' => ['nullable', 'string', 'max:1000'],
            'category' => ['required', Rule::in(Ministry::CATEGORIES)],
            'meeting_schedule' => ['nullable', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:150'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'banner_url' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ];
    }

    /** @return array<string, mixed> */
    private function present(Ministry $m): array
    {
        return [
            'id' => $m->id,
            'slug' => $m->slug,
            'name' => $m->name,
            'description' => $m->description,
            'vision' => $m->vision,
            'category' => $m->category,
            'leader_id' => $m->leader_id,
            'leader_name' => $m->leader?->full_name,
            'leader_photo' => $m->leader?->photo_url,
            'leader_initials' => $m->leader?->initials,
            'member_count' => (int) ($m->memberships_count ?? 0),
            'meeting_schedule' => $m->meeting_schedule,
            'location' => $m->location,
            'contact_email' => $m->contact_email,
            'contact_phone' => $m->contact_phone,
            'banner_url' => $m->banner_url,
            'is_active' => $m->is_active,
        ];
    }
}
