<?php

namespace App\Http\Controllers\Members;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Members\StoreMemberRequest;
use App\Http\Requests\Members\UpdateMemberRequest;
use App\Models\Member;
use App\Support\Csv;
use App\Support\UserSessions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Access control lives on the routes (permission:members.* middleware) and
 * in the form requests, so the controller only has to report abilities to
 * the UI through the `can` prop.
 */
class MemberController extends Controller
{
    private const SORTABLE = ['member_id', 'first_name', 'last_name', 'status', 'membership_type', 'department', 'phone', 'email', 'date_joined', 'baptized', 'created_at'];

    /** Columns for CSV export / import, in order. */
    private const CSV_COLUMNS = [
        'member_id', 'reg_ref', 'first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth',
        'marital_status', 'nationality', 'phone', 'alt_phone', 'email', 'address', 'city', 'state', 'country',
        'status', 'membership_type', 'date_joined', 'department', 'ministry', 'baptized', 'baptism_date',
        'communion_participant', 'previous_church', 'previous_denomination', 'occupation', 'employer',
        'emergency_name', 'emergency_phone', 'emergency_relation', 'skills', 'notes',
    ];

    private const BULK_ACTIONS = [
        'approve' => 'Approved',
        'review' => 'Under Review',
        'activate' => 'Active',
        'suspend' => 'Suspended',
        'deactivate' => 'Inactive',
        'reject' => 'Rejected',
    ];

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $members = $this->filteredQuery($filters)
            ->orderBy($filters['sort_col'], $filters['sort_dir'])
            ->orderBy('first_name')
            ->paginate($filters['per_page'])
            ->withQueryString();

