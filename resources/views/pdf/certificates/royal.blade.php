@php($A = \App\Support\CertificateArt::class)
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{{ $c['title'] }}</title>
<style>
@include('pdf.certificates._fonts')
body { background: #ffffff; font-family: 'Garamond', DejaVu Sans, sans-serif; color: #111827; }
.card { position: absolute; left: 18pt; top: 18pt; width: 804pt; height: 557pt; background: #f7f8fb; border: 1pt solid #dfe3ee; }
.line { position: absolute; left: 40pt; top: 40pt; width: 758pt; height: 511pt; border: 2pt solid #2f56b5; }
.church { top: 52pt; left: 0; font-family: 'Cinzel', serif; font-size: 17pt; color: #111827; letter-spacing: 1pt; }
.kicker { top: 100pt; font-family: 'Playfair', serif; font-size: 44pt; color: #1e3a8a; letter-spacing: 1pt; }
.title { top: 156pt; font-family: 'Cinzel', serif; font-size: 25pt; color: #111827; letter-spacing: 1pt; }
.intro { top: 204pt; font-size: 15pt; }
.name { top: 226pt; font-family: 'Cinzel', serif; font-size: {{ max(18, $nameSize - 18) }}pt; color: #1e3a8a; }
.rule { position: absolute; top: {{ 226 + max(18, $nameSize - 18) + 24 }}pt; left: 271pt; width: 300pt; border-top: 1.5pt solid #1e3a8a; }
.msg { top: 284pt; left: 160pt; width: 522pt; font-size: 13.5pt; line-height: 1.35; text-align: center; }
.verse { top: 352pt; left: 150pt; width: 542pt; font-size: 10.5pt; font-style: italic; color: #1f2937; text-align: center; }
.award { top: 386pt; font-size: 15pt; }
.sign { position: absolute; top: 455pt; width: 210pt; text-align: center; }
.sign .n { border-top: 2pt solid #1e3a8a; padding-top: 4pt; font-family: 'Cinzel', serif; font-size: 11pt; color: #1e3a8a; }
.sign .r { font-size: 10pt; color: #374151; }
.meta { top: 532pt; font-size: 8pt; color: #6b7280; }
.logo { position: absolute; left: 391pt; top: 426pt; width: 60pt; }
</style></head>
<body>
<div class="card"></div>
@include('pdf.certificates._watermark')
<img class="abs" src="{{ $A::sweep() }}" style="right:18pt;top:18pt;width:170pt">
<img class="abs" src="{{ $A::sweep(true) }}" style="left:18pt;bottom:18pt;width:170pt">
<div class="line"></div>
<img class="abs" src="{{ $A::seal() }}" style="left:62pt;top:66pt;width:84pt">

<div class="center church">{{ strtoupper($church['name'] ?? '') }}</div>
<div class="center kicker">{{ strtoupper($c['kicker'] === 'Baptismal' ? 'Certificate of' : $c['kicker']) }}</div>
<div class="center title">{{ strtoupper($c['kicker'] === 'Baptismal' ? 'Baptism' : $c['title']) }}</div>
<div class="center intro">This is to certify that</div>
<div class="center name">{{ strtoupper($name) }}</div>
<div class="rule"></div>
<div class="abs msg">{{ $message }}</div>
<div class="abs verse">{{ $c['verse'] }}</div>
<div class="center award">Awarded this {{ $dayOrdinal }} day of {{ $monthYear }}</div>

{{-- The church seal sits between the signatures; without a logo, a gold cross. --}}
@if ($logo)<img class="logo" src="{{ $logo }}">@else<img class="abs" src="{{ $A::goldCross() }}" style="left:404pt;top:430pt;width:34pt">@endif
<div class="sign" style="left:150pt"><div class="n">{{ $signers[0]['name'] }}</div><div class="r">{{ $signers[0]['role'] }}</div></div>
<div class="sign" style="right:150pt"><div class="n">{{ $signers[1]['name'] }}</div><div class="r">{{ $signers[1]['role'] }}</div></div>
<div class="center meta">Certificate No. {{ $number }}@if ($memberId) &nbsp;·&nbsp; Member ID {{ $memberId }}@endif @if ($detailLine) &nbsp;·&nbsp; {{ $detailLine }}@endif</div>
</body></html>
