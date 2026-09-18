# Zestawy ścienne (gallery wall sets) — kompozycja

> 2026-09-18 — z sesji budowy "Four Seasons Wall Set" (4 pejzaże, różne
> ramy/rozmiary na próbę → zestaw ścienny).

## Skąd bierze się układ

`src/galleryVisuals.js` składa MASTER / PACKSHOT / SALON programistycznie
(sharp, bez AI — deterministyczne i darmowe). Dwa layouty:
- **hero+kolumna** (`skladajUklad`, domyślny do 5 elementów): jeden duży
  element po lewej ("hero" = element o największym `heightCm`), reszta w
  pionowej kolumnie po prawej.
- **siatka** (`skladajUkladSiatka`, 6+ elementów): rzędy wyśrodkowane.

`buildGalleryInterior` (salon) donedawna ZAWSZE wołał `skladajUklad`
bezpośrednio (nie przez dyspozytor `skladaj`) i ignorował `frameColor` — więc
salon zawsze wychodził w czarnej ramie niezależnie od tego, jaki kolor dostał
packshot. Naprawione 2026-09-18: `buildGalleryInterior(items, outputPath,
opts)` teraz przekazuje `opts.frameColor` dalej do `skladajUklad`.

## Stałe geometrii (`src/galleryVisuals.js`)

```
FRAME_CM      = 1.1   // grubość profilu ramy, każda strona
GAP_HERO_CM   = 4     // odstęp hero <-> kolumna (do 2026-09-18: 2.2 — ZA MAŁO)
GAP_STACK_CM  = 4     // odstęp między elementami w kolumnie (do 2026-09-18: 1.6 — ZA MAŁO)
MARGIN_CM     = 3.5   // margines wokół całej kompozycji
```

**Dlaczego 4 cm, nie mniej:** opis produktu (`src/galleryDescription.js`,
tekst `miejsce`) obiecuje klientowi *"leaving 3–5 cm between frames"* /
*"odstęp 3–5 cm między ramami"*. Stare stałe (2.2 / 1.6 cm) łamały tę
obietnicę — klient odtwarzający układ w domu zmierzyłby mniejszy odstęp niż
opisany. 4 cm to środek zadeklarowanego zakresu. **Każda zmiana tych stałych
musi zostać zgodna z tekstem w `galleryDescription.js` — i odwrotnie.**

## Jak policzyć, czy hero i kolumna się zbilansują

Wysokość elementu W RAMIE = `heightCm + 2 × FRAME_CM`.
Wysokość kolumny = `suma(wysokości elementów w ramie) + (n-1) × GAP_STACK_CM`.

Kolumna NIE MOŻE być dużo wyższa (ani dużo niższa) od hero — inaczej na
ścianie wygląda jak przypadek, nie kuratorstwo. Przykład z tej sesji:

| Hero | Kolumna (3 elementy) | Wys. hero w ramie | Wys. kolumny | Różnica |
|---|---|---|---|---|
| 50×70 | 3× **21×30** | 72.2 cm | 99.9 cm | **+27.7 cm — ŹLE, kolumna wystaje** |
| 50×70 | 3× **13×18** | 72.2 cm | 68.7 cm | **-3.5 cm — OK, wizualnie zbilansowane** |

Zasada praktyczna: przy hero 50×70 (max realnie sprzedawany rozmiar, patrz
[`ceny-i-rozmiary.md`](ceny-i-rozmiary.md)) i 3 elementach w kolumnie, dobierz
**13×18**, nie 21×30 — 21×30 jest za duże, żeby 3 sztuki zmieściły się w
wysokości hero.

Sprawdzaj to ZAWSZE liczbowo przed publikacją, nie na oko — np.:
```js
const heroH = 70 + FRAME_CM*2;
const colH  = (itemH + FRAME_CM*2) * n + GAP_STACK_CM * (n-1);
// różnica < ~5-10 cm = OK
```
`buildGalleryPackshot` renderuje przy stałym `pxPerCm = 26` (wywołanie w
`scripts/zbudujGalerie.js`), więc dokładność w cm da się też zweryfikować
bezpośrednio z px wygenerowanego pliku: `cm = px / 26`.

## Grubość ramki wygląda różnie na dużych i małych elementach — TO NIE BUG

