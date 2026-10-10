<?php

namespace App\Services;

use App\Models\Baptism;
use App\Models\DocumentRequest;
use App\Models\Donation;
use App\Models\Member;
use App\Models\Offering;
use App\Models\Tithe;
use App\Models\Wedding;
use App\Support\CertificateMessages;
use App\Support\ChurchLogo;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Builds the church's PDF documents: certificates (membership, baptism,
 * marriage), letters (recommendation, transfer, good standing, pastoral
 * reference) and the annual giving statement.
 */
class CertificateService
{
    public const LETTERS = ['Church Recommendation Letter', 'Transfer Letter', 'Good Standing Letter', 'Pastoral Reference Letter'];

    /** Generate the PDF for an approved document request and store it. Returns the storage path. */
    public function issueDocument(DocumentRequest $request): string
    {
        $member = $request->member;
        $type = $request->document_type;
        $number = $this->number('DOC', $request->created_at ?? now(), $request->id);

        $pdf = match (true) {
            $type === 'Membership Certificate' => $this->render('membership', $member->full_name, $member->date_joined, $number, $member->member_id,
                [], $request->template, $request->custom_message),
            $type === 'Baptism Certificate' => $this->baptismFromMember($member, $number, $request->template, $request->custom_message),
            $type === 'Annual Giving Statement' => $this->givingStatement($member, (int) now()->format('Y')),
            default => $this->letter($type, $member, $request->notes, $number),
        };

        $path = "certificates/{$request->id}.pdf";
        Storage::disk('local')->put($path, $pdf->output());

        return $path;
    }

    public function baptism(Baptism $b, ?string $template = null, ?string $message = null): \Barryvdh\DomPDF\PDF
    {
        return $this->render('baptism', $b->candidate_name, $b->baptism_date,
            $b->certificate_number ?: $this->number('BSSC', $b->baptism_date, $b->id), $b->member?->member_id,
            array_filter(['Officiant' => $b->officiant, 'Location' => $b->location]),
            $template ?? $b->certificate_template, $message ?? $b->certificate_message);
    }

    public function wedding(Wedding $w, ?string $template = null, ?string $message = null): \Barryvdh\DomPDF\PDF
    {
        return $this->render('marriage', "{$w->groom_name} & {$w->bride_name}", $w->wedding_date,
            $w->certificate_number ?: $this->number('WSSC', $w->wedding_date, $w->id), null,
            array_filter(['Officiant' => $w->officiant, 'Location' => $w->location]),
            $template ?? $w->certificate_template, $message ?? $w->certificate_message, $w->officiant);
    }

    /**
     * One-page A4 landscape certificate in the chosen template. The message is
     * the admin's own text, or one of the stock messages for the type.
     */
    public function render(string $type, string $name, mixed $date, string $number, ?string $memberId, array $details = [], ?string $template = null, ?string $message = null, ?string $officiant = null): \Barryvdh\DomPDF\PDF
    {
        $template = array_key_exists((string) $template, CertificateMessages::TEMPLATES) ? $template : 'classic';
        $c = CertificateMessages::TYPES[$type];
        $dateText = $date ? Carbon::parse($date)->format('F j, Y') : null;
        $issued = now();
        $pastor = config('church.senior_pastor');
        $secretary = config('church.church_secretary');
        $signers = [
            ['name' => $type === 'marriage' && $officiant ? $officiant : ($pastor && $pastor !== 'Senior Pastor' ? $pastor : ' '), 'role' => $type === 'marriage' ? 'Officiating Minister' : 'Senior Pastor, '.config('church.short_name')],
            ['name' => $secretary ?: ' ', 'role' => $c['signers'][1]],
        ];
        $len = mb_strlen($name);

        @mkdir(storage_path('fonts'), 0775, true);

        return Pdf::loadView("pdf.certificates.{$template}", [
            'c' => $c,
            'type' => $type,
            'name' => $name,
            // Long names get a smaller font so everything stays on one page.
            'nameSize' => $len > 34 ? 30 : ($len > 26 ? 36 : ($len > 18 ? 42 : 48)),
            'message' => CertificateMessages::fill(trim((string) $message) !== '' ? $message : CertificateMessages::random($type), $name, $dateText),
            'issued' => $issued->format('F j, Y'),
            'dayOrdinal' => $issued->format('jS'),
            'monthYear' => $issued->format('F, Y'),
            'number' => $number,
            'memberId' => $memberId,
            'detailLine' => collect($details)->map(fn ($v, $k) => "{$k}: {$v}")->implode(' · '),
            'signers' => $signers,
            'logo' => ChurchLogo::dataUri(),
            'church' => config('church'),
        ])->setPaper([0, 0, 842, 595])->setOption(['isFontSubsettingEnabled' => true, 'defaultFont' => 'DejaVu Serif']);
    }

