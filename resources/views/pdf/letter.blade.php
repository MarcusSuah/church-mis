<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $title }}</title>
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.7; margin: 40px 55px; }
    .head { border-bottom: 3px solid #c9a227; padding-bottom: 10px; margin-bottom: 28px; }
    .church { font-size: 20px; font-weight: bold; color: #1e3a5f; }
    .contact { font-size: 11px; color: #6b7280; }
    h2 { font-size: 16px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 18px; }
    .meta { font-size: 11px; color: #6b7280; margin-bottom: 18px; }
    .sign { margin-top: 60px; }
    .sign .line { border-top: 1px solid #1f2937; width: 220px; padding-top: 4px; }
    .foot { position: fixed; bottom: 0; left: 0; right: 0; font-size: 10px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
    <div class="head">
        <div class="church">{{ $church['name'] ?? '' }}</div>
        <div class="contact">{{ collect([$church['address'] ?? null, $church['phone'] ?? null, $church['email'] ?? null])->filter()->implode(' · ') }}</div>
    </div>

    <div class="meta">Ref: {{ $number }} &nbsp;·&nbsp; Date: {{ now()->format('F j, Y') }}</div>
    <h2>{{ $title }}</h2>

    <p>To whom it may concern,</p>
    <p>{{ $body }}</p>
    <p>
        Member: <strong>{{ $member->full_name }}</strong>
        @if ($member->member_id) &nbsp;·&nbsp; Member ID: {{ $member->member_id }} @endif
        @if ($member->date_joined) &nbsp;·&nbsp; Member since {{ \Illuminate\Support\Carbon::parse($member->date_joined)->format('F j, Y') }} @endif
    </p>
    @if ($purpose)
        <p>Purpose stated by the member: {{ $purpose }}</p>
    @endif
    <p>Please do not hesitate to contact the church office should you need any further information.</p>
    <p>In Christ's service,</p>

    <div class="sign">
        @php($pastor = $church['senior_pastor'] ?? null)
        <div class="line">@if ($pastor && $pastor !== 'Senior Pastor'){{ $pastor }}<br>@endif Senior Pastor, {{ $church['name'] ?? '' }}</div>
    </div>

    <div class="foot">This document was issued electronically by {{ $church['name'] ?? '' }} (Ref {{ $number }}).</div>
</body>
</html>