`FRAME_CM = 1.1` to STAŁA fizyczna grubość (w cm), identyczna dla każdego
elementu niezależnie od rozmiaru wydruku. W pikselach (przy `pxPerCm=26`) to
zawsze 29px — ale względem samego zdjęcia wygląda zupełnie inaczej:

| Element | Rama jako % szerokości obrazu |
|---|---|
| Hero 50×70 | 2.2% |
| Mały 13×18 | 8.6% |

Rama na małych elementach wygląda więc ok. 4× bardziej masywnie niż na
hero — **to jest fizycznie poprawne** (prawdziwa rama o stałym profilu tak
właśnie wygląda niezależnie od rozmiaru wydruku), nie błąd renderowania.
Potwierdzone z userem 2026-09-18: zostawiamy jak jest, NIE skalować grubości
ramy w dół dla mniejszych formatów.

## Proces budowy zestawu

1. Elementy składowe muszą być `approvedForPrint: true` i mieć PDF w danym
   rozmiarze (`sprawdzDefinicje` w `src/galerieScienne.js` to wymusza).
2. Definicja JSON: `{ tytul, kategoria, opis, sciana, pomieszczenie, pozycje:
   [{tytul, rozmiar}, ...] }`. `pomieszczenie` to polska etykieta
   roomCollection (np. `"Do salonu"`), NIE `pokojId` (który wybiera konkretne
   tło z `src/setRoomBackgrounds.js`, domyślnie `salon_sofa`).
3. `node scripts/zbudujGalerie.js definicja.json` (próba) →
   `--wykonaj` (zapis). Tworzy `posters/_galerie/<handle>/` (master, packshot,
   salon, `druk/` z kopiami PDF, `produkcja.json`, `DO_DRUKU.txt`) + rekord w
   `posters_inventory.json` (`kind: 'gallery'`, `approvedForPrint: false`).
4. Obejrzyj packshot i salon PRZED zatwierdzeniem — patrz sekcja wyżej, czy
   hero/kolumna się bilansują.
5. Cennik: `src/galerieScienne.js` — `cenaZestawu = suma(cen pojedynczych) ×
   0.88` (rabat 12%, tyle co przy tryptyku).

## "missing_framed_thumb" po zatwierdzeniu — kosmetyczne, nie blokuje

Po `bulk-approval` + `npm run shopify:reconcile`, zestawy typu `gallery`
często dostają `shopifyIssues: ['missing_framed_thumb']` mimo
`shopifyState: 'ready'`. Przyczyna: `src/shopifyState.js` sprawdza
`imagePathFramed`/`imagePathFramedThumb` (konwencja pojedynczego plakatu) —
ale `zbudujGalerie.js` zapisuje framed-view jako `mockups.frame` (packshot),
inna konwencja nazewnictwa. **Nie blokuje `ready`** — `state` liczy się
wyłącznie z `masterThumbRel` (patrz `evaluatePosterShopifyState`). Bezpieczne
do zignorowania dla `kind: 'gallery'`.

## Wzorzec: "N wariantów, każdy z inną porą/motywem jako hero"

Potwierdzone 2026-09-18: z 4 niezależnych plakatów da się zbudować 4 osobne
produkty (sety), w każdym inny element jest hero 50×70, a pozostałe 3 lecą
jako 13×18 w kolumnie — klient wybiera wariant = wybiera, który motyw jest
"gwiazdą" zestawu. Przykład: `Spring/Summer/Autumn/Winter Wall Set` z tych
samych 4 plakatów sezonowych. Budowa: jeden JS generujący N plików definicji
(permutacja hero), potem `zbudujGalerie.js` w pętli po każdym pliku — patrz
`scratchpad/four_season_variants.js` z tej sesji jako wzorzec generatora
defincji. PDF-y dla WSZYSTKICH używanych rozmiarów (tu: 50×70 i 13×18) muszą
istnieć dla KAŻDEGO z 4 plakatów, bo każdy raz jest hero i raz jest w kolumnie.

## Cofanie / przebudowa

Żeby przebudować zestaw od zera (np. po zmianie rozmiarów): usuń rekord
`gallery_<handle>` z `posters_inventory.json` i skasuj
`posters/_galerie/<handle>/`, potem uruchom `zbudujGalerie.js` ponownie —
skrypt sam odmówi, jeśli handle już istnieje w kartotece.
