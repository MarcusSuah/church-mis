<?php

namespace App\Http\Controllers\ChurchStructure;

use App\Http\Controllers\Controller;
use App\Models\Committee;
use App\Models\CommitteeMember;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Committees (standing, ad hoc, task forces…) with a chairperson and
 * members who each hold a role.
 */
class CommitteeController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $selectedId = $request->string('committee')->toString() ?: null;

        $committees = Committee::query()
            ->with('chairperson:id,first_name,last_name,photo_url')
            ->withCount('memberships')
            ->orderBy('name')
            ->get()
            ->map(fn (Committee $c) => $this->present($c));

        $selected = $selectedId ? Committee::with('chairperson:id,first_name,last_name,photo_url')->withCount('memberships')->whereSlugOrKey($selectedId)->first() : null;

        return Inertia::render('committees/index', [
            'committees' => $committees,
            'selected' => $selected ? [
                ...$this->present($selected),
                'members' => $selected->memberships()
                    ->with('member:id,first_name,last_name,email,photo_url')
                    ->get()
                    ->sortBy(fn (CommitteeMember $m) => [$m->member_id === $selected->chairperson_id ? 0 : 1, $m->member?->last_name])
                    ->values()
                    ->map(fn (CommitteeMember $m) => [
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
            'types' => Committee::TYPES,
            'roles' => Committee::ROLES,
            'can' => [
                'create' => $user->can('committees.create'),
                'update' => $user->can('committees.update'),
                'delete' => $user->can('committees.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $committee = Committee::create($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$committee->name} created."]);

        return back();
    }

    public function update(Request $request, Committee $committee): RedirectResponse
    {
        $committee->update($request->validate($this->rules($committee)));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$committee->name} updated."]);

        return back();
    }

    public function destroy(Committee $committee): RedirectResponse
    {
        $committee->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$committee->name} deleted."]);

        return back();
    }

    public function addMember(Request $request, Committee $committee): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'uuid', 'exists:members,id', Rule::unique('committee_members')->where('committee_id', $committee->id)],
        ], ['member_id.unique' => 'That member is already on this committee.']);

        $committee->memberships()->create(['member_id' => $data['member_id'], 'role' => 'Member', 'joined_at' => now()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Committee member added.']);

        return back();
    }

    public function updateMember(Request $request, Committee $committee, CommitteeMember $committeeMember): RedirectResponse
    {
        abort_unless($committeeMember->committee_id === $committee->id, 404);

        $data = $request->validate(['role' => ['required', Rule::in(Committee::ROLES)]]);

        DB::transaction(function () use ($committee, $committeeMember, $data) {
            if ($data['role'] === 'Chairperson') {
                $this->assignChair($committee, $committeeMember->member_id);
            } else {
                $committeeMember->update(['role' => $data['role']]);
                if ($committee->chairperson_id === $committeeMember->member_id) {
                    $committee->update(['chairperson_id' => null]);
                }
            }
        });

        return back();
    }

    public function setChair(Request $request, Committee $committee): RedirectResponse
    {
        $data = $request->validate(['member_id' => ['required', 'uuid', 'exists:members,id']]);

        DB::transaction(function () use ($committee, $data) {
            if (! $committee->memberships()->where('member_id', $data['member_id'])->exists()) {
                $committee->memberships()->create(['member_id' => $data['member_id'], 'role' => 'Member', 'joined_at' => now()]);
            }
            $this->assignChair($committee, $data['member_id']);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Chairperson updated.']);

        return back();
    }

    public function removeMember(Committee $committee, CommitteeMember $committeeMember): RedirectResponse
    {
        abort_unless($committeeMember->committee_id === $committee->id, 404);

        DB::transaction(function () use ($committee, $committeeMember) {
            if ($committee->chairperson_id === $committeeMember->member_id) {
                $committee->update(['chairperson_id' => null]);
            }
            $committeeMember->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Removed from the committee.']);

        return back();
    }

    private function assignChair(Committee $committee, string $memberId): void
    {
        // The outgoing chair stays on as Vice-Chairperson.
        $committee->memberships()->where('role', 'Chairperson')->where('member_id', '!=', $memberId)->update(['role' => 'Vice-Chairperson']);
        $committee->memberships()->where('member_id', $memberId)->update(['role' => 'Chairperson']);
        $committee->update(['chairperson_id' => $memberId]);
    }

    private function rules(?Committee $committee = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150', Rule::unique('committees', 'name')->ignore($committee?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'objectives' => ['nullable', 'string', 'max:2000'],
            'committee_type' => ['required', Rule::in(Committee::TYPES)],
            'meeting_schedule' => ['nullable', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:150'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'banner_url' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ];
    }

    /** @return array<string, mixed> */
    private function present(Committee $c): array
    {
        return [
            'id' => $c->id,
            'slug' => $c->slug,
            'name' => $c->name,
            'description' => $c->description,
            'objectives' => $c->objectives,
            'committee_type' => $c->committee_type,
            'chairperson_id' => $c->chairperson_id,
            'chairperson_name' => $c->chairperson?->full_name,
            'chairperson_photo' => $c->chairperson?->photo_url,
            'chairperson_initials' => $c->chairperson?->initials,
            'member_count' => (int) ($c->memberships_count ?? 0),
            'meeting_schedule' => $c->meeting_schedule,
            'location' => $c->location,
            'contact_email' => $c->contact_email,
            'banner_url' => $c->banner_url,
            'is_active' => $c->is_active,
        ];
    }
}
