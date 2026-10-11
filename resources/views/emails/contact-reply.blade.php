<!DOCTYPE html>
<html>
<body style="margin:0;background:#f5f3ee;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <tr><td style="background:#1e3a5f;padding:20px 24px;color:#ffffff">
                @if (! empty($church['logo_url']))<img src="{{ $church['logo_url'] }}" alt="" height="40" style="vertical-align:middle;margin-right:10px">@endif
                <span style="font-size:18px;font-weight:bold">{{ $church['name'] ?? '' }}</span>
            </td></tr>
            <tr><td style="height:4px;background:#c9a227"></td></tr>
            <tr><td style="padding:28px 24px">
                <p style="margin:0 0 16px;font-size:15px">Dear {{ $contactMessage->name }},</p>
                <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-line">{{ $reply }}</p>
                <p style="margin:24px 0 0;font-size:14px">Blessings,<br><strong>{{ $staffName }}</strong><br>{{ $church['name'] ?? '' }}</p>

                <div style="margin-top:28px;padding:14px 16px;background:#f9fafb;border-left:3px solid #c9a227;font-size:13px;color:#4b5563">
                    <p style="margin:0 0 6px;font-weight:bold">Your message: <br> {{ $contactMessage->subject }}</p> <br>
                    <p style="margin:0;white-space:pre-line">{{ $contactMessage->message }}</p>
                </div>

                {{-- Earlier replies in this conversation (the newest one is the email above). --}}
                @foreach ($earlierReplies as $earlier)
                    <div style="margin-top:12px;padding:14px 16px;background:#f9fafb;border-left:3px solid #1e3a5f;font-size:13px;color:#4b5563">
                        <p style="margin:0 0 6px;font-weight:bold">Our reply on {{ $earlier->created_at?->format('j M Y, g:i A') }} ({{ $earlier->sent_by_name }})</p>
                        <p style="margin:0;white-space:pre-line">{{ $earlier->body }}</p>
                    </div>
                @endforeach
            </td></tr>
            <tr><td style="padding:14px 24px;background:#f9fafb;font-size:11px;color:#9ca3af">
                {{ collect([$church['address'] ?? null, $church['phone'] ?? null, $church['email'] ?? null])->filter()->implode(' · ') }}
            </td></tr>
        </table>
    </td></tr>
</table>
</body>
</html>
