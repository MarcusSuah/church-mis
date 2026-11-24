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
    .filters { margin: -8pt 0 12pt; padding: 4pt 8pt; background: #f4f6fa; border-left: 3px solid #c9a227; font-size: 9.5px; color: #1e3a5f; }
    .meta { float: right; text-align: right; font-size: 8.5px; color: #6b7280; }
    h2 { font-size: 11.5px; color: #1e3a5f; margin: 18pt 0 6pt; padding-bottom: 3pt; border-bottom: 1px solid #c9a227; text-transform: uppercase; letter-spacing: .6px; }
    h2 .n { color: #c9a227; }
    h3 { font-size: 10px; color: #1e3a5f; margin: 12pt 0 4pt; }
    table.data { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    table.data tr { page-break-inside: avoid; }
    table.data th { background: #1e3a5f; color: #fff; text-align: left; font-size: 8.5px; padding: 5pt 6pt; font-weight: bold; }
    table.data td { padding: 4pt 6pt; border-bottom: 1px solid #eef0f3; font-size: 9px; }
    table.data tr:nth-child(even) td { background: #f8f9fb; }
    table.data .num { text-align: right; white-space: nowrap; }
    table.data .idx { width: 18pt; text-align: right; color: #9ca3af; }
    table.data tr.total td { font-weight: bold; background: #eef2f7; border-top: 1.5px solid #1e3a5f; }
    table.summary { width: 100%; border-collapse: collapse; }
    table.summary td { padding: 5pt 8pt; border-bottom: 1px solid #eef0f3; font-size: 10px; }
    table.summary td.v { text-align: right; font-weight: bold; color: #111827; }
    .empty { color: #9ca3af; font-style: italic; padding: 4pt 0; }
    /* Charts drawn as bars: DomPDF cannot run the browser charts. */
    .chart { page-break-inside: avoid; margin-bottom: 10pt; }
    table.bars { width: 100%; border-collapse: collapse; }
    table.bars td { padding: 2pt 4pt; font-size: 8.5px; vertical-align: middle; }
    table.bars td.label { width: 28%; color: #374151; }
    table.bars td.value { width: 18%; text-align: right; white-space: nowrap; color: #111827; }
    .track { background: #f1f3f6; height: 7pt; width: 100%; }
    .bar { height: 7pt; }
    .legend span { display: inline-block; margin-right: 10pt; font-size: 8px; color: #4b5563; }
    .legend i { display: inline-block; width: 7pt; height: 7pt; margin-right: 3pt; vertical-align: middle; }
    table.sign { width: 100%; border-collapse: collapse; margin-top: 6pt; }
    table.sign th { background: #1e3a5f; color: #fff; text-align: left; font-size: 8.5px; padding: 5pt 6pt; }
    table.sign td { padding: 6pt; border-bottom: 1px solid #eef0f3; font-size: 9px; height: 30pt; vertical-align: middle; }
    table.sign img { height: 26pt; }
    .line { display: inline-block; border-top: 1px solid #9ca3af; width: 120pt; }
</style>
</head>
<body>
@php
    $base = \App\Support\Money::base();
    $colors = ['#1e3a5f', '#c9a227', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6'];
    $isNumeric = fn (string $v) => (bool) preg_match('/^[-+]?\(?[A-Za-z$£€≈ ]{0,6}-?[\d,]+(\.\d+)?\)?%?$/u', trim($v));
    $numericColumns = function (array $section) use ($isNumeric): array {
        $columns = [];
        foreach ($section['columns'] as $j => $_) {
            $values = array_filter(array_map(fn ($r) => trim((string) ($r[$j] ?? '')), $section['rows']), fn ($v) => $v !== '' && $v !== '—');
            $columns[$j] = $values !== [] && count(array_filter($values, $isNumeric)) === count($values);
        }

        return $columns;
    };
    $fmt = fn (float $v, bool $money) => $money ? \App\Support\Money::format($v) : number_format($v, fmod($v, 1.0) === 0.0 ? 0 : 1);
    $part = 0;
@endphp
@include('pdf.partials.letterhead', ['footerNote' => $report['title'].' — generated '.$report['generated_at'].' by '.$generatedBy])

<main>
    <div class="meta">Period: {{ $report['range_label'] }}<br>Currency: {{ $base }}</div>
    <h1>{{ $report['title'] }}</h1>
    <div class="period">{{ $report['period'] }}</div>
    @if (($report['filters'] ?? '') !== '')
        <div class="filters">Filtered by: <strong>{{ $report['filters'] }}</strong></div>
    @endif

    <h2><span class="n">{{ ++$part }}.</span> Summary</h2>
    <table class="summary">
        @foreach ($report['summary'] as $row)
            <tr><td>{{ $row['label'] }}</td><td class="v">{{ $row['value'] }}</td></tr>
        @endforeach
    </table>

    @if (! empty($charts))
        <h2><span class="n">{{ ++$part }}.</span> Charts and graphs</h2>
        @foreach ($charts as $chart)
            <div class="chart">
                <h3>{{ $chart['title'] }}</h3>
                @if (count($chart['series']) > 1)
                    <div class="legend">
                        @foreach ($chart['series'] as $i => $name)
                            <span><i style="background: {{ $colors[$i % count($colors)] }}"></i>{{ $name }}</span>
                        @endforeach
                    </div>
                @endif
                <table class="bars">
                    @foreach ($chart['rows'] as $row)
                        @foreach ($row['values'] as $i => $value)
                            <tr>
                                <td class="label">{{ $i === 0 ? $row['label'] : '' }}</td>
                                <td>
                                    <div class="track">
                                        <div class="bar" style="width: {{ max(0, min(100, round($value / $chart['max'] * 100, 1))) }}%; background: {{ $colors[$i % count($colors)] }};"></div>
                                    </div>
                                </td>
                                <td class="value">{{ $fmt($value, $chart['money']) }}</td>
                            </tr>
                        @endforeach
                    @endforeach
                </table>
            </div>
        @endforeach
    @endif

    @if (count($report['sections']) > 0)
        <h2><span class="n">{{ ++$part }}.</span> Detailed tables</h2>
        @foreach ($report['sections'] as $s => $section)
            <h3>{{ $part }}.{{ $s + 1 }} {{ $section['title'] }}</h3>
            @if (count($section['rows']) === 0)
                <div class="empty">{{ $section['empty'] }}</div>
            @else
                @php $numeric = $numericColumns($section); @endphp
                <table class="data">
                    <thead><tr>
                        <th class="idx">#</th>
                        @foreach ($section['columns'] as $j => $c)<th @class(['num' => $numeric[$j]])>{{ $c }}</th>@endforeach
                    </tr></thead>
                    <tbody>
                    @foreach ($section['rows'] as $i => $r)
                        @php $total = (bool) preg_match('/^(grand\s+)?total/i', trim((string) ($r[0] ?? ''))); @endphp
                        <tr @class(['total' => $total])>
                            <td class="idx">{{ $total ? '' : $i + 1 }}</td>
                            @foreach ($r as $j => $v)<td @class(['num' => $numeric[$j] ?? false])>{{ $v }}</td>@endforeach
                        </tr>
                    @endforeach
                    </tbody>
                </table>
            @endif
        @endforeach
    @endif

    @if (! empty($ledger))
        <h2><span class="n">{{ ++$part }}.</span> Financial ledger</h2>
        <div class="period" style="margin-bottom: 4pt;">
            Income and approved/paid expenses, totalled per {{ $ledger['grouping'] === 'month' ? 'month' : 'day' }} ({{ $base }})
        </div>
        <table class="data">
            <thead><tr><th>Date</th><th>Ref</th><th>Description</th><th class="num">Income</th><th class="num">Expense</th><th class="num">Balance</th></tr></thead>
            <tbody>
                <tr class="total"><td colspan="5">Opening balance</td><td class="num">{{ \App\Support\Money::format($ledger['opening_balance']) }}</td></tr>
                @foreach ($ledger['rows'] as $row)
                    <tr>
                        <td style="white-space: nowrap">{{ \Carbon\CarbonImmutable::parse($row['date'])->format($ledger['grouping'] === 'month' ? 'M Y' : 'M j, Y') }}</td>
                        <td>{{ $row['ref'] }}</td>
                        <td>{{ $row['description'] }}</td>
                        <td class="num">{{ $row['income'] ? \App\Support\Money::format($row['income']) : '—' }}</td>
                        <td class="num">{{ $row['expense'] ? \App\Support\Money::format($row['expense']) : '—' }}</td>
                        <td class="num">{{ \App\Support\Money::format($row['balance']) }}</td>
                    </tr>
                @endforeach
                <tr class="total">
                    <td colspan="3">Totals / closing balance</td>
                    <td class="num">{{ \App\Support\Money::format($ledger['total_income']) }}</td>
                    <td class="num">{{ \App\Support\Money::format($ledger['total_expense']) }}</td>
                    <td class="num">{{ \App\Support\Money::format($ledger['closing_balance']) }}</td>
                </tr>
            </tbody>
        </table>
    @endif

    <h2><span class="n">{{ ++$part }}.</span> Approval</h2>
    @if (($report['filters'] ?? '') !== '')
        <div class="empty">This is a filtered copy of the report. Signatures belong to the full report.</div>
    @endif
    <table class="sign">
        <thead><tr><th>Position</th><th>Name</th><th>Signature</th><th>Date</th></tr></thead>
        <tbody>
        @foreach ($signatories as $s)
            <tr>
                <td>{{ $s['position'] }}</td>
                <td>{{ $s['name'] ?? '' }}</td>
                <td>
                    @if ($s['image'])
                        <img src="{{ $s['image'] }}" alt="">
                    @else
                        <span class="line"></span>
                    @endif
                </td>
                <td>{{ $s['signed_at'] ?? '' }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</main>
</body>
</html>