    /** Next sequential number for a baptism/marriage certificate, e.g. BSSC-2026-004. */
    public function nextNumber(string $prefix, string $table): string
    {
        $year = now()->format('Y');
        $last = \DB::table($table)->where('certificate_number', 'like', "{$prefix}-{$year}-%")->orderByDesc('certificate_number')->value('certificate_number');
        $n = $last ? ((int) substr($last, strrpos($last, '-') + 1)) + 1 : 1;

        return sprintf('%s-%s-%03d', $prefix, $year, $n);
    }

    /* ------------------------------------------------------------------ */

    private function baptismFromMember(Member $member, string $number, ?string $template = null, ?string $message = null): \Barryvdh\DomPDF\PDF
    {
        $record = Baptism::where('member_id', $member->id)->latest('baptism_date')->first();
        if ($record) {
            return $this->baptism($record, $template, $message);
        }

        return $this->render('baptism', $member->full_name, $member->baptism_date, $number, $member->member_id, [], $template, $message);
    }

    private function letter(string $type, Member $member, ?string $purpose, string $number): \Barryvdh\DomPDF\PDF
    {
        $body = match ($type) {
            'Transfer Letter' => "This letter certifies that {$member->full_name} is a member of {church} and has requested a transfer of membership. We commend {them} to your fellowship and ask that you receive {them} in Christian love.",
            'Good Standing Letter' => "This is to certify that {$member->full_name} is a member in good standing of {church}, faithfully participating in the life and ministry of the church.",
            'Pastoral Reference Letter' => "I am pleased to provide this pastoral reference for {$member->full_name}, a member of {church}. {They} {is} known to us as a person of good character and Christian commitment.",
            default => "We are pleased to recommend {$member->full_name}, a member of {church}, to your care and fellowship. {They} {is} a faithful member and we commend {them} to you.",
        };
        $female = strtolower((string) $member->gender) === 'female';
        $body = strtr($body, [
            '{church}' => config('church.name'),
            '{them}' => $female ? 'her' : 'him',
            '{They}' => $female ? 'She' : 'He',
            '{is}' => 'is',
        ]);

        return Pdf::loadView('pdf.letter', [
            'title' => $type,
            'member' => $member,
            'body' => $body,
            'purpose' => $purpose,
            'number' => $number,
            'church' => config('church'),
        ])->setPaper('a4');
    }

    private function givingStatement(Member $member, int $year): \Barryvdh\DomPDF\PDF
    {
        $rows = collect()
            ->concat(Tithe::where('member_id', $member->id)->whereYear('tithe_date', $year)->get()->map(fn ($t) => ['date' => $t->tithe_date, 'type' => 'Tithe', 'fund' => $t->fund_name, 'amount' => (float) $t->amount, 'currency' => $t->currency ?: \App\Support\Money::base(), 'amount_base' => $t->amountInBase(), 'receipt' => $t->receipt_number]))
            ->concat(Offering::where('member_id', $member->id)->whereYear('offering_date', $year)->get()->map(fn ($o) => ['date' => $o->offering_date, 'type' => $o->offering_type ?: 'Offering', 'fund' => $o->fund_name, 'amount' => (float) $o->amount, 'currency' => $o->currency ?: \App\Support\Money::base(), 'amount_base' => $o->amountInBase(), 'receipt' => $o->receipt_number]))
            ->concat(Donation::where('member_id', $member->id)->whereYear('donation_date', $year)->get()->map(fn ($d) => ['date' => $d->donation_date, 'type' => 'Donation', 'fund' => $d->fund_name, 'amount' => (float) $d->amount, 'currency' => $d->currency ?: \App\Support\Money::base(), 'amount_base' => $d->amountInBase(), 'receipt' => $d->receipt_number]))
            ->map(fn ($r) => [...$r, 'type' => $r['type'] instanceof \BackedEnum ? $r['type']->value : $r['type']])
            ->sortBy('date')->values();

        return Pdf::loadView('pdf.giving-statement', [
            'member' => $member,
            'year' => $year,
            'rows' => $rows,
            'total' => $rows->sum('amount_base'),
            'church' => config('church'),
        ])->setPaper('a4');
    }

    private function number(string $prefix, mixed $date, string $id): string
    {
        return sprintf('%s-%s-%s', $prefix, Carbon::parse($date ?? now())->format('Y'), strtoupper(substr(str_replace('-', '', $id), 0, 6)));
    }
}
