{{-- Soft, blurred church logo behind the certificate text (drawn first, so everything else sits on top). --}}
@php($watermark = \App\Support\ChurchLogo::blurredDataUri())
@if ($watermark)
    <img src="{{ $watermark }}" alt="" style="position: absolute; left: 251pt; top: 110pt; width: 340pt;">
@endif
