<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Giving Statement {{ $year }}</title>
<style>
    @include('pdf.partials.letterhead-style')
    body { font-family: DejaVu Sans, Arial, sans-serif; color: #1f2937; font-size: 11.5px; }
    h2 { font-family: DejaVu Serif, Georgia, serif; font-size: 16px; color: #1e3a5f; margin: 0 0 4px; }
    table.rows { width: 100%; border-collapse: collapse; margin-top: 16px; }
    table.rows th { text-align: left; font-size: 9.5px; text-transform: uppercase; color: #fff; background: #1e3a5f; padding: 6px 5px; }
    table.rows td { padding: 6px 5px; border-bottom: 1px solid #f0f1f4; }
    table.rows tbody tr:nth-child(even) td { background: #f8f9fb; }
    .amt { text-align: right; }
    tfoot td { font-weight: bold; border-top: 2px solid #1e3a5f; }
    .note { margin-top: 24px; font-size: 10.5px; color: #6b7280; }
</style>
</head>
<body>
@include('pdf.partials.letterhead', ['footerNote' => 'Annual Giving Statement '.$year])

<h2>Annual Giving Statement — {{ $year }}</h2>
<div>{{ $member->full_name }} @if ($member->member_id) ({{ $member->member_id }}) @endif</div>
<table class="rows">
    <thead><tr><th>Date</th><th>Type</th><th>Fund</th><th>Receipt</th><th class="amt">Amount</th></tr></thead>
    <tbody>
    @forelse ($rows as $r)
        <tr>
            <td>{{ \Illuminate\Support\Carbon::parse($r['date'])->format('M j, Y') }}</td>
            <td>{{ $r['type'] }}</td>
            <td>{{ $r['fund'] ?: '—' }}</td>
            <td>{{ $r['receipt'] ?: '—' }}</td>
            <td class="amt">{{ \App\Support\Money::format($r['amount'], $r['currency'] ?? null) }}</td>
        </tr>
    @empty
        <tr><td colspan="5">No giving recorded for {{ $year }}.</td></tr>
    @endforelse
    </tbody>
    <tfoot><tr><td colspan="4">Total ({{ \App\Support\Money::base() }})</td><td class="amt">{{ \App\Support\Money::dual($total) }}</td></tr></tfoot>
</table>
<p class="note">Thank you for your faithful giving. No goods or services were provided in exchange for these contributions. Issued {{ now()->format('F j, Y') }}.</p>
</body>
</html>
