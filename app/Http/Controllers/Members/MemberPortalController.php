<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Baptism;
use App\Models\AttendanceRecord;
use App\Models\DocumentRequest;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Member;
use App\Models\Offering;
use App\Models\PrayerRequest;
use App\Models\Tithe;
use App\Models\User;
use App\Models\Wedding;
use App\Services\CertificateService;
use App\Support\Notifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Self-service area: a member sees only their own record, attendance,
 * giving (tithes + offerings + donations), prayer requests and documents.
 */
class MemberPortalController extends Controller
{
    /** Fields a member may edit about themselves once registered. */
    private const SELF_EDITABLE = [
        'phone', 'alt_phone', 'address', 'city', 'state', 'country',
        'occupation', 'employer', 'emergency_name', 'emergency_phone', 'emergency_relation',
    ];

    public function show(Request $request): Response
    {
        $user = $request->user();
        $member = $this->memberFor($user);

        return Inertia::render('member/portal', [
            'user' => ['name' => $user->name, 'email' => $user->email],
            'member' => $member ? $this->presentMember($member) : null,
            'portal' => $member ? $this->portalData($member) : null,
            'tab' => $request->string('tab')->toString() ?: 'overview',
            'church' => ['name' => config('church.name'), 'currency' => config('church.currency')],
            'options' => [
                'prayer_categories' => PrayerRequest::CATEGORIES,
                'document_types' => DocumentRequest::TYPES,
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function presentMember(Member $m): array
    {
        return [
            ...$m->only([
                'id', 'member_id', 'reg_ref', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'alt_phone',
                'photo_url', 'gender', 'marital_status', 'nationality', 'address', 'city', 'state', 'country',
                'occupation', 'employer', 'membership_type', 'department', 'ministry', 'baptized', 'status',
                'emergency_name', 'emergency_phone', 'emergency_relation',
            ]),
            'full_name' => trim(collect([$m->first_name, $m->middle_name, $m->last_name])->filter()->implode(' ')),
            'initials' => $m->initials,
            'date_of_birth' => $this->date($m->date_of_birth),
            'date_joined' => $this->date($m->date_joined),
            'baptism_date' => $this->date($m->baptism_date),
        ];
    }

    /** @return array<string, mixed> */
    private function portalData(Member $member): array
    {
        $attendance = $this->attendance($member);
        $attended = $attendance->whereIn('status', ['present', 'late'])->count();

        $giving = $this->giving($member);
        $yearStart = now()->startOfYear()->toDateString();
        $ytd = $giving->where('date', '>=', $yearStart);
        $last30 = $giving->where('date', '>=', now()->subDays(30)->toDateString());

        return [
            'stats' => [
                'years' => $member->date_joined ? (int) floor(Carbon::parse($member->date_joined)->diffInYears(now())) : null,
                'attendance_present' => $attended,
                'attendance_total' => $attendance->count(),
                'attendance_rate' => $attendance->count() ? (int) round($attended / $attendance->count() * 100) : null,
                'giving_ytd' => round((float) $ytd->sum('amount_base'), 2),
                'giving_ytd_tithes' => round((float) $ytd->where('type', 'Tithe')->sum('amount_base'), 2),
                'giving_ytd_other' => round((float) $ytd->where('type', '!=', 'Tithe')->sum('amount_base'), 2),
                'giving_30_days' => round((float) $last30->sum('amount_base'), 2),
            ],
            'attendance' => $attendance->take(100)->values(),
            'giving' => $giving->take(200)->values(),
            'prayer_requests' => $member->prayerRequests()->latest()->get()->map(fn (PrayerRequest $p) => [
                'id' => $p->id,
                'subject' => $p->subject,
                'request' => $p->request_details,
                'category' => $this->text($p->category),
                'status' => $this->text($p->status),
                'is_private' => (bool) $p->is_private,
                'assigned_to' => $p->assigned_to,
                'response' => $p->response,
                'created_at' => $p->created_at?->toIso8601String(),
            ]),
            'document_requests' => $member->documentRequests()->latest()->get()->map(fn (DocumentRequest $d) => [
                'id' => $d->id,
                'document_type' => $d->document_type,
                'notes' => $d->notes,
                'status' => $d->status,
                'staff_note' => $d->staff_note,
                'download_url' => in_array($d->status, ['Ready', 'Collected'], true) && $d->file_path
                    ? route('member.portal.document.download', $d) : null,
                'created_at' => $d->created_at?->toIso8601String(),
            ]),
            // Certificates/letters the church office has approved, ready to download.
            'issued_documents' => $this->issuedDocuments($member),
            'announcements' => Announcement::active()->orderByDesc('is_pinned')->latest()->limit(6)->get()
                ->map(fn (Announcement $a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'body' => $a->content,
                    'category' => $this->text($a->category),
                    'urgent' => $a->isUrgent(),
                    'date' => ($a->start_date ?? $a->created_at)?->toDateString(),
                ]),
            'events' => Event::upcoming()->where('is_public', true)->limit(6)->get()->map(fn (Event $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'start' => $e->start_date?->toIso8601String(),
                'location' => $e->location,
                'category' => $this->text($e->event_type),
            ]),
        ];
    }

    /** Attendance rows from attendance_records + attendance_sessions. */
    private function attendance(Member $member): Collection
    {
        return AttendanceRecord::query()
            ->where('member_id', $member->id)
            ->with('session')
            ->get()
            ->map(function (AttendanceRecord $r) {
                $status = $r->attendance_status instanceof \BackedEnum ? $r->attendance_status->value : (string) $r->attendance_status;
                $date = $r->session?->service_date ?? $r->service_date;

                return [
                    'id' => $r->id,
                    'service' => $r->session?->title ?: ($r->service_name ?: ($r->session?->typeLabel() ?? 'Service')),
                    'date' => $this->date($date),
                    'time' => $r->service_time ? substr((string) $r->service_time, 0, 5) : ($r->check_in_time?->format('H:i')),
                    'status' => $status ?: ($r->present ? 'present' : 'absent'),
                ];
            })
            ->sortByDesc('date')
            ->values();
    }

    /** Tithes, offerings and donations for this member, newest first. */
    private function giving(Member $member): Collection
    {
        $tithes = Tithe::where('member_id', $member->id)->get()->map(fn (Tithe $t) => [
            'id' => 't-'.$t->id, 'date' => $this->date($t->tithe_date), 'type' => 'Tithe',
            'fund' => $t->fund_name, 'method' => $t->payment_method, 'amount' => (float) $t->amount, 'currency' => $t->currency ?: \App\Support\Money::base(), 'amount_base' => $t->amountInBase(),
            'receipt' => $t->receipt_number ?: $t->reference_number,
        ]);
        $offerings = Offering::where('member_id', $member->id)->get()->map(fn (Offering $o) => [
            'id' => 'o-'.$o->id, 'date' => $this->date($o->offering_date), 'type' => $o->offering_type ?: 'Offering',
            'fund' => $o->fund_name, 'method' => $o->payment_method, 'amount' => (float) $o->amount, 'currency' => $o->currency ?: \App\Support\Money::base(), 'amount_base' => $o->amountInBase(),
            'receipt' => $o->receipt_number ?: $o->reference_number,
        ]);
        $donations = Donation::where('member_id', $member->id)->get()->map(fn (Donation $d) => [
            'id' => 'd-'.$d->id, 'date' => $this->date($d->donation_date), 'type' => 'Donation',
            'fund' => $d->fund_name, 'method' => $d->payment_method, 'amount' => (float) $d->amount, 'currency' => $d->currency ?: \App\Support\Money::base(), 'amount_base' => $d->amountInBase(),
            'receipt' => $d->receipt_number ?: $d->reference_number,
        ]);

        return $tithes->concat($offerings)->concat($donations)
            ->map(fn ($g) => [
                ...$g,
                'type' => $this->text($g['type']),
                'fund' => $this->text($g['fund']),
                'method' => ($m = $this->text($g['method'])) ? ucwords(str_replace('_', ' ', $m)) : null,
            ])
            ->sortByDesc('date')->values();
    }

    public function storePrayerRequest(Request $request): RedirectResponse
    {
        $member = $this->memberFor($request->user());
        abort_unless($member, 404);

        $validated = $request->validate([
            'category' => ['required', Rule::in(PrayerRequest::CATEGORIES)],
            'request' => ['required', 'string', 'min:10', 'max:2000'],
            'is_private' => ['boolean'],
        ]);

        $pr = PrayerRequest::create([
            'requester_member_id' => $member->id,
            'requester_name' => $member->full_name,
            'subject' => str($validated['request'])->limit(60)->toString(),
            'request_details' => $validated['request'],
            'category' => $validated['category'],
            'is_private' => $request->boolean('is_private', true),
            'status' => 'Active',
        ]);

        // F04: private requests don't put their text in the alert; only staff who can read prayer requests get it.
        Notifier::permission('prayer-requests.view', 'New prayer request',
            $pr->is_private ? "{$member->full_name} submitted a private prayer request." : "Prayer request submitted by {$member->full_name}: {$pr->subject}",
            'prayer', '/prayer-requests');
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Prayer request submitted. Our pastoral team will be praying with you.']);

        return back();
    }

    public function storeDocumentRequest(Request $request): RedirectResponse
    {
        $member = $this->memberFor($request->user());
        abort_unless($member, 404);

        $validated = $request->validate([
            'document_type' => ['required', Rule::in(DocumentRequest::TYPES)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $alreadyPending = $member->documentRequests()
            ->where('document_type', $validated['document_type'])
            ->where('status', 'Pending')
            ->exists();

        if ($alreadyPending) {
            return back()->withErrors(['document_type' => 'You already have a pending request for this document.']);
        }

        $member->documentRequests()->create([...$validated, 'status' => 'Pending']);

        Notifier::permission('certificates.view', 'Document request', "{$member->full_name} requested a {$validated['document_type']}.", 'member', '/certificates');
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Document request submitted. You will be notified when it is ready.']);

        return back();
    }

    /** Download an approved document (PDF generated when staff approved it). */
    public function downloadDocument(Request $request, DocumentRequest $documentRequest): \Symfony\Component\HttpFoundation\Response
    {
        $member = $this->memberFor($request->user());
        abort_unless($member && $documentRequest->member_id === $member->id, 404);
        abort_unless(in_array($member->status, Member::ACCEPTED, true), 403, 'Downloads are available once your membership has been approved.');
        abort_unless(in_array($documentRequest->status, ['Ready', 'Collected'], true), 403, 'This document has not been approved yet.');

        if (! $documentRequest->file_path || ! Storage::disk('local')->exists($documentRequest->file_path)) {
            $documentRequest->update(['file_path' => app(CertificateService::class)->issueDocument($documentRequest)]);
        }

        return Storage::disk('local')->download($documentRequest->file_path, str($documentRequest->document_type)->slug().'.pdf');
    }

    public function baptismCertificate(Request $request, Baptism $baptism): \Symfony\Component\HttpFoundation\Response
    {
        $member = $this->memberFor($request->user());
        abort_unless($member && $baptism->member_id === $member->id && $baptism->certificate_issued, 404);
        abort_unless(in_array($member->status, Member::ACCEPTED, true), 403, 'Downloads are available once your membership has been approved.');

        return app(CertificateService::class)->baptism($baptism)->download("baptism-certificate-{$baptism->certificate_number}.pdf");
    }

    public function marriageCertificate(Request $request, Wedding $wedding): \Symfony\Component\HttpFoundation\Response
    {
        $member = $this->memberFor($request->user());
        abort_unless($member && in_array($member->id, [$wedding->groom_member_id, $wedding->bride_member_id], true) && $wedding->certificate_issued, 404);
        abort_unless(in_array($member->status, Member::ACCEPTED, true), 403, 'Downloads are available once your membership has been approved.');

        return app(CertificateService::class)->wedding($wedding)->download("marriage-certificate-{$wedding->certificate_number}.pdf");
    }

    /** @return array<int, array<string, mixed>> */
    private function issuedDocuments(Member $member): array
    {
        $docs = [];
        foreach ($member->documentRequests()->whereIn('status', ['Ready', 'Collected'])->whereNotNull('file_path')->latest()->get() as $d) {
            $docs[] = ['id' => "doc-{$d->id}", 'name' => $d->document_type, 'type' => str_contains($d->document_type, 'Certificate') ? 'Certificate' : 'Document',
                'date' => $this->date($d->updated_at), 'url' => route('member.portal.document.download', $d)];
        }
        foreach (Baptism::where('member_id', $member->id)->where('certificate_issued', true)->get() as $b) {
            $docs[] = ['id' => "bap-{$b->id}", 'name' => 'Baptism Certificate', 'type' => 'Certificate',
                'date' => $this->date($b->certificate_date ?? $b->baptism_date), 'url' => route('member.portal.baptism-certificate', $b)];
        }
        foreach (Wedding::where('certificate_issued', true)->where(fn ($q) => $q->where('groom_member_id', $member->id)->orWhere('bride_member_id', $member->id))->get() as $w) {
            $docs[] = ['id' => "wed-{$w->id}", 'name' => 'Marriage Certificate', 'type' => 'Certificate',
                'date' => $this->date($w->certificate_date ?? $w->wedding_date), 'url' => route('member.portal.marriage-certificate', $w)];
        }

        return $docs;
    }

    /** CSV of the member's giving for a year (defaults to the current year). */
    public function givingStatement(Request $request): StreamedResponse
    {
        $member = $this->memberFor($request->user());
        abort_unless($member, 404);

        $year = (string) $request->integer('year', (int) now()->format('Y'));
        $rows = $this->giving($member)->filter(fn ($g) => str_starts_with((string) $g['date'], $year))->sortBy('date');
        $currency = config('church.currency');

        return response()->streamDownload(function () use ($rows, $member, $year, $currency) {
            $out = fopen('php://output', 'w');
            \App\Support\Csv::put($out, [config('church.name').' — Giving Statement '.$year]);
            \App\Support\Csv::put($out, [$member->full_name, $member->member_id]);
            \App\Support\Csv::put($out, []);
            // F26: each gift keeps its own currency; the total is converted to the base currency.
            \App\Support\Csv::put($out, ['Date', 'Type', 'Fund', 'Method', 'Amount', 'Currency', "Amount ({$currency})", 'Receipt']);
            foreach ($rows as $r) {
                \App\Support\Csv::put($out, [$r['date'], $r['type'], $r['fund'], $r['method'], number_format($r['amount'], 2, '.', ''), $r['currency'], number_format($r['amount_base'], 2, '.', ''), $r['receipt']]);
            }
            \App\Support\Csv::put($out, []);
            \App\Support\Csv::put($out, ['Total', '', '', '', '', '', number_format((float) $rows->sum('amount_base'), 2, '.', ''), '']);
            fclose($out);
        }, "giving-statement-{$year}.csv", ['Content-Type' => 'text/csv']);
    }

    /** First-time registration from the portal — always lands in the Pending queue. */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($this->memberFor($user)) {
            return back()->withErrors(['first_name' => 'You already have a membership record.']);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['nullable', 'string', 'in:Male,Female,Other'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'marital_status' => ['nullable', 'string', 'in:Single,Married,Widowed,Divorced'],
            'previous_church' => ['nullable', 'string', 'max:150'],
            'previous_denomination' => ['nullable', 'string', 'max:100'],
            'baptized' => ['boolean'],
            ...$this->contactRules(),
        ]);

        $member = Member::create([
            ...$validated,
            'user_id' => $user->id,
            'email' => $user->email,
            'status' => 'Pending',
            'membership_type' => 'Regular Member',
            'reg_ref' => Member::nextRegRef(),
        ]);

        Notifier::permission('members.view', 'New member registration', "New member registration from {$member->full_name}", 'member', '/pending-registrations');
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Registration submitted. The church office will review it shortly.']);

        return back();
    }

    public function update(Request $request): RedirectResponse
    {
        $member = $this->memberFor($request->user());
        abort_unless($member, 404);

        $member->update($request->validate($this->contactRules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profile updated successfully.']);

        return back();
    }

    /**
     * The member record for this login. A staff-created record with no login
     * yet is matched by email once and then linked — but only when this
     * login's email is verified, the login is member-only, and exactly one
     * unlinked record has that email (Phase 2, F05). Otherwise staff link it.
     */
    private function memberFor(User $user): ?Member
    {
        $member = Member::where('user_id', $user->id)->first();

        if (! $member && $user->email && $user->hasVerifiedEmail() && \App\Support\MemberAccounts::canLinkTo($user)) {
            $candidates = Member::whereNull('user_id')->where('email', $user->email)->limit(2)->get();
            if ($candidates->count() === 1) {
                $member = $candidates->first();
                $member->forceFill(['user_id' => $user->id])->saveQuietly();
            }
        }

        return $member;
    }

    /** @return array<string, array<int, mixed>> */
    private function contactRules(): array
    {
        return collect(self::SELF_EDITABLE)->mapWithKeys(fn (string $field) => [
            $field => ['nullable', 'string', str_contains($field, 'phone') ? 'max:30' : 'max:150'],
        ])->all();
    }

    /** Enum casts (payment method, offering type…) → plain text. */
    private function text(mixed $value): ?string
    {
        if ($value instanceof \BackedEnum) {
            return (string) $value->value;
        }
        if ($value instanceof \UnitEnum) {
            return $value->name;
        }

        return blank($value) ? null : (string) $value;
    }

    private function date(mixed $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        return $value instanceof \DateTimeInterface ? $value->format('Y-m-d') : Carbon::parse($value)->toDateString();
    }
}
