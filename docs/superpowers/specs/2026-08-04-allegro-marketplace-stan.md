# Allegro — stan prac i otwarte pytania

Data: 2026-08-04. Dokument roboczy — temat wstrzymany, wracamy później.

## Co działa

Eksport CSV w formacie rozszerzonym Allegro („Importuj i wystaw"). Plik przechodzi import, oferty powstają jako szkice.

| Element | Stan |
|---|---|
| Nagłówek CSV | identyczny z oficjalnym szablonem, 28 kolumn |
| Kodowanie | UTF-8 bez BOM, przecinek, cudzysłowy przy przecinku w polu |
| Nazwa oferty | `Plakat <tytuł PL> 21x30 cm` — 12–75 znaków, min. 3 słowa |
| Ceny, stany | poprawne |
| Zdjęcia | 3, wyłącznie wersja z marginesem |
| Opisy i nazwy | polskie, generowane i zapisywane w kartotece |
| Sygnatura (`EXTERNAL_ID`) | wraca z Allegro bez zmian — nadaje się na klucz uzgadniania |

**GTIN nie jest blokerem.** Mimo że dokumentacja nazywa go obowiązkowym, oferty powstały z pustą kolumną. Nie trzeba kupować puli GS1.

## Czego nie da się załatwić plikiem

- **Marka** — kolumna `BRAND` z wartością `REXIMPRIMIS` jest w pliku, ale Allegro jej nie użyło i zgadło markę przez AI. Wymaga zmapowania kolumny w „Ustawieniach importu".
- **GPSR** (rozporządzenie UE 2023/988) — dane producenta i informacje o bezpieczeństwie. Ustawienie sprzedawcy, jednorazowe.
- **Dostawa, płatności, warunki sprzedaży, zwroty** — ustawienia konta, wspólne dla wszystkich ofert.

## Kategoria — mechanizm, który trzeba zrozumieć

`CATEGORY` **nie** przypisuje kategorii Allegro. To nazwa kategorii w naszym systemie. Allegro zbiera unikalne wartości z pliku i pokazuje je w zakładce **„Ustawienia importu"**, gdzie mapuje się je na drzewo Allegro — **raz**, nie przy każdym imporcie.

Dwie pierwsze próby zakładały coś przeciwnego (ścieżki udające drzewo Allegro) i dlatego dawały „kategoria: brak".

Wysyłamy format z dokumentacji Allegro (`"Clothes, men's hoodies"` — przecinek, dwa poziomy):

```
"Plakaty, Botanika"
"Plakaty, Plakaty dla dzieci"
```

**21 unikalnych wartości do zmapowania, niezależnie od wielkości katalogu.**

## Problem skalowania — powód wstrzymania

Ręczne ustawianie kategorii po jednej ofercie nie działa przy większym katalogu:

| Katalog | Ofert (4 rozmiary) | Ręczne klikanie |
|---|---|---|
| 160 plakatów | 640 | ~3 h |
| 500 plakatów | 2 000 | ~8 h |
| 1000 plakatów | 4 000 | ~17 h |

Mapowanie w „Ustawieniach importu" rozwiązuje kategorie (21 wpisów raz), ale zostaje pytanie o **liczbę ofert i koszt prowizji**.

### Opcje do rozstrzygnięcia

1. **Mniej rozmiarów na Allegro** — np. tylko 30×40 i 50×70. Z 4000 ofert robi się 2000.
2. **Warianty zamiast osobnych ofert** — Allegro pozwala grupować oferty w warianty po parametrze. Jedna oferta z wyborem rozmiaru zamiast czterech. **Niesprawdzone: czy import CSV to obsługuje.** To najmocniej obniżyłoby koszt.
3. **Tylko bestsellery na Allegro**, reszta wyłącznie we własnym sklepie.

Rozstrzygnąć **przed** wgraniem większej partii — odkręcanie 2000 ofert będzie droższe niż decyzja teraz.

## Ceny

Nadal skopiowane z Shopify (16/26/43/57/71 zł). **Nie uwzględniają prowizji Allegro** — wymagają decyzji handlowej.

## Architektura

- `src/marketplaces/` — rejestr rynków; nowy kanał to jeden plik
- `src/marketplaces/allegro.js` — adapter
- `src/marketplaceExport.js` — orkiestracja: wybór gotowych plakatów, język, URL-e obrazów, zapis
- `src/translations.js` — treści wielojęzyczne, angielski jako źródło
- `scripts/generateTranslations.js` — `npm run translate:pl`
- `scripts/testMarketplaces.js` — `npm run test:marketplaces`

Shopify świadomie **nie** został przepisany na ten wzorzec. Działa, jest komercyjny; migracja to ryzyko bez zysku. Warunek utrzymany przez cały czas: **CSV Shopify pozostaje bajt w bajt identyczny**.

## Następne kroki

1. Zmapować 21 kategorii w „Ustawieniach importu"
2. Sprawdzić mapowanie kolumny `BRAND`
3. Uzupełnić dane producenta (GPSR)
4. Rozstrzygnąć liczbę ofert (warianty vs mniej rozmiarów)
5. Ustalić ceny dla Allegro
6. `npm run translate:pl` na całość
7. Zakładka w interfejsie — dziś eksport działa tylko z linii poleceń
