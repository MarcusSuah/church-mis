<?php

namespace App\Http\Controllers\Sacraments;

use App\Http\Controllers\Controller;
use App\Models\Baptism;
use App\Models\DocumentRequest;
use App\Models\Wedding;
use App\Services\CertificateService;
use App\Support\Notifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Support\CertificateMessages;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Certificates & documents desk: staff review document requests from the
 * Member Portal, approve them (a PDF is generated and the member can then
 * download it) or reject them, and issue baptism / marriage certificates.
 */
class CertificateController extends Controller
{
    public function __construct(private CertificateService $pdfs) {}

    public function index(Request $request): Response
    {
        return Inertia::render('certificates/index', [
            'requests' => DocumentRequest::with('member:id,first_name,last_name,member_id,photo_url,status')
                ->latest()->get()
                ->map(fn (DocumentRequest $d) => [
                    'id' => $d->id,
                    'document_type' => $d->document_type,
                    'notes' => $d->notes,
                    'status' => $d->status,
                    'staff_note' => $d->staff_note,
                    'has_file' => (bool) $d->file_path,
                    'template' => $d->template,
                    'custom_message' => $d->custom_message,
                    'cert_type' => CertificateMessages::typeFor($d->document_type),
                    'created_at' => $d->created_at?->toIso8601String(),
                    'updated_at' => $d->updated_at?->toIso8601String(),
                    'member' => $d->member ? [
                        'name' => $d->member->full_name,
                        'member_id' => $d->member->member_id,
                        'photo_url' => $d->member->photo_url,
                        'status' => $d->member->status,
                    ] : null,
                ]),
            'baptisms' => Baptism::latest('baptism_date')->get()->map(fn (Baptism $b) => [
                'id' => $b->id,
                'name' => $b->candidate_name,
                'photo' => $b->candidate_photo,
                'date' => $b->baptism_date?->format('Y-m-d'),
                'officiant' => $b->officiant,
                'certificate_number' => $b->certificate_number,
                'issued' => (bool) $b->certificate_issued,
                'issued_on' => $b->certificate_date?->format('Y-m-d'),
                'linked' => (bool) $b->member_id,
                'template' => $b->certificate_template,
                'message' => $b->certificate_message,
            ]),
            'weddings' => Wedding::latest('wedding_date')->get()->map(fn (Wedding $w) => [
                'id' => $w->id,
                'name' => "{$w->groom_name} & {$w->bride_name}",
                'date' => $w->wedding_date?->format('Y-m-d'),
                'officiant' => $w->officiant,
                'status' => $w->status,
                'certificate_number' => $w->certificate_number,
                'issued' => (bool) $w->certificate_issued,
                'issued_on' => $w->certificate_date?->format('Y-m-d'),
                'linked' => (bool) ($w->groom_member_id || $w->bride_member_id),
                'template' => $w->certificate_template,
                'message' => $w->certificate_message,
            ]),
            'templates' => CertificateMessages::TEMPLATES,
            'certTypes' => collect(CertificateMessages::TYPES)->map(fn ($t) => ['label' => $t['kicker'].' '.$t['title'], 'messages' => $t['messages']]),
            'can' => ['approve' => $request->user()->can('certificates.approve')],
        ]);
    }

    /* ---------------- document requests ---------------- */

    public function approve(Request $request, DocumentRequest $documentRequest): RedirectResponse
    {
        $data = $request->validate($this->designRules() + ['staff_note' => ['nullable', 'string', 'max:1000']]);
        if (! $documentRequest->member) {
            return back()->withErrors(['staff_note' => 'This request has no member attached.']);
        }

        $type = CertificateMessages::typeFor($documentRequest->document_type);
        $documentRequest->fill([
            'template' => $data['template'] ?? 'classic',
            // No custom text: keep one stock message so the certificate never changes later.
            'custom_message' => $type ? (trim((string) ($data['message'] ?? '')) ?: CertificateMessages::random($type)) : null,
        ]);
        $path = $this->pdfs->issueDocument($documentRequest);
        $documentRequest->fill(['status' => 'Ready', 'file_path' => $path, 'staff_note' => $data['staff_note'] ?? null])->save();

        Notifier::member($documentRequest->member, 'Your document is ready',
            "Your {$documentRequest->document_type} has been approved. You can download it from the Documents tab in your portal.",
            'success', '/member-portal?tab=documents');
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$documentRequest->document_type} approved and issued."]);

