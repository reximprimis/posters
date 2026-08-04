# Zestawy plakatów — dyptyk i tryptyk

Data: 2026-08-04

## Czym jest zestaw

Jedna panorama pocięta na 2 lub 3 panele, sprzedawana jako **jeden niepodzielny produkt**. Gałęzie, horyzont i tafla wody przechodzą przez ramy, bo to fizycznie ten sam obraz.

Tylko dwa układy: **dyptyk (2)** i **tryptyk (3)**. Przy 4 panelach w rzędzie na panel zostaje 960×1440 px, co przy druku 50×70 oznacza powiększenie 6,15× — za mało.

Zestawy są **wyłącznie bez marginesu** (full bleed).

## Ograniczenia modelu — ustalone empirycznie

| Limit | Wartość | Skąd |
|---|---|---|
| Proporcja | ≤ 3:1 | walidator w kodzie |
| Piksele | ≤ 8 294 400 | walidator w kodzie |
| **Najdłuższa krawędź** | **≤ 3840 px** | **odkryte testem** — API odrzuciło 4064×2032, kod tego nie sprawdzał |

Brakujący warunek dopisany do `isValidGptImage2Size`. Wcześniej błąd wychodził dopiero po ~130 s i opłacie za wywołanie.

| Układ | Generacja | Panel | Upscale do 50×70 |
|---|---|---|---|
| Dyptyk | 3296×2480 | 1648×2480 | 3,58× |
| Tryptyk | 3840×1920 | 1280×1920 | 4,61× |

Dla porównania pojedynczy plakat: 2000×3000, upscale 2,95×.

## Pułapka przy generowaniu panoramy

`resizeToPrintCanvas` wpasowuje obraz w płótno `IMAGE_TARGET_WIDTH × IMAGE_TARGET_HEIGHT` i dopełnia marginesami. Przy domyślnym 2000×3000 panorama 3840×1920 zostaje zmniejszona do 2000×1000 i otoczona pustymi pasami — traci się ponad połowę rozdzielczości.

Generowanie zestawu **musi** ustawić płótno docelowe równe rozmiarowi panoramy.

## Model danych

Rekord w `posters_inventory.json` z polem `kind: "set"`:

```
id, kind: "set", layout: "duo" | "tryptyk", panelCount: 2 | 3
title, category, artStyle, aesthetic, shopDescription, translations

imagePath      → panorama (tożsamość, dedupe, unikalność handle)
panels[]       → { index, imagePath, pdfPaths, thumb }
imagePathThumb → miniatura zestawu (biblioteka i sklep)
mockups        → { frame, interior }
printLayout    → "full"
```

Pole w istniejącej kolekcji, nie osobny plik: biblioteka, filtry, statusy gotowości, unikalność handli i eksport już działają na `posters[]`. `imagePath` wskazuje panoramę, więc istniejący kod traktuje zestaw jak każdy inny rekord.

## Wizualizacje — składane lokalnie

`src/posterSetVisuals.js`, przez sharp. **Nie przez model obrazu**: mockup zestawu wymaga umieszczenia 2–3 różnych grafik w osobnych ramach we właściwej kolejności, a model dostaje jeden obraz na wejściu i musiałby sam go rozdzielić. Przy teście panoramy już raz zignorował instrukcje o liniach cięcia.

- **Miniatura** — panele w ramach obok siebie, tak jak wiszą; to widzi klient jako pierwsze
- **Packshot** — te same ramy na czystym neutralnym tle
- **Salon** — ramy na ścianie wnętrza z listwą i podłogą

Deterministyczne, darmowe, zawsze poprawne.

## Ceny

**Mnożnik od ceny pojedynczego plakatu w tym samym rozmiarze:**
- dyptyk **1,85×**
- tryptyk **2,70×**

Rabat za komplet zachęca do większego koszyka, a utrzymuje się jedną liczbę zamiast drugiego cennika. Konkurent z Etsy bierze 117 zł za tryptyk przy ~43 zł za sztukę — około 2,7×.

## Zestaw jest niepodzielny

Jeden produkt, jeden handle, jedna oferta. Panel bez pozostałych wygląda na ucięty fragment, a nie samodzielną pracę.

## Kontrola linii cięcia — do zrobienia

Test ujawnił realny problem: **łódka wypadła dokładnie na cięciu** między panelem 1 a 2, mimo że prompt wprost tego zakazywał. Przy odstępie 3–5 cm między ramami wygląda to na błąd.

Rozwiązanie: po generacji zbadać pas pikseli w miejscu każdego cięcia; za dużo szczegółu → powtórka. Ta sama zasada, która pilnuje marginesów pojedynczych plakatów (`SAFE_FRAMING_MAX_RETRIES`).

## Stan i co dalej

Gotowe: cięcie panoramy bez utraty pikseli, miniatura, packshot, salon, poprawiony walidator rozmiaru, prompt panoramiczny.

Do zrobienia:
1. Kontrola linii cięcia z powtórką
2. Zapis zestawu do inventory (`kind: "set"`, panele, PDF-y)
3. Karta zestawu w bibliotece — plakietka układu, panele, pliki druku
4. Mnożnik cen w eksporcie Shopify
5. Generowanie zestawów z UI
