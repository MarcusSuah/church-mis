<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 22pt; }
    body { font-family: DejaVu Sans, Arial, sans-serif; color: #1f2937; font-size: 11px; }
    .r { page-break-after: always; border: 1px solid #d1d5db; border-top: 4px solid #c9a227; padding: 18pt 22pt; }
    .r:last-child { page-break-after: auto; }
    .church { font-size: 16px; font-weight: bold; color: #1e3a5f; }
    .muted { color: #6b7280; }
    h2 { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #8a6d12; margin: 6px 0 14px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
    td.l { color: #6b7280; width: 35%; }
    .amt { font-size: 20px; font-weight: bold; color: #1e3a5f; }
    .foot { margin-top: 14px; font-size: 10px; color: #9ca3af; }
</style>
</head>
<body>
@foreach ($items as $i)
    <div class="r">
        <table><tr>
            <td style="border:0"><div class="church">{{ $church['name'] ?? '' }}</div><div class="muted">{{ collect([$church['address'] ?? null, $church['phone'] ?? null, $church['email'] ?? null])->filter()->implode(' · ') }}</div></td>
            <td style="border:0; text-align:right"><div class="muted">Receipt No.</div><div style="font-weight:bold">{{ $i['receipt'] }}</div></td>
        </tr></table>
        <h2>Official Receipt</h2>
        <table>
            <tr><td class="l">Received from</td><td><strong>{{ $i['name'] }}</strong></td></tr>
            <tr><td class="l">Date</td><td>{{ $i['date'] }}</td></tr>
            <tr><td class="l">For</td><td>{{ $i['type'] }} — {{ $i['fund'] }}</td></tr>
            <tr><td class="l">Payment method</td><td>{{ $i['method'] }}@if ($i['reference']) (ref {{ $i['reference'] }})@endif</td></tr>
            <tr><td class="l">Amount</td><td class="amt">{{ \App\Support\Money::format($i['amount'], $i['currency']) }}</td></tr>
        </table>
        <div class="foot">Thank you for your faithful giving. Issued {{ now()->format('F j, Y') }}.</div>
    </div>
@endforeach
</body>
</html>