        // One grouped query feeds every stat card (was six separate COUNTs).
        $statusCounts = Member::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return Inertia::render('member-management/index', [
            'members' => $members,
            'filters' => $filters,
            'stats' => [
                'total' => (int) $statusCounts->sum(),
                'pending' => (int) ($statusCounts['Pending'] ?? 0),
                'under_review' => (int) ($statusCounts['Under Review'] ?? 0),
                'active' => (int) ($statusCounts['Active'] ?? 0),
                'inactive' => (int) (($statusCounts['Inactive'] ?? 0) + ($statusCounts['Suspended'] ?? 0)),
            ],
            'statusCounts' => $statusCounts,
            'options' => [
                'departments' => Member::whereNotNull('department')->where('department', '!=', '')->distinct()->orderBy('department')->pluck('department'),
                'membership_types' => Member::whereNotNull('membership_type')->distinct()->orderBy('membership_type')->pluck('membership_type'),
            ],
            'can' => $this->abilities($request),
        ]);
    }

    /**
     * Download the current (filtered) member list as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $query = $this->filteredQuery($filters)->orderBy($filters['sort_col'], $filters['sort_dir']);

        if ($request->boolean('registrations')) {
            $query->registrations();
        }

        // Export just the rows ticked in the table
        $ids = array_filter((array) $request->input('ids', []), fn ($id) => is_string($id) && Str::isUuid($id));
        if ($ids) {
            $query->whereIn('id', $ids);
        }

        $filename = 'members-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            Csv::put($out, self::CSV_COLUMNS);

            $query->chunk(500, function ($members) use ($out) {
                foreach ($members as $member) {
                    Csv::put($out, array_map(function (string $column) use ($member) {
                        $value = $member->getAttribute($column);

                        return match (true) {
                            is_bool($value) => $value ? 'Yes' : 'No',
                            $value instanceof \DateTimeInterface => $value->format('Y-m-d'),
                            default => $value,
                        };
                    }, self::CSV_COLUMNS));
                }
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * Import members from a CSV whose header row uses the export column
     * names (download an export to get a template). Rows with an email or
     * member_id that already exists update that member; others are created.
     */
    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = array_map(fn ($h) => strtolower(trim((string) $h, " \t\n\r\0\x0B\xEF\xBB\xBF")), fgetcsv($handle) ?: []);

        if (! in_array('first_name', $header, true) || ! in_array('last_name', $header, true)) {
            fclose($handle);

            return back()->withErrors(['file' => 'The CSV needs at least first_name and last_name columns. Export the list to get a template.']);
        }

        $created = $updated = $skipped = 0;
        $fillable = array_diff(self::CSV_COLUMNS, ['reg_ref']);

        while (($row = fgetcsv($handle)) !== false) {
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $data = collect($header)
                ->combine(array_pad(array_slice($row, 0, count($header)), count($header), null))
                ->only($fillable)
                ->map(fn ($v) => is_string($v) && trim($v) === '' ? null : (is_string($v) ? trim($v) : $v))
                ->all();

            if (blank($data['first_name'] ?? null) || blank($data['last_name'] ?? null)) {
                $skipped++;

                continue;
            }

            foreach (['baptized', 'communion_participant'] as $flag) {
                if (array_key_exists($flag, $data)) {
                    $data[$flag] = in_array(strtolower((string) $data[$flag]), ['1', 'yes', 'true', 'y'], true);
                }
            }

            foreach (['date_of_birth', 'date_joined', 'baptism_date'] as $date) {
                if (! empty($data[$date])) {
                    try {
                        $data[$date] = Carbon::parse($data[$date])->toDateString();
                    } catch (\Throwable) {
                        $data[$date] = null;
                    }
                }
            }

            if (! in_array($data['status'] ?? null, Member::STATUSES, true)) {
                $data['status'] = 'Active';
            }

            $existing = null;
            if (! empty($data['member_id'])) {
                $existing = Member::where('member_id', $data['member_id'])->first();
            }
            if (! $existing && ! empty($data['email'])) {
                $existing = Member::where('email', $data['email'])->first();
            }

            if ($existing) {
                $existing->update($data);
                $updated++;
            } else {
                Member::create($data);
                $created++;
            }
        }

        fclose($handle);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Import finished: {$created} added, {$updated} updated".($skipped ? ", {$skipped} skipped (missing name)" : '').'.',
        ]);

        return back();
    }

    /**
     * Save department / ministry / membership classification from the
     * "Assignment" tab without touching the rest of the record.
     */
    public function assign(Request $request, Member $member): RedirectResponse
    {
        $validated = $request->validate([
            'department' => ['nullable', 'string', 'max:100'],
            'ministry' => ['nullable', 'string', 'max:100'],
            'membership_type' => ['nullable', 'string', 'max:100'],
        ]);

        $member->update(collect($validated)->map(fn ($v) => $v === 'Unassigned' ? null : $v)->all());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Assignments saved for {$member->full_name}."]);

        return back();
    }

    /**
     * @return array{search: ?string, status: string, department: ?string, membership_type: ?string, baptized: ?string, sort_col: string, sort_dir: string, per_page: int}
     */
    private function filters(Request $request): array
    {
        $search = $request->string('search')->trim()->toString();
        $sortCol = $request->string('sort_col', 'last_name')->toString();
        $status = $request->string('status', 'All')->toString();
        $baptized = $request->string('baptized')->toString();

        return [
            'search' => $search !== '' ? $search : null,
            'status' => in_array($status, Member::STATUSES, true) ? $status : 'All',
            'department' => $request->string('department')->toString() ?: null,
            'membership_type' => $request->string('membership_type')->toString() ?: null,
            'baptized' => in_array($baptized, ['yes', 'no'], true) ? $baptized : null,
            'sort_col' => in_array($sortCol, self::SORTABLE, true) ? $sortCol : 'last_name',
            'sort_dir' => $request->string('sort_dir')->toString() === 'desc' ? 'desc' : 'asc',
            'per_page' => max(5, min(100, $request->integer('per_page', 10))),
        ];
    }

    private function filteredQuery(array $filters): Builder
    {
        return Member::query()
            // Indexed search (FULLTEXT on MySQL) instead of six leading-wildcard LIKEs (F17).
            ->when($filters['search'], fn (Builder $query, string $search) => $query->search($search))
            ->when($filters['status'] !== 'All', fn (Builder $q) => $q->where('status', $filters['status']))
            ->when($filters['department'] === 'Unassigned', fn (Builder $q) => $q->where(fn ($w) => $w->whereNull('department')->orWhere('department', '')))
            ->when($filters['department'] && $filters['department'] !== 'Unassigned', fn (Builder $q) => $q->where('department', $filters['department']))
            ->when($filters['membership_type'], fn (Builder $q, string $type) => $q->where('membership_type', $type))
            ->when($filters['baptized'], fn (Builder $q, string $b) => $q->where('baptized', $b === 'yes'));
    }

    public function store(StoreMemberRequest $request): RedirectResponse
    {
        $member = Member::create($this->profileData($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$member->full_name} was added."]);

        return back();
    }

    public function update(UpdateMemberRequest $request, Member $member): RedirectResponse
    {
        $member->update($this->profileData($request, $member));
        $this->syncLinkedUser($member, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$member->full_name} was updated."]);

        return back();
    }

    /**
     * Approve / reject / suspend a single member without resending the whole
     * profile (the old approve buttons PATCHed the full record, including
     * computed fields, and tripped validation).
     */
    public function updateStatus(Request $request, Member $member): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Member::STATUSES)],
        ]);

        $member->update(['status' => $validated['status']]);
        $this->syncLinkedUser($member, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$member->full_name} is now {$member->status}."]);

        return back();
    }

    /**
     * Validated profile data. An uploaded photo is stored like the public
     * registration's, and a blank Member ID never clears an existing one.
     *
     * @return array<string, mixed>
     */
    private function profileData(Request $request, ?Member $member = null): array
    {
        $data = $request->validated();
        unset($data['photo']);

        if ($request->hasFile('photo')) {
            $data['photo_url'] = asset('storage/'.$request->file('photo')->store('uploads/members', 'public'));
        }
        if ($member && blank($data['member_id'] ?? null)) {
            unset($data['member_id']);
        }

        return $data;
    }

    public function destroy(Member $member): RedirectResponse
    {
        $name = $member->full_name;
        $member->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} was removed."]);

        return back();
    }

    public function bulkStatus(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['uuid', 'exists:members,id'],
            'action' => ['required', 'string', Rule::in(array_keys(self::BULK_ACTIONS))],
        ]);

        $members = Member::whereIn('id', $validated['ids'])->get();

        foreach ($members as $member) {
            $member->update(['status' => self::BULK_ACTIONS[$validated['action']]]);
            $this->syncLinkedUser($member, $request);
        }

        $count = $members->count();
        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$count} ".str('member')->plural($count).' set to '.self::BULK_ACTIONS[$validated['action']].'.',
        ]);

        return back();
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['uuid', 'exists:members,id'],
        ]);

        $count = Member::whereIn('id', $validated['ids'])->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} ".str('member')->plural($count).' removed.']);

        return back();
    }

    /**
     * @return array{create: bool, update: bool, delete: bool}
     */
    public static function abilities(Request $request): array
    {
        $user = $request->user();

        return [
            'create' => $user->can('members.create'),
            'update' => $user->can('members.update'),
            'delete' => $user->can('members.delete'),
        ];
    }

    /**
     * When a self-registered member is approved or rejected, carry the
     * decision over to their login account so they can (or can't) use the
     * member portal.
     */
    private function syncLinkedUser(Member $member, Request $request): void
    {
        $user = $member->user;

        // Only member-only logins follow the member record's status. A staff
        // login must never be approved or rejected through a member record (F05).
        if (! $user || ! $user->isMemberOnly()) {
            return;
        }

        $userStatus = match ($member->status) {
            'Approved', 'Active' => UserStatus::APPROVED,
            'Rejected' => UserStatus::REJECTED,
            default => null,
        };

        if ($userStatus && $user->status !== $userStatus) {
            $user->forceFill([
                'status' => $userStatus,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ])->save();
        }

        // Suspended, inactive or rejected: end their sessions and API tokens
        // now. GuardAccess and the sign-in rules keep them out until reactivated.
        if ($member->wasChanged('status') && array_key_exists($member->status, Member::LOCKED_OUT)) {
            UserSessions::endAll($user);
        }
    }
}
