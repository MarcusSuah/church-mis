@php($f = 'file://'.resource_path('fonts'))
@font-face { font-family: 'GreatVibes'; src: url('{{ $f }}/GreatVibes-Regular.ttf') format('truetype'); }
@font-face { font-family: 'Cinzel'; src: url('{{ $f }}/Cinzel.ttf') format('truetype'); }
@font-face { font-family: 'Garamond'; font-style: normal; src: url('{{ $f }}/EBGaramond.ttf') format('truetype'); }
@font-face { font-family: 'Garamond'; font-style: italic; src: url('{{ $f }}/EBGaramond-Italic.ttf') format('truetype'); }
@font-face { font-family: 'Playfair'; src: url('{{ $f }}/PlayfairDisplay.ttf') format('truetype'); }
@page { margin: 0; size: 842pt 595pt; }
html, body { margin: 0; padding: 0; width: 842pt; height: 595pt; overflow: hidden; }
* { box-sizing: border-box; }
.abs { position: absolute; }
.center { position: absolute; left: 0; width: 842pt; text-align: center; }
