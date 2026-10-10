<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $title }}</title>
<style>
    @page { margin: 0; }
    body { margin: 0; font-family: DejaVu Serif, Georgia, serif; color: #1e3a5f; }
    .page { padding: 22pt; }
    .frame { border: 4pt double #c9a227; height: 470pt; padding: 70pt 50pt 34pt; text-align: center; }
    .church { font-size: 15px; letter-spacing: 4px; text-transform: uppercase; color: #8a6d12; }
    h1 { font-size: 36px; font-weight: normal; margin: 26px 0 14px; }
    .lead { font-size: 14px; color: #555; }
    .name { font-size: 30px; margin: 16px auto 10px; padding-bottom: 6px; border-bottom: 1px solid #c9a227; width: 70%; }
    .details { margin: 14px auto 0; font-size: 12px; color: #555; }
    .meta { margin-top: 10px; font-size: 11px; color: #777; }
    table.signs { width: 100%; margin-top: 95pt; font-size: 12px; }
    table.signs td { width: 50%; text-align: center; vertical-align: top; }
    .line { border-top: 1px solid #1e3a5f; width: 220px; margin: 0 auto; padding-top: 4px; }
</style>
</head>
<body>
<div class="page">
    <div class="frame">
        <div class="church">{{ $church['name'] ?? '' }}</div>
        <h1>{{ $title }}</h1>
        <div class="lead">This is to certify that</div>
        <div class="name">{{ $name }}</div>
        <div class="lead">{{ $line }}@if ($date) on {{ $date }}@endif.</div>
        @if (! empty($details))
            <div class="details">
                @foreach ($details as $label => $value)
                    {{ $label }}: {{ $value }}@if (! $loop->last) &nbsp;·&nbsp; @endif
                @endforeach
            </div>
        @endif
        <div class="meta">
            Certificate No. {{ $number }}@if ($memberId) &nbsp;·&nbsp; Member ID {{ $memberId }}@endif &nbsp;·&nbsp; Issued {{ now()->format('F j, Y') }}
        </div>
        <table class="signs"><tr>
            @php($pastor = $church['senior_pastor'] ?? null)
            <td><div class="line">@if ($pastor && $pastor !== 'Senior Pastor'){{ $pastor }}<br>@endif<small>Senior Pastor</small></div></td>
            <td><div class="line"><small>Church Clerk</small></div></td>
        </tr></table>
    </div>
</div>
</body>
</html>
