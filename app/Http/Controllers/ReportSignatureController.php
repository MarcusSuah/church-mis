<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Church\ReportController;
use App\Models\ReportSignature;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportSignatureController extends Controller
{
    private const PREFIX = 'data:image/png;base64,';

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(ReportController::TYPES))],
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'position' => ['required', Rule::in(array_keys(ReportSignature::POSITIONS))],
            'signature' => ['required', 'string', 'starts_with:'.self::PREFIX, 'max:500000'],
        ]);

        $user = $request->user();
        // Only the role that holds the position may sign it (ReportSignature::POSITION_ROLES).
        abort_unless(ReportSignature::roleCanSign($user, $data['position']), 403, 'Your role cannot sign as '.ReportSignature::POSITIONS[$data['position']].'.');

        $report = ['report_type' => $data['type'], 'period_from' => $data['from'], 'period_to' => $data['to']];
        $slot = $report + ['position' => $data['position']];

        if (ReportSignature::where($slot)->exists()) {
            throw ValidationException::withMessages([
                'signature' => 'This position has already signed this report.',
            ]);
        }
        $mine = ReportSignature::where($report)->where('user_id', $user->id)->first();
        if ($mine) {
            throw ValidationException::withMessages([
                'signature' => 'You have already signed this report as '.ReportSignature::POSITIONS[$mine->position].'. Each person signs one position.',
            ]);
        }

        $png = base64_decode(substr($data['signature'], strlen(self::PREFIX)), true);
        if ($png === false
            || strncmp($png, "\x89PNG\r\n\x1a\n", 8) !== 0
            || @getimagesizefromstring($png) === false) {
            throw ValidationException::withMessages(['signature' => 'The signature image is not valid.']);
        }

        // The hash is computed on the server from the live report, never taken from the browser.
        $hash = $this->currentHash($data['type'], $data['from'], $data['to']);

        $path = 'report-signatures/'.Str::uuid().'.png';
        Storage::disk('local')->put($path, $png);

        ReportSignature::create($slot + [
            'user_id' => $user->id,
            'signer_name' => $user->name,
            'signature_path' => $path,
            'data_hash' => $hash,
            'signed_at' => now(),
            'ip' => $request->ip(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => ReportSignature::POSITIONS[$data['position']].' signature saved.']);

        return back();
    }

    /** Signatures live on the private disk and are served only to authenticated users. */
    public function image(ReportSignature $signature): StreamedResponse
    {
        return Storage::disk('local')->response(
            $signature->signature_path,
            'signature.png',
            ['Cache-Control' => 'private, max-age=3600', 'Content-Type' => 'image/png'],
        );
    }

    /** The same fingerprint the Reports page compares signatures against. */
    private function currentHash(string $type, string $from, string $to): string
    {
        return app(ReportController::class)->fingerprint($type, $from, $to);
    }
}
