<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"></head>
<body>
<table>
    <tr><td colspan="4" style="font-size:16px;font-weight:bold;color:#1e3a5f">{{ $church['name'] ?? '' }}</td></tr>
    <tr><td colspan="4">{{ collect([$church['address'] ?? null, $church['phone'] ?? null, $church['email'] ?? null])->filter()->implode(' · ') }}</td></tr>
    <tr><td colspan="4" style="font-size:14px;font-weight:bold">{{ $report['title'] }}</td></tr>
    <tr><td colspan="4">{{ $report['period'] }}</td></tr>
    @if (($report['filters'] ?? '') !== '')
        <tr><td colspan="4" style="font-weight:bold">Filtered by: {{ \App\Support\Csv::safe($report['filters']) }}</td></tr>
    @endif
    <tr><td></td></tr>
    @foreach ($report['summary'] as $row)
        <tr><td style="font-weight:bold">{{ \App\Support\Csv::safe($row['label']) }}</td><td>{{ \App\Support\Csv::safe($row['value']) }}</td></tr>
    @endforeach
    @foreach ($report['sections'] as $section)
        <tr><td></td></tr>
        <tr><td colspan="{{ max(2, count($section['columns'])) }}" style="font-weight:bold;color:#1e3a5f;border-bottom:1px solid #c9a227">{{ strtoupper($section['title']) }}</td></tr>
        <tr>@foreach ($section['columns'] as $c)<th style="background:#1e3a5f;color:#ffffff">{{ $c }}</th>@endforeach</tr>
        @forelse ($section['rows'] as $r)
            <tr>@foreach ($r as $v)<td>{{ \App\Support\Csv::safe($v) }}</td>@endforeach</tr>
        @empty
            <tr><td>{{ $section['empty'] }}</td></tr>
        @endforelse
    @endforeach
</table>
</body>
</html>
