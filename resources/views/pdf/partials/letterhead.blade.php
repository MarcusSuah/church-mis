{{--
    Church letterhead for every A4 document (letters, reports, giving statements).
    Include inside <body>; include pdf.partials.letterhead-style inside <style>.
    Optional: $logo (data URI), $footerNote (text on the left of the footer).
--}}
@php
    $church = $church ?? config('church');
    $logo = $logo ?? \App\Support\ChurchLogo::dataUri();
    // Address, then city and country unless the address already names them.
    $address = trim((string) ($church['address'] ?? ''));
    $place = collect([$church['city'] ?? null, $church['country'] ?? null])
        ->filter(fn ($part) => filled($part) && ! str_contains(mb_strtolower($address), mb_strtolower((string) $part)))
        ->implode(', ');
    $contact = collect([$address, $place])->filter()->implode(' · ');
    $reach = collect([
        ! empty($church['phone']) ? 'Tel: '.$church['phone'] : null,
        ! empty($church['email']) ? $church['email'] : null,
    ])->filter()->implode('   ·   ');
@endphp

@if ($logo)
    <img class="lh-watermark" src="{{ $logo }}" alt="">
@endif

<header class="lh-header">
    <table class="lh-table">
        <tr>
            <td class="lh-logo-cell">
                @if ($logo)
                    <img src="{{ $logo }}" class="lh-logo" alt="">
                @else
                    <div class="lh-logo-ph">{{ strtoupper(mb_substr($church['short_name'] ?? $church['name'] ?? 'C', 0, 1)) }}</div>
                @endif
            </td>
            <td class="lh-text">
                <div class="lh-name">{{ mb_strtoupper($church['name'] ?? '') }}</div>
                @if (! empty($church['tagline']))<div class="lh-tagline">{{ $church['tagline'] }}</div>@endif
                @if ($contact)<div class="lh-contact">{{ $contact }}</div>@endif
                @if ($reach)<div class="lh-contact">{{ $reach }}</div>@endif
            </td>
        </tr>
    </table>
    <div class="lh-rule-gold"></div>
    <div class="lh-rule-navy"></div>
</header>

<footer class="lh-footer">
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td>{{ $footerNote ?? ($church['name'] ?? '') }}</td>
            <td style="text-align: right;">{{ $church['name'] ?? '' }} @if (! empty($church['email']))· {{ $church['email'] }}@endif</td>
        </tr>
    </table>
</footer>
