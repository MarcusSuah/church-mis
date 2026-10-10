<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\Member;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Households: a family groups linked church members and non-members
 * (usually children) under one address, with exactly one Head of Household.
 * A church member can belong to only one family.
 */
class FamilyController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();

        $families = Family::query()
            ->with(['members.member:id,member_id,first_name,last_name,phone,email,date_of_birth,status,photo_url'])
            ->when($search !== '', function (Builder $q) use ($search) {
                $q->where(function (Builder $w) use ($search) {
                    $w->where('family_name', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhereHas('members', fn (Builder $m) => $m->where('name', 'like', "%{$search}%")
                            ->orWhereHas('member', fn (Builder $mm) => $mm->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")));
                });
            })
            ->orderBy('family_name')
            ->get()
            ->map(fn (Family $f) => $this->present($f));

        return Inertia::render('families/index', [
            'families' => $families,
            'filters' => ['search' => $search !== '' ? $search : null],
            'stats' => [
                'total' => Family::count(),
                'active' => Family::where('status', 'Active')->count(),
                'members' => FamilyMember::count(),
                'children' => FamilyMember::where('role', 'Child')->count(),
            ],
            'roles' => FamilyMember::ROLES,
            // Only loaded when a modal asks for it (partial reload).
            'memberOptions' => Inertia::optional(fn () => Member::query()
                ->whereIn('status', ['Active', 'Approved', 'Inactive', 'Suspended', 'Pending', 'Under Review'])
                ->whereDoesntHave('familyMembership')
                ->orderBy('last_name')->orderBy('first_name')
                ->get(['id', 'member_id', 'reg_ref', 'first_name', 'last_name', 'phone', 'email', 'address', 'city', 'state', 'country', 'date_of_birth'])
                ->map(fn (Member $m) => [
                    'id' => $m->id,
                    'label' => $m->full_name,
                    'code' => $m->member_id ?: $m->reg_ref,
                    'phone' => $m->phone,
                    'email' => $m->email,
                    'address' => $m->address,
                    'city' => $m->city,
                    'state' => $m->state,
                    'country' => $m->country,
                ])),
            'can' => MemberController::abilities($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            ...$this->familyRules(),
            'head_member_id' => ['nullable', 'uuid', 'exists:members,id', Rule::unique('family_members', 'member_id')],
            'head_name' => ['required_without:head_member_id', 'nullable', 'string', 'max:150'],
        ], [
            'head_member_id.unique' => 'That member already belongs to another family.',
            'head_name.required_without' => 'Choose or type the head of household.',
        ]);

        $family = DB::transaction(function () use ($data) {
            $family = Family::create(collect($data)->only((new Family)->getFillable())->all() + ['status' => 'Active']);
            $family->members()->create([
                'member_id' => $data['head_member_id'] ?? null,
                'name' => ($data['head_member_id'] ?? null) ? null : $data['head_name'],
                'role' => FamilyMember::HEAD,
                'phone' => ($data['head_member_id'] ?? null) ? null : ($data['phone'] ?? null),
                'email' => ($data['head_member_id'] ?? null) ? null : ($data['email'] ?? null),
            ]);

            return $family;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$family->family_name} created successfully."]);
        Inertia::flash('selectFamily', $family->id);

        return back();
    }

    public function update(Request $request, Family $family): RedirectResponse
    {
        $family->update($request->validate([
            ...$this->familyRules(),
            'status' => ['required', Rule::in(Family::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$family->family_name} updated."]);

        return back();
    }

    public function destroy(Family $family): RedirectResponse
    {
        $name = $family->family_name;
        $family->delete(); // household rows cascade; member records are untouched

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} deleted."]);

        return back();
    }

    public function addMember(Request $request, Family $family): RedirectResponse
    {
        $data = $request->validate($this->memberRules(), $this->memberMessages());

        $this->guardSingleHead($family, $data['role']);

        $family->members()->create($this->memberPayload($data));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Family member added.']);

        return back();
    }

    public function updateMember(Request $request, Family $family, FamilyMember $familyMember): RedirectResponse
    {
        abort_unless($familyMember->family_id === $family->id, 404);

        $data = $request->validate($this->memberRules($familyMember), $this->memberMessages());

        $this->guardSingleHead($family, $data['role'], $familyMember);

        $familyMember->update($this->memberPayload($data));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Family member updated.']);

        return back();
    }

    /** Hand the Head of Household role to another person in the same family. */
    public function makeHead(Family $family, FamilyMember $familyMember): RedirectResponse
    {
        abort_unless($familyMember->family_id === $family->id, 404);

        DB::transaction(function () use ($family, $familyMember) {
            $family->members()->where('role', FamilyMember::HEAD)->where('id', '!=', $familyMember->id)->update(['role' => 'Spouse']);
            $familyMember->update(['role' => FamilyMember::HEAD]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$familyMember->displayName()} is now head of household."]);

        return back();
    }

    public function removeMember(Family $family, FamilyMember $familyMember): RedirectResponse
    {
        abort_unless($familyMember->family_id === $family->id, 404);

        if ($familyMember->role === FamilyMember::HEAD && $family->members()->count() > 1) {
            throw ValidationException::withMessages(['member' => 'Make someone else head of household before removing this person.']);
        }

        $familyMember->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Removed from the family.']);

        return back();
    }

    public function export(): StreamedResponse
    {
        $families = Family::with('members.member')->orderBy('family_name')->get();

        return response()->streamDownload(function () use ($families) {
            $out = fopen('php://output', 'w');
            \App\Support\Csv::put($out, ['Family', 'Status', 'Address', 'City', 'State', 'Country', 'Family Phone', 'Family Email', 'Person', 'Role', 'Member ID', 'Date of Birth']);
            foreach ($families as $f) {
                foreach ($this->sortedMembers($f) as $fm) {
                    \App\Support\Csv::put($out, [
                        $f->family_name, $f->status, $f->address, $f->city, $f->state, $f->country, $f->phone, $f->email,
                        $fm->displayName(), $fm->role, $fm->member?->member_id,
                        ($fm->member?->date_of_birth ?? $fm->date_of_birth)?->format('Y-m-d'),
                    ]);
                }
            }
            fclose($out);
        }, 'families-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    /* ------------------------------------------------------------------ */

    private function familyRules(): array
    {
        return [
            'family_name' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ];
    }

    private function memberRules(?FamilyMember $existing = null): array
    {
        return [
            'member_id' => [
                'nullable', 'uuid', 'exists:members,id',
                Rule::unique('family_members', 'member_id')->ignore($existing?->id),
            ],
            'name' => ['required_without:member_id', 'nullable', 'string', 'max:150'],
            'role' => ['required', Rule::in(FamilyMember::ROLES)],
            'date_of_birth' => ['nullable', 'date', 'before:tomorrow'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ];
    }

    private function memberMessages(): array
    {
        return [
            'member_id.unique' => 'That member already belongs to a family.',
            'name.required_without' => 'Choose a church member or type a name.',
        ];
    }

    /** Linked members keep their details on the member record, not here. */
    private function memberPayload(array $data): array
    {
        $linked = ! empty($data['member_id']);

        return [
            'member_id' => $linked ? $data['member_id'] : null,
            'name' => $linked ? null : $data['name'],
            'role' => $data['role'],
            'date_of_birth' => $linked ? null : ($data['date_of_birth'] ?? null),
            'phone' => $linked ? null : ($data['phone'] ?? null),
            'email' => $linked ? null : ($data['email'] ?? null),
        ];
    }

    private function guardSingleHead(Family $family, string $role, ?FamilyMember $except = null): void
    {
        if ($role !== FamilyMember::HEAD) {
            if ($except?->role === FamilyMember::HEAD) {
                throw ValidationException::withMessages(['role' => 'Use "Make Head of Household" on someone else first — a family needs a head.']);
            }

            return;
        }

        $hasOtherHead = $family->members()->where('role', FamilyMember::HEAD)
            ->when($except, fn ($q) => $q->where('id', '!=', $except->id))
            ->exists();

        if ($hasOtherHead) {
            throw ValidationException::withMessages(['role' => 'This family already has a head of household. Use "Make Head of Household" to change it.']);
        }
    }

    /** @return \Illuminate\Support\Collection<int, FamilyMember> */
    private function sortedMembers(Family $family)
    {
        return $family->members->sortBy(fn (FamilyMember $m) => [
            FamilyMember::ROLE_ORDER[$m->role] ?? 9,
            ($m->member?->date_of_birth ?? $m->date_of_birth)?->format('Y-m-d') ?? '9999',
        ])->values();
    }

    /** @return array<string, mixed> */
    private function present(Family $f): array
    {
        $members = $this->sortedMembers($f);
        $head = $members->firstWhere('role', FamilyMember::HEAD);

        return [
            'id' => $f->id,
            'family_name' => $f->family_name,
            'initials' => $this->initials($f->family_name),
            'address' => $f->address,
            'city' => $f->city,
            'state' => $f->state,
            'country' => $f->country,
            'phone' => $f->phone,
            'email' => $f->email,
            'status' => $f->status,
            'notes' => $f->notes,
            'created_at' => $f->created_at?->toIso8601String(),
            'head_name' => $head?->displayName(),
            'member_count' => $members->count(),
            'children_count' => $members->where('role', 'Child')->count(),
            'members' => $members->map(fn (FamilyMember $fm) => [
                'id' => $fm->id,
                'member_id' => $fm->member_id,
                'member_code' => $fm->member?->member_id,
                'name' => $fm->displayName(),
                'initials' => $this->initials($fm->displayName()),
                'role' => $fm->role,
                'status' => $fm->member?->status,
                'phone' => $fm->member?->phone ?? $fm->phone,
                'email' => $fm->member?->email ?? $fm->email,
                'date_of_birth' => ($fm->member?->date_of_birth ?? $fm->date_of_birth)?->format('Y-m-d'),
                'photo_url' => $fm->member?->photo_url,
                // raw values for the edit form
                'raw_name' => $fm->name,
                'raw_phone' => $fm->phone,
                'raw_email' => $fm->email,
                'raw_date_of_birth' => $fm->date_of_birth?->format('Y-m-d'),
            ])->all(),
        ];
    }

    private function initials(string $name): string
    {
        $words = preg_split('/\s+/', trim($name)) ?: [];

        return mb_strtoupper(collect($words)->filter()->take(2)->map(fn ($w) => mb_substr($w, 0, 1))->join(''));
    }
}
