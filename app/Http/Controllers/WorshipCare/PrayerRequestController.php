<?php

namespace App\Http\Controllers\WorshipCare;

use App\Http\Controllers\Controller;
use App\Models\Leader;
use App\Models\PrayerRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff view of prayer requests — both ones members submit in the Member
 * Portal and ones staff log for others. Urgent active requests come first.
 * The list loads 15 at a time ("Load more").
 */
class PrayerRequestController extends Controller
{
    private const PAGE = 15;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = [
            'search' => $request->string('search')->trim()->toString() ?: null,
            'category' => in_array($request->string('category')->toString(), PrayerRequest::CATEGORIES, true) ? $request->string('category')->toString() : null,
            'status' => in_array($request->string('status')->toString(), PrayerRequest::STATUSES, true) ? $request->string('status')->toString() : null,
        ];
        $limit = max(self::PAGE, min(500, $request->integer('limit', self::PAGE)));

        $query = PrayerRequest::query()
            ->with('member:id,first_name,last_name,member_id')
            ->when($filters['search'], fn (Builder $q, string $s) => $q->where(function (Builder $w) use ($s) {
                $w->where('subject', 'like', "%{$s}%")
                    ->orWhere('request_details', 'like', "%{$s}%")
                    ->orWhere('category', 'like', "%{$s}%")
                    ->orWhere(fn (Builder $n) => $n->where('is_anonymous', false)->where('requester_name', 'like', "%{$s}%"));
            }))
            ->when($filters['category'], fn (Builder $q, string $c) => $q->where('category', $c))
            ->when($filters['status'], fn (Builder $q, string $st) => $q->where('status', $st));

        $total = (clone $query)->count();

