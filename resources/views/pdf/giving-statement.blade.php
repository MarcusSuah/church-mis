<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Giving Statement {{ $year }}</title>
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; color: #1f2937; font-size: 12px; margin: 36px 45px; }
    .church { font-size: 20px; font-weight: bold; color: #1e3a5f; }
    .head { border-bottom: 3px solid #c9a227; padding-bottom: 8px; margin-bottom: 20px; }
    h2 { font-size: 15px; color: #1e3a5f; margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 6px 4px; }
    td { padding: 6px 4px; border-bottom: 1px solid #f3f4f6; }
    .amt { text-align: right; }
    tfoot td { font-weight: bold; border-top: 2px solid #1e3a5f; }
    .note { margin-top: 24px; font-size: 10.5px; color: #6b7280; }
</style>
</head>
<body>
    <div class="head"><div class="church">{{ $church['name'] ?? '' }}</div></div>
    <h2>Annual Giving Statement — {{ $year }}</h2>
    <div>{{ $member->full_name }} @if ($member->member_id) ({{ $member->member_id }}) @endif</div>
    <table>
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
