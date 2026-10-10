@php
    $title = $type === 'baptism' ? 'Certificate of Baptism' : 'Certificate of Membership';
    $date = $type === 'baptism'
        ? ($member->baptism_date ? \Illuminate\Support\Carbon::parse($member->baptism_date)->format('F j, Y') : null)
        : ($member->date_joined ? \Illuminate\Support\Carbon::parse($member->date_joined)->format('F j, Y') : null);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $title }} — {{ $member->full_name }}</title>
    <style>
        @page { size: A4 landscape; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #1e3a5f; background: #f3f1ec; }
        .sheet { width: 297mm; height: 210mm; margin: 0 auto; padding: 14mm; background: #fff; }
        .frame { height: 100%; border: 3px solid #c9a227; outline: 1px solid #c9a227; outline-offset: -10px; padding: 18mm 22mm; text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .church { font-size: 15pt; letter-spacing: 3px; text-transform: uppercase; color: #8a6d12; }
        h1 { font-size: 34pt; margin: 10mm 0 6mm; font-weight: normal; }
        .lead { font-size: 13pt; color: #555; }
        .name { font-size: 28pt; margin: 6mm auto; padding-bottom: 3mm; border-bottom: 1px solid #c9a227; display: inline-block; min-width: 140mm; }
        .meta { font-size: 11pt; color: #555; margin-top: 4mm; }
        .signs { display: flex; justify-content: space-around; margin-top: 18mm; font-size: 11pt; }
        .sign { width: 70mm; border-top: 1px solid #1e3a5f; padding-top: 2mm; }
        .print { position: fixed; top: 12px; right: 12px; font-family: sans-serif; }
        @media print { .print { display: none; } body { background: #fff; } }
    </style>
</head>
<body>
    <button class="print" onclick="window.print()">Print / Save as PDF</button>
    <div class="sheet">
        <div class="frame">
            <div class="church">{{ $church['name'] ?? config('app.name') }}</div>
            <h1>{{ $title }}</h1>
            <div class="lead">This is to certify that</div>
            <div class="name">{{ $member->full_name }}</div>
            <div class="lead">
                @if ($type === 'baptism')
                    was baptized as a believer in the name of the Father, the Son and the Holy Spirit
                @else
                    is a member in good standing of this church
                @endif
                @if ($date) on {{ $date }}@endif.
            </div>
            <div class="meta">Member ID: {{ $member->member_id }} · Issued {{ now()->format('F j, Y') }}</div>
            <div class="signs">
                <div class="sign">{{ $church['senior_pastor'] ?? 'Senior Pastor' }}<br><small>Senior Pastor</small></div>
                <div class="sign">Church Clerk</div>
            </div>
        </div>
    </div>
</body>
</html>
