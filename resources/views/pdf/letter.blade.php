<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $title }}</title>
<style>
    @include('pdf.partials.letterhead-style')
    body { font-family: DejaVu Serif, Georgia, serif; color: #1f2937; font-size: 12.5px; line-height: 1.7; }
    h2 { font-size: 16px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 18px; text-align: center; }
    .meta { font-size: 11px; color: #6b7280; margin-bottom: 18px; }
    .meta td { padding: 0; }
    .sign { margin-top: 56px; }
    .sign .line { border-top: 1px solid #1f2937; width: 300px; padding-top: 4px; }
</style>
</head>
<body>
@include('pdf.partials.letterhead', ['footerNote' => 'Issued electronically · Ref '.$number])

<table class="meta" style="width: 100%;"><tr>
    <td>Ref: {{ $number }}</td>
    <td style="text-align: right;">{{ now()->format('F j, Y') }}</td>
</tr></table>

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
</body>
</html>
