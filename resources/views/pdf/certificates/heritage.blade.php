@php($A = \App\Support\CertificateArt::class)
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{{ $c['title'] }}</title>
<style>
@include('pdf.certificates._fonts')
body { background: #fbf7ec; font-family: 'Garamond', DejaVu Serif, serif; color: #2b2112; }
.b1 { position: absolute; left: 20pt; top: 20pt; width: 790pt; height: 543pt; border: 6pt solid #b8912a; }
.b2 { position: absolute; left: 32pt; top: 32pt; width: 775pt; height: 528pt; border: 1.5pt solid #b8912a; }
.b3 { position: absolute; left: 38pt; top: 38pt; width: 765pt; height: 518pt; border: 0.6pt solid #d9c27a; }
.church { top: 60pt; font-family: 'Cinzel', serif; font-size: 13pt; letter-spacing: 4pt; color: #8a6d12; }
.title { top: 86pt; font-family: 'Cinzel', serif; font-size: 34pt; color: #1e3a5f; }
.sub { top: 132pt; font-family: 'Cinzel', serif; font-size: 15pt; letter-spacing: 6pt; color: #8a6d12; }
.intro { top: 176pt; font-style: italic; font-size: 15pt; }
.name { top: 196pt; font-family: 'GreatVibes', cursive; font-size: {{ $nameSize }}pt; color: #1e3a5f; }
.rule { position: absolute; top: 262pt; left: 221pt; width: 400pt; border-top: 1pt solid #b8912a; }
.msg { top: 276pt; left: 150pt; width: 542pt; font-size: 14.5pt; line-height: 1.45; text-align: center; }
.verse { top: 360pt; left: 170pt; width: 502pt; font-size: 10.5pt; font-style: italic; color: #6b5a2b; text-align: center; }
.sign { position: absolute; top: 438pt; width: 230pt; text-align: center; }
.sign .n { border-top: 1pt solid #2b2112; padding-top: 4pt; font-size: 13pt; color: #1e3a5f; }
.sign .r { font-style: italic; font-size: 11.5pt; }
.date { position: absolute; top: 438pt; left: 351pt; width: 140pt; text-align: center; font-size: 11pt; }
.meta { top: 520pt; font-size: 8.5pt; color: #8a7a52; }
.logo { position: absolute; left: 391pt; top: 412pt; width: 60pt; height: 60pt; }
</style></head>
<body>
@include('pdf.certificates._watermark')
<div class="b1"></div><div class="b2"></div><div class="b3"></div>
<img class="abs" src="{{ $A::laurel() }}" style="left:150pt;top:180pt;width:70pt">
<img class="abs" src="{{ $A::laurel(true) }}" style="right:150pt;top:180pt;width:70pt">
<img class="abs" src="{{ $A::corner('#b8912a') }}" style="left:44pt;top:44pt;width:60pt">
<img class="abs" src="{{ $A::corner('#b8912a', 'tr') }}" style="right:44pt;top:44pt;width:60pt">
<img class="abs" src="{{ $A::corner('#b8912a', 'bl') }}" style="left:44pt;bottom:44pt;width:60pt">
<img class="abs" src="{{ $A::corner('#b8912a', 'br') }}" style="right:44pt;bottom:44pt;width:60pt">

<div class="center church">{{ strtoupper($church['name'] ?? '') }}</div>
<div class="center title">{{ $c['kicker'] === 'Baptismal' ? 'Certificate of Baptism' : ($c['kicker'] === 'Certificate of' ? 'Certificate of '.$c['title'] : $c['title']) }}</div>
<div class="center intro">This is to certify that</div>
<div class="center name">{{ $name }}</div>
<div class="rule"></div>
<div class="abs msg">{{ $message }}</div>
<div class="abs verse">{{ $c['verse'] }}</div>

<div class="sign" style="left:100pt"><div class="n">{{ $signers[0]['name'] }}</div><div class="r">{{ $signers[0]['role'] }}</div></div>
@if ($logo)<img class="logo" src="{{ $logo }}">@else<div class="date">Issued<br><span style="font-size:13pt;color:#1e3a5f">{{ $issued }}</span></div>@endif
<div class="sign" style="right:100pt"><div class="n">{{ $signers[1]['name'] }}</div><div class="r">{{ $signers[1]['role'] }}</div></div>
<div class="center meta">Certificate No. {{ $number }} &nbsp;·&nbsp; Issued {{ $issued }}@if ($memberId) &nbsp;·&nbsp; Member ID {{ $memberId }}@endif @if ($detailLine) &nbsp;·&nbsp; {{ $detailLine }}@endif</div>
</body></html>
