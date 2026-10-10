<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Read-only, searchable directory of members. Deliberately leaves out
 * contact details, addresses and dates of birth (privacy) — staff who need
 * those use Member Management.
 */
class MemberDirectoryController extends Controller
{
    /** Statuses that count as "in the directory" (not pending or rejected sign-ups). */
    public const STATUSES = ['Active', 'Approved', 'Inactive', 'Suspended'];

    /** Age group => [min age, max age]. */
    public const AGE_GROUPS = [
        'Youth' => [0, 17],
        'Young Adult' => [18, 30],
        'Adult' => [31, 59],
        'Senior Adult' => [60, 150],
    ];

    private const PUBLIC_COLUMNS = [
        'id', 'member_id', 'first_name', 'last_name', 'gender', 'date_of_birth', 'department', 'ministry',
        'membership_type', 'status', 'date_joined', 'city', 'baptized', 'photo_url',
    ];

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        // One page at a time (Phase 3, F07); the directory used to load every member.
        $page = $this->query($filters)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->select(self::PUBLIC_COLUMNS)
            ->paginate(\App\Support\ListQuery::perPage($request, 48))
            ->withQueryString();

        return Inertia::render('member-directory/index', [
            'members' => collect($page->items())->map(fn (Member $m) => $this->present($m))->values(),
            'pagination' => \App\Support\ListQuery::meta($page),
            'total' => Member::whereIn('status', self::STATUSES)->count(),
            'filters' => $filters,
            'options' => [
                'departments' => Member::whereIn('status', self::STATUSES)
                    ->whereNotNull('department')->where('department', '!=', '')
                    ->distinct()->orderBy('department')->pluck('department'),
                'age_groups' => array_keys(self::AGE_GROUPS),
                'statuses' => self::STATUSES,
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        // Streamed in chunks so a large directory never sits in memory at once.
        $members = $this->query($this->filters($request))
            ->orderBy('last_name')->orderBy('first_name')->orderBy('id')
            ->select(self::PUBLIC_COLUMNS)
            ->lazy(500);

        return response()->streamDownload(function () use ($members) {
            $out = fopen('php://output', 'w');
            \App\Support\Csv::put($out, ['Member ID', 'First Name', 'Last Name', 'Gender', 'Age Group', 'Department', 'Ministry', 'Membership Type', 'Status', 'Date Joined', 'City', 'Baptized']);
            foreach ($members as $m) {
                \App\Support\Csv::put($out, [
                    $m->member_id, $m->first_name, $m->last_name, $m->gender, $this->ageGroup($m),
                    $m->department, $m->ministry, $m->membership_type, $m->status,
                    $m->date_joined?->format('Y-m-d'), $m->city, $m->baptized ? 'Yes' : 'No',
                ]);
            }
            fclose($out);
        }, 'member-directory-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** @return array<string, string|null> */
    private function filters(Request $request): array
    {
        $pick = fn (string $key, array $allowed) => in_array($request->string($key)->toString(), $allowed, true)
            ? $request->string($key)->toString()
            : null;

        return [
            'search' => mb_substr($request->string('search')->trim()->toString(), 0, 100) ?: null,
            'department' => mb_substr($request->string('department')->toString(), 0, 100) ?: null,
            'age_group' => $pick('age_group', array_keys(self::AGE_GROUPS)),
            'gender' => $pick('gender', ['Male', 'Female']),
            'status' => $pick('status', self::STATUSES),
            'baptized' => $pick('baptized', ['yes', 'no']),
        ];
    }

    private function query(array $f): Builder
    {
        return Member::query()
            ->whereIn('status', self::STATUSES)
            ->when($f['search'], fn (Builder $q, string $s) => $q->search($s))
            ->when($f['department'], fn (Builder $q, string $d) => $q->where('department', $d))
            ->when($f['gender'], fn (Builder $q, string $g) => $q->where('gender', $g))
            ->when($f['status'], fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($f['baptized'], fn (Builder $q, string $b) => $q->where('baptized', $b === 'yes'))
            ->when($f['age_group'], function (Builder $q, string $group) {
                [$min, $max] = self::AGE_GROUPS[$group];
                $q->whereBetween('date_of_birth', [
                    now()->subYears($max + 1)->addDay()->toDateString(),
                    now()->subYears($min)->toDateString(),
                ]);
            });
    }

    /** @return array<string, mixed> */
    private function present(Member $m): array
    {
        return [
            'id' => $m->id,
            'member_id' => $m->member_id,
            'first_name' => $m->first_name,
            'last_name' => $m->last_name,
            'full_name' => $m->full_name,
            'initials' => $m->initials,
            'gender' => $m->gender,
            'age_group' => $this->ageGroup($m),
            'department' => $m->department,
            'ministry' => $m->ministry,
            'membership_type' => $m->membership_type,
            'status' => $m->status,
            'date_joined' => $m->date_joined?->format('Y-m-d'),
            'city' => $m->city,
            'baptized' => $m->baptized,
            'photo_url' => $m->photo_url,
        ];
    }

    private function ageGroup(Member $m): ?string
    {
        if (! $m->date_of_birth) {
            return null;
        }

        $age = (int) $m->date_of_birth->diffInYears(now());

        foreach (self::AGE_GROUPS as $name => [$min, $max]) {
            if ($age >= $min && $age <= $max) {
                return $name;
            }
        }

        return null;
    }
}