        $requests = $query
            // Urgent + Active first, then other active, then newest.
            ->orderByRaw("CASE WHEN status = 'Active' AND is_urgent = 1 THEN 0 WHEN status = 'Active' THEN 1 ELSE 2 END")
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (PrayerRequest $pr) => $this->present($pr));

        return Inertia::render('prayer-requests/index', [
            'requests' => $requests,
            'total' => $total,
            'limit' => $limit,
            'pageSize' => self::PAGE,
            'filters' => $filters,
            'stats' => [
                'total' => PrayerRequest::count(),
                'active' => PrayerRequest::where('status', 'Active')->count(),
                'urgent' => PrayerRequest::where('status', 'Active')->where('is_urgent', true)->count(),
                'answered' => PrayerRequest::where('status', 'Answered')->count(),
            ],
            'categories' => PrayerRequest::CATEGORIES,
            'statuses' => PrayerRequest::STATUSES,
            // Who requests can be assigned to: active church leaders.
            'assignees' => Leader::where('is_active', true)->orderBy('display_order')->orderBy('last_name')->get(['title', 'first_name', 'last_name'])
                ->map(fn (Leader $l) => trim("{$l->first_name} {$l->last_name}"))->values(),
            'can' => [
                'create' => $user->can('prayer-requests.create'),
                'update' => $user->can('prayer-requests.update'),
                'delete' => $user->can('prayer-requests.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        PrayerRequest::create([...$this->validated($request), 'created_by' => $request->user()->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Prayer request added.']);

        return back();
    }

    public function update(Request $request, PrayerRequest $prayerRequest): RedirectResponse
    {
        $before = $prayerRequest->only(['status', 'response']);
        $prayerRequest->update($this->validated($request, $prayerRequest));
        $this->notifyRequester($prayerRequest, $before);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Prayer request updated.']);

        return back();
    }

    public function status(Request $request, PrayerRequest $prayerRequest): RedirectResponse
    {
        $before = $prayerRequest->only(['status', 'response']);
        $prayerRequest->update($request->validate(['status' => ['required', Rule::in(PrayerRequest::STATUSES)]]));
        $this->notifyRequester($prayerRequest, $before);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Marked {$prayerRequest->status}."]);

        return back();
    }

    public function destroy(PrayerRequest $prayerRequest): RedirectResponse
    {
        $prayerRequest->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Prayer request deleted.']);

        return back();
    }

    /** "I prayed" — counted once per person per request (per browser session). */
    public function pray(Request $request, PrayerRequest $prayerRequest): JsonResponse
    {
        $key = 'prayed.'.$prayerRequest->id;
        $already = $request->session()->has($key);

        if (! $already) {
            $prayerRequest->increment('prayer_count');
            $request->session()->put($key, true);
        }

        return response()->json(['prayer_count' => $prayerRequest->fresh()->prayer_count, 'already' => $already]);
    }

    /* ------------------------------------------------------------------ */

    private function validated(Request $request, ?PrayerRequest $existing = null): array
    {
        $data = $request->validate([
            'requester_name' => ['nullable', 'string', 'max:150'],
            'subject' => ['required', 'string', 'max:200'],
            'request_details' => ['required', 'string', 'max:5000'],
            'category' => ['required', Rule::in(PrayerRequest::CATEGORIES)],
            'is_anonymous' => ['boolean'],
            'is_urgent' => ['boolean'],
            'is_private' => ['boolean'],
            'status' => ['required', Rule::in(PrayerRequest::STATUSES)],
            'assigned_to' => ['nullable', 'string', 'max:150'],
            'response' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        // Unticked checkboxes mean "no" (the column defaults to private for portal requests).
        foreach (['is_anonymous', 'is_urgent', 'is_private'] as $flag) {
            $data[$flag] = $request->boolean($flag);
        }

        // An existing request keeps its stored name when the form sends none
        // (portal requests, and anonymous ones whose name is never sent to the browser).
        if ($existing && blank($data['requester_name'] ?? null)) {
            $data['requester_name'] = $existing->requester_name;
        }

        // requester_name is NOT NULL in the table.
        $data['requester_name'] = filled($data['requester_name'] ?? null) ? $data['requester_name'] : 'Anonymous';

        return $data;
    }

    /** Tell a portal member when their request is answered or gets a response. */
    private function notifyRequester(PrayerRequest $pr, array $before): void
    {
        $member = $pr->member;
        if (! $member) {
            return;
        }
        if ($pr->response && $pr->response !== $before['response']) {
            \App\Support\Notifier::member($member, 'Response to your prayer request', $pr->response, 'prayer', '/member-portal?tab=prayer');
        } elseif ($pr->status === 'Answered' && $before['status'] !== 'Answered') {
            \App\Support\Notifier::member($member, 'Prayer request answered', "Your prayer request \"{$pr->displaySubject()}\" was marked answered. Praise God!", 'prayer', '/member-portal?tab=prayer');
        }
    }

    /** @return array<string, mixed> */
    private function present(PrayerRequest $pr): array
    {
        // F04: an anonymous request never sends who asked to the browser.
        $anonymous = (bool) $pr->is_anonymous;

        return [
            'id' => $pr->id,
            'subject' => $pr->displaySubject(),
            'raw_subject' => $pr->subject,
            'request_details' => $pr->request_details,
            'category' => $pr->category,
            'requester' => $pr->displayName(),
            'requester_name' => $anonymous ? null : $pr->requester_name,
            'member_code' => $anonymous ? null : $pr->member?->member_id,
            'from_portal' => $pr->requester_member_id !== null,
            'is_anonymous' => $pr->is_anonymous,
            'is_urgent' => $pr->is_urgent,
            'is_private' => $pr->is_private,
            'status' => $pr->status,
            'assigned_to' => $pr->assigned_to,
            'prayer_count' => $pr->prayer_count,
            'response' => $pr->response,
            'notes' => $pr->notes,
            'resolved_at' => $pr->resolved_at?->toIso8601String(),
            'created_at' => $pr->created_at?->toIso8601String(),
        ];
    }
}