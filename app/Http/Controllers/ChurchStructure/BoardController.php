<?php

namespace App\Http\Controllers\ChurchStructure;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\BoardMember;
use App\Models\Member;
use App\Rules\SafeUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Governing boards (Trustees, Deacons, Elders…) with a chairperson and
 * members who each hold a role and an optional term of office.
 */
class BoardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $selectedId = $request->string('board')->toString() ?: null;

        $boards = Board::query()
            ->with('chairperson:id,first_name,last_name,photo_url')
            ->withCount('memberships')
            ->orderBy('name')
            ->get()
            ->map(fn (Board $b) => $this->present($b));

        $selected = $selectedId ? Board::with('chairperson:id,first_name,last_name,photo_url')->withCount('memberships')->whereSlugOrKey($selectedId)->first() : null;

        return Inertia::render('boards/index', [
            'boards' => $boards,
            'selected' => $selected ? [
                ...$this->present($selected),
                'members' => $selected->memberships()
                    ->with('member:id,first_name,last_name,email,photo_url')
                    ->get()
                    ->sortBy(fn (BoardMember $m) => [$m->member_id === $selected->chairperson_id ? 0 : 1, $m->member?->last_name])
                    ->values()
                    ->map(fn (BoardMember $m) => [
                        'id' => $m->id,
                        'member_id' => $m->member_id,
                        'role' => $m->role,
                        'term_start' => $m->term_start?->format('Y-m-d'),
                        'term_end' => $m->term_end?->format('Y-m-d'),
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
            'types' => Board::TYPES,
            'roles' => Board::ROLES,
            'can' => [
                'create' => $user->can('boards.create'),
                'update' => $user->can('boards.update'),
                'delete' => $user->can('boards.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $board = Board::create($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$board->name} created."]);

        return back();
    }

    public function update(Request $request, Board $board): RedirectResponse
    {
        $board->update($request->validate($this->rules($board)));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$board->name} updated."]);

        return back();
    }

    public function destroy(Board $board): RedirectResponse
    {
        $board->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$board->name} deleted."]);

        return back();
    }

    public function addMember(Request $request, Board $board): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'uuid', 'exists:members,id', Rule::unique('board_members')->where('board_id', $board->id)],
            'term_start' => ['nullable', 'date'],
            'term_end' => ['nullable', 'date', 'after_or_equal:term_start'],
        ], ['member_id.unique' => 'That member is already on this board.']);

        $board->memberships()->create([...$data, 'role' => 'Member', 'joined_at' => now()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Board member added.']);

        return back();
    }

    public function updateMember(Request $request, Board $board, BoardMember $boardMember): RedirectResponse
    {
        abort_unless($boardMember->board_id === $board->id, 404);

        $data = $request->validate([
            'role' => ['sometimes', 'required', Rule::in(Board::ROLES)],
            'term_start' => ['sometimes', 'nullable', 'date'],
            'term_end' => ['sometimes', 'nullable', 'date', 'after_or_equal:term_start'],
        ]);

        DB::transaction(function () use ($board, $boardMember, $data) {
            if (($data['role'] ?? null) === 'Chairperson') {
                $this->assignChair($board, $boardMember->member_id);
                unset($data['role']);
            } elseif (isset($data['role']) && $board->chairperson_id === $boardMember->member_id) {
                $board->update(['chairperson_id' => null]);
            }
            $boardMember->update($data);
        });

        return back();
    }

    public function setChair(Request $request, Board $board): RedirectResponse
    {
        $data = $request->validate(['member_id' => ['required', 'uuid', 'exists:members,id']]);

        DB::transaction(function () use ($board, $data) {
            if (! $board->memberships()->where('member_id', $data['member_id'])->exists()) {
                $board->memberships()->create(['member_id' => $data['member_id'], 'role' => 'Member', 'joined_at' => now()]);
            }
            $this->assignChair($board, $data['member_id']);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Chairperson updated.']);

        return back();
    }

    public function removeMember(Board $board, BoardMember $boardMember): RedirectResponse
    {
        abort_unless($boardMember->board_id === $board->id, 404);

        DB::transaction(function () use ($board, $boardMember) {
            if ($board->chairperson_id === $boardMember->member_id) {
                $board->update(['chairperson_id' => null]);
            }
            $boardMember->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Removed from the board.']);

        return back();
    }

    private function assignChair(Board $board, string $memberId): void
    {
        // The outgoing chair stays on the board as Vice-Chairperson.
        $board->memberships()->where('role', 'Chairperson')->where('member_id', '!=', $memberId)->update(['role' => 'Vice-Chairperson']);
        $board->memberships()->where('member_id', $memberId)->update(['role' => 'Chairperson']);
        $board->update(['chairperson_id' => $memberId]);
    }

    private function rules(?Board $board = null): array
    {
        return [
            'name' => ['required', 'string', 'max:150', Rule::unique('boards', 'name')->ignore($board?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'mandate' => ['nullable', 'string', 'max:1000'],
            'board_type' => ['required', Rule::in(Board::TYPES)],
            'meeting_schedule' => ['nullable', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:150'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'banner_url' => ['nullable', 'string', 'max:500', new SafeUrl],
            'is_active' => ['boolean'],
        ];
    }

    /** @return array<string, mixed> */
    private function present(Board $b): array
    {
        return [
            'id' => $b->id,
            'slug' => $b->slug,
            'name' => $b->name,
            'description' => $b->description,
            'mandate' => $b->mandate,
            'board_type' => $b->board_type,
            'chairperson_id' => $b->chairperson_id,
            'chairperson_name' => $b->chairperson?->full_name,
            'chairperson_photo' => $b->chairperson?->photo_url,
            'chairperson_initials' => $b->chairperson?->initials,
            'member_count' => (int) ($b->memberships_count ?? 0),
            'meeting_schedule' => $b->meeting_schedule,
            'location' => $b->location,
            'contact_email' => $b->contact_email,
            'banner_url' => $b->banner_url,
            'is_active' => $b->is_active,
        ];
    }
}
