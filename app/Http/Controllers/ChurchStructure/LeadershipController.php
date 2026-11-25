<?php

namespace App\Http\Controllers\ChurchStructure;

use App\Enums\LeadershipRole;
use App\Http\Controllers\Controller;
use App\Models\Leader;
use App\Models\Member;
use App\Rules\SafeUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Church leadership directory (pastors, elders, deacons…). A leader can be
 * linked to a member record, which pre-fills their name, contact and photo.
 */
class LeadershipController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('leadership/index', [
            'leaders' => Leader::query()
                ->with('member:id,member_id')
                ->orderBy('display_order')
                ->orderBy('last_name')
                ->get()
                ->map(fn (Leader $l) => [
                    ...$l->only(['id', 'member_id', 'first_name', 'last_name', 'title', 'leadership_role', 'bio', 'photo_url', 'email', 'phone', 'office_location', 'display_order', 'is_active']),
                    'ordination_date' => $l->ordination_date?->format('Y-m-d'),
                    'start_date' => $l->start_date?->format('Y-m-d'),
                    'member_code' => $l->member?->member_id,
                ]),
            'memberOptions' => Inertia::optional(fn () => Member::query()
                ->whereIn('status', ['Active', 'Approved'])
                // Type-ahead: at most 50 matches for ?member_q= (F07); this used to load every member.
                ->search(mb_substr((string) request('member_q', ''), 0, 100))
                ->orderBy('last_name')->orderBy('first_name')
                ->limit(50)
                ->get(['id', 'member_id', 'first_name', 'last_name', 'email', 'phone', 'photo_url'])
                ->map(fn (Member $m) => [
                    'id' => $m->id,
                    'code' => $m->member_id,
                    'first_name' => $m->first_name,
                    'last_name' => $m->last_name,
                    'initials' => $m->initials,
                    'email' => $m->email,
                    'phone' => $m->phone,
                    'photo_url' => $m->photo_url,
                ])),
            'roles' => collect(LeadershipRole::cases())
                ->map(fn (LeadershipRole $role) => $role->value)
                ->values()
                ->all(),
            'can' => [
                'create' => $user->can('leadership.create'),
                'update' => $user->can('leadership.update'),
                'delete' => $user->can('leadership.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $leader = Leader::create($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$leader->first_name} {$leader->last_name} Church leader added successfully."]);

        return back();
    }

    public function update(Request $request, Leader $leader): RedirectResponse
    {
        $leader->update($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$leader->first_name} {$leader->last_name} hurch leader updated successfully."]);

        return back();
    }

    public function destroy(Leader $leader): RedirectResponse
    {
        $leader->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$leader->first_name} {$leader->last_name} hurch leader removed."]);

        return back();
    }

    private function rules(): array
    {
        return [
            'member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:150'],
            'leadership_role' => [
                'required',
                Rule::enum(LeadershipRole::class),
            ],
            'bio' => ['nullable', 'string', 'max:5000'],
            'photo_url' => ['nullable', 'string', 'max:500', new SafeUrl],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'office_location' => ['nullable', 'string', 'max:150'],
            'ordination_date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date'],
            'display_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['boolean'],
        ];
    }
}
