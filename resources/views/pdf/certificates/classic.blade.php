@php($A = \App\Support\CertificateArt::class)
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{{ $c['title'] }}</title>
<style>
@include('pdf.certificates._fonts')
body { background: #f6f6f8; font-family: 'Garamond', DejaVu Serif, serif; color: #1f2340; }
.outer { position: absolute; left: 0; top: 0; width: 798pt; height: 551pt; border: 22pt solid #4a5596; }
.inner { position: absolute; left: 30pt; top: 30pt; width: 780pt; height: 533pt; border: 1pt solid #c5cae6; }
.kicker { top: 64pt; font-family: 'Cinzel', serif; font-size: 22pt; letter-spacing: 8pt; color: #1f2340; }
.title { top: 92pt; font-family: 'Cinzel', serif; font-size: 40pt; letter-spacing: 3pt; color: #4a5596; }
.intro { top: 168pt; font-style: italic; font-size: 15pt; }
.name { top: 188pt; font-family: 'GreatVibes', cursive; font-size: {{ $nameSize }}pt; color: #4a5596; line-height: 1.15; }
.msg { top: 262pt; left: 150pt; width: 542pt; font-size: 14.5pt; line-height: 1.45; text-align: center; }
.given { top: 352pt; font-size: 13.5pt; }
.sign { position: absolute; top: 420pt; width: 260pt; text-align: center; }
.sign .n { font-size: 14pt; color: #4a5596; border-top: 1pt solid #4a5596; padding-top: 4pt; }
.sign .r { font-style: italic; font-size: 12pt; }
.meta { top: 528pt; font-size: 8.5pt; color: #6b7090; letter-spacing: .5pt; }
.church { top: 40pt; font-size: 10pt; letter-spacing: 2pt; color: #6b7090; text-transform: uppercase; }
</style></head>
<body>
<div class="outer"></div><div class="inner"></div>
<img class="abs" src="{{ $A::corner('#4a5596') }}" style="left:36pt;top:36pt;width:82pt">
<img class="abs" src="{{ $A::corner('#4a5596', 'tr') }}" style="right:36pt;top:36pt;width:82pt">
<img class="abs" src="{{ $A::corner('#4a5596', 'bl') }}" style="left:36pt;bottom:36pt;width:82pt">
<img class="abs" src="{{ $A::corner('#4a5596', 'br') }}" style="right:36pt;bottom:36pt;width:82pt">
<img class="abs" src="{{ $A::cross() }}" style="left:200pt;top:78pt;width:28pt">
<img class="abs" src="{{ $A::cross() }}" style="right:200pt;top:78pt;width:28pt">
<img class="abs" src="{{ $A::dove('#4a5596') }}" style="left:60pt;top:200pt;width:78pt">
<img class="abs" src="{{ $A::dove('#4a5596', true) }}" style="right:60pt;top:200pt;width:78pt">

<div class="center church">{{ $church['name'] ?? '' }}</div>
<div class="center kicker">{{ strtoupper($c['kicker']) }}</div>
<div class="center title">{{ strtoupper($c['title']) }}</div>
<div class="center intro">This certifies that</div>
<div class="center name">{{ $name }}</div>
<div class="abs msg">{{ $message }}</div>
<div class="center given">Given this {{ $issued }}</div>

<div class="sign" style="left:120pt"><div class="n">{{ $signers[0]['name'] }}</div><div class="r">{{ $signers[0]['role'] }}</div></div>
<div class="sign" style="right:120pt"><div class="n">{{ $signers[1]['name'] }}</div><div class="r">{{ $signers[1]['role'] }}</div></div>
<div class="center meta">Certificate No. {{ $number }}@if ($memberId) &nbsp;·&nbsp; Member ID {{ $memberId }}@endif @if ($detailLine) &nbsp;·&nbsp; {{ $detailLine }}@endif</div>
</body></html>
