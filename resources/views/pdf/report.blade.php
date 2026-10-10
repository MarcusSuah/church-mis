<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $report['title'] }}</title>
<style>
    @include('pdf.partials.letterhead-style')
    body { font-family: DejaVu Sans, Arial, sans-serif; color: #1f2937; font-size: 10px; }
    h1 { font-family: DejaVu Serif, Georgia, serif; font-size: 17px; color: #1e3a5f; margin: 0 0 2pt; }
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
@include('pdf.partials.letterhead', ['footerNote' => $report['title'].' — generated '.$report['generated_at'].' by '.$generatedBy])

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