        return back();
    }

    public function reject(Request $request, DocumentRequest $documentRequest): RedirectResponse
    {
        $data = $request->validate(['staff_note' => ['required', 'string', 'max:1000']], ['staff_note.required' => 'Please give the member a reason.']);
        $documentRequest->update(['status' => 'Rejected', 'staff_note' => $data['staff_note']]);

        if ($documentRequest->member) {
            Notifier::member($documentRequest->member, 'Document request declined',
                "Your {$documentRequest->document_type} request was declined: {$data['staff_note']}", 'warning', '/member-portal?tab=documents');
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Request rejected.']);

        return back();
    }

    public function collected(DocumentRequest $documentRequest): RedirectResponse
    {
        if ($documentRequest->status !== 'Ready') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Only approved documents can be marked as collected.']);

            return back();
        }
        $documentRequest->update(['status' => 'Collected']);

        return back();
    }

    /** Staff preview/download of a request's PDF (generates a draft if not yet approved). */
    public function requestPdf(Request $request, DocumentRequest $documentRequest)
    {
        // Live preview with a different template / message from the approve dialog.
        if ($request->filled('template')) {
            $documentRequest->template = $request->query('template');
            $documentRequest->custom_message = $request->query('message') ?: $documentRequest->custom_message;
            $documentRequest->file_path = null;
        }
        if ($documentRequest->file_path && Storage::disk('local')->exists($documentRequest->file_path)) {
            return response(Storage::disk('local')->get($documentRequest->file_path), 200, $this->headers($documentRequest->document_type));
        }

        // Not approved yet: show a preview without storing it.
        $path = $this->pdfs->issueDocument($documentRequest);
        $content = Storage::disk('local')->get($path);
        Storage::disk('local')->delete($path);

        return response($content, 200, $this->headers($documentRequest->document_type.' (preview)'));
    }

    /* ---------------- baptism & marriage certificates ---------------- */

    public function issueBaptism(Request $request, Baptism $baptism): RedirectResponse
    {
        $data = $request->validate($this->designRules());
        $baptism->update([
            'certificate_template' => $data['template'] ?? $baptism->certificate_template ?? 'classic',
            'certificate_message' => trim((string) ($data['message'] ?? '')) ?: ($baptism->certificate_message ?: CertificateMessages::random('baptism')),
            'certificate_issued' => true,
            'certificate_number' => $baptism->certificate_number ?: $this->pdfs->nextNumber('BSSC', 'baptisms'),
            'certificate_date' => $baptism->certificate_date ?? now()->toDateString(),
        ]);
        if ($baptism->member) {
            Notifier::member($baptism->member, 'Baptism certificate issued', 'Your baptism certificate is ready to download in your portal.', 'success', '/member-portal?tab=documents');
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => "Baptism certificate {$baptism->certificate_number} issued."]);

        return back();
    }

    public function issueWedding(Request $request, Wedding $wedding): RedirectResponse
    {
        $data = $request->validate($this->designRules());
        $wedding->update([
            'certificate_template' => $data['template'] ?? $wedding->certificate_template ?? 'classic',
            'certificate_message' => trim((string) ($data['message'] ?? '')) ?: ($wedding->certificate_message ?: CertificateMessages::random('marriage')),
            'certificate_issued' => true,
            'certificate_number' => $wedding->certificate_number ?: $this->pdfs->nextNumber('WSSC', 'weddings'),
            'certificate_date' => $wedding->certificate_date ?? now()->toDateString(),
        ]);
        foreach ([$wedding->groom, $wedding->bride] as $spouse) {
            if ($spouse) {
                Notifier::member($spouse, 'Marriage certificate issued', 'Your marriage certificate is ready to download in your portal.', 'success', '/member-portal?tab=documents');
            }
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => "Marriage certificate {$wedding->certificate_number} issued."]);

        return back();
    }

    public function baptismPdf(Request $request, Baptism $baptism)
    {
        return $this->pdfs->baptism($baptism, $request->query('template'), $request->query('message'))->stream("baptism-certificate-{$baptism->certificate_number}.pdf");
    }

    public function weddingPdf(Request $request, Wedding $wedding)
    {
        return $this->pdfs->wedding($wedding, $request->query('template'), $request->query('message'))->stream("marriage-certificate-{$wedding->certificate_number}.pdf");
    }

    private function designRules(): array
    {
        return [
            'template' => ['nullable', \Illuminate\Validation\Rule::in(array_keys(CertificateMessages::TEMPLATES))],
            'message' => ['nullable', 'string', 'max:600'],
        ];
    }

    private function headers(string $name): array
    {
        return ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline; filename="'.str($name)->slug().'.pdf"'];
    }
}
