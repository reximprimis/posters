# Rozmiary i ceny — co REALNIE sprzedajemy

> 2026-09-18 — pomyłka: zbudowano próbkę i zestaw ścienny z rozmiarem 70x100,
> który wygląda jak prawidłowa opcja w kodzie, ale nie istnieje na sklepie.

## Realnie sprzedawane rozmiary (pojedynczy plakat)

| Rozmiar | Cena (zł) | Uwaga |
|---|---|---|
| 13×18 cm | 16 | Small — najmniejszy |
| 21×30 cm | 26 | A4 |
| 30×40 cm | 43 | Medium |
| 40×50 cm | 57 | Large |
| 50×70 cm | 71 | **Największy REALNIE sprzedawany rozmiar** |

Źródło: `scripts/exportShopifyCsv.js` → `SIZE_DEFS`, zsynchronizowane ze
sklepem (Storefront API, ostatnio zweryfikowane 2026-08-03).

## 70×100 cm — PUŁAPKA

`src/galerieScienne.js` (`SIZE_PRICES`) i inne starsze miejsca w kodzie WCIĄŻ
znają rozmiar `70x100` (99 zł) — ale to cena orientacyjna, rozmiar jest
**poza `selectedSizes`, nie istnieje na sklepie jako realna opcja**. Powód:
`src/ramkiKatalog.js` — dla 70×100 nie ma w ofercie żadnej ramy.

**Nie używaj `70x100` w:**
- planach generowania próbek/mockupów pod konkretną ramę (rama i tak nie
  istnieje w tym rozmiarze),
- definicjach zestawów ściennych (`zbudujGalerie.js`) jako rozmiaru
  składowego — mimo że walidacja przejdzie (bo `SIZE_PRICES` go zna),
  produkt w tym rozmiarze nie da się sprzedać.

Jeśli kod gdzieś przepuszcza `70x100` bez błędu, to nie jest potwierdzenie,
że rozmiar jest sprzedawany — **zawsze sprawdzaj `exportShopifyCsv.js
SIZE_DEFS`** jako źródło prawdy o realnej ofercie, nie inne listy w kodzie.

## Rabat zestawów

12% względem sumy cen pojedynczych (`RABAT = 0.12` w `galerieScienne.js`) —
ten sam poziom co przy tryptyku. Celowo niewielki: zestaw ma być tańszy niż
suma, ale nie na tyle, żeby kanibalizował sprzedaż pojedynczych plakatów.

## Promocja / compare-at

`compare-at = 2 × cena` w eksporcie CSV — sklep prowadzi stałą promocję
"−50%". Źródłem prawdy o cenach jest zawsze LIVE sklep (Storefront API), nie
tylko wartości w kodzie — jeśli ceny w sklepie się zmienią, `SIZE_DEFS` i
`SIZE_PRICES` trzeba zaktualizować ręcznie w obu miejscach.
