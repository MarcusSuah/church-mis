<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $report['title'] }}</title>
<style>
    @page { margin: 120pt 36pt 56pt 36pt; }
    body { font-family: DejaVu Sans, Arial, sans-serif; color: #1f2937; font-size: 10px; }
    header { position: fixed; top: -100pt; left: 0; right: 0; height: 88pt; }
    footer { position: fixed; bottom: -40pt; left: 0; right: 0; height: 28pt; font-size: 8.5px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6pt; }
    .lh { width: 100%; border-collapse: collapse; }
    .lh td { vertical-align: middle; padding: 0; }
    .logo { width: 62pt; height: 62pt; }
    .logo-ph { width: 58pt; height: 58pt; border-radius: 29pt; background: #1e3a5f; color: #fff; text-align: center; vertical-align: middle; font-size: 24px; font-weight: bold; }
    .church { font-size: 17px; font-weight: bold; color: #1e3a5f; letter-spacing: .3px; }
    .contact { font-size: 9px; color: #4b5563; margin-top: 3pt; line-height: 1.5; }
    .rule { height: 3pt; background: #c9a227; margin-top: 8pt; }
    .rule2 { height: 1pt; background: #1e3a5f; margin-top: 1.5pt; }
    h1 { font-size: 16px; color: #1e3a5f; margin: 0 0 2pt; }
    .period { color: #6b7280; font-size: 10px; margin-bottom: 12pt; }
    .meta { float: right; text-align: right; font-size: 8.5px; color: #6b7280; }
    h2 { font-size: 11.5px; color: #1e3a5f; margin: 16pt 0 5pt; padding-bottom: 3pt; border-bottom: 1px solid #c9a227; text-transform: uppercase; letter-spacing: .6px; }
    table.data { width: 100%; border-collapse: collapse; }
    table.data th { background: #1e3a5f; color: #fff; text-align: left; font-size: 9px; padding: 5pt 6pt; font-weight: bold; }
    table.data td { padding: 4.5pt 6pt; border-bottom: 1px solid #eef0f3; font-size: 9.5px; }
    table.data tr:nth-child(even) td { background: #f8f9fb; }
    table.summary td { padding: 5pt 8pt; border-bottom: 1px solid #eef0f3; font-size: 10px; }
    table.summary td.v { text-align: right; font-weight: bold; color: #111827; }
    .empty { color: #9ca3af; font-style: italic; padding: 4pt 0; }
    .sign { margin-top: 30pt; width: 100%; }
    .sign td { width: 50%; padding-top: 26pt; font-size: 9px; color: #4b5563; }
    .sign span { display: inline-block; border-top: 1px solid #9ca3af; padding-top: 3pt; width: 160pt; }
</style>
</head>
<body>
<header>
    <table class="lh">
        <tr>
            <td style="width: 72pt;">
                @if ($logo)
                    <img src="{{ $logo }}" class="logo" alt="">
                @else
                    <table style="border-collapse:collapse"><tr><td class="logo-ph">{{ strtoupper(substr($church['short_name'] ?? $church['name'] ?? 'C', 0, 1)) }}</td></tr></table>
                @endif
            </td>
            <td>
                <div class="church">{{ strtoupper($church['name'] ?? '') }}</div>
                <div class="contact">
                    @if (! empty($church['address'])){{ $church['address'] }}<br>@endif
                    {{ collect([! empty($church['phone']) ? 'Tel: '.$church['phone'] : null, ! empty($church['email']) ? 'Email: '.$church['email'] : null])->filter()->implode('   ·   ') }}
                </div>
            </td>
        </tr>
    </table>
    <div class="rule"></div><div class="rule2"></div>
</header>

<footer>
    <table style="width:100%"><tr>
        <td>{{ $church['name'] ?? '' }} — {{ $report['title'] }}</td>
        <td style="text-align:right">Generated {{ $report['generated_at'] }} by {{ $generatedBy }}</td>
    </tr></table>
</footer>

<main>
    <div class="meta">Period: {{ $report['range_label'] }}<br>Currency: {{ \App\Support\Money::base() }}</div>
    <h1>{{ $report['title'] }}</h1>
    <div class="period">{{ $report['period'] }}</div>

    <h2>Summary</h2>
    <table class="summary" style="width:100%; border-collapse: collapse;">
        @foreach ($report['summary'] as $row)
            <tr><td>{{ $row['label'] }}</td><td class="v">{{ $row['value'] }}</td></tr>
        @endforeach
    </table>

    @foreach ($report['sections'] as $section)
        <h2>{{ $section['title'] }}</h2>
        @if (count($section['rows']) === 0)
            <div class="empty">{{ $section['empty'] }}</div>
        @else
            <table class="data">
                <thead><tr>@foreach ($section['columns'] as $c)<th>{{ $c }}</th>@endforeach</tr></thead>
                <tbody>
                @foreach ($section['rows'] as $r)
                    <tr>@foreach ($r as $v)<td>{{ $v }}</td>@endforeach</tr>
                @endforeach
                </tbody>
            </table>
        @endif
    @endforeach

    <table class="sign"><tr>
        <td><span>Prepared by</span></td>
        <td style="text-align:right"><span>Approved by ({{ $church['senior_pastor'] ?? 'Senior Pastor' }})</span></td>
    </tr></table>
</main>
</body>
</html>
