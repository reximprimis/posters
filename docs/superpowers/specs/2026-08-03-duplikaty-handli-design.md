# Unikalność handli Shopify — projekt

Data: 2026-08-03

## Problem

Dwa plakaty o tym samym tytule dawały ten sam handle Shopify. Handle jest kluczem produktu, więc przy imporcie CSV drugi plakat nie tworzył nowego produktu — wtapiał się w pierwszy jako powtórzone kombinacje opcji. Jeden plakat z pary przepadał po cichu.

Wykryte przypadki:

| Handle | Plakat A (żywy na sklepie) | Plakat B (przepadł) |
|---|---|---|
| `delicate-magnolia-branch` | Botanika / Photography | Botanika / Minimalism |
| `unexpected-tea-party` | Humor i memy / Line art | Humor i memy / Illustration |

## Przyczyna źródłowa

Niedopasowanie zakresów unikalności, nie brak zabezpieczenia.

`posterNameGuard.assertMasterPathAvailable()` pilnował unikalności w zakresie **kategoria + styl** — jego zadaniem jest ochrona pliku PNG na dysku przed nadpisaniem i to robił poprawnie. Tymczasem `exportShopifyCsv.toHandle()` liczył handle z **samego tytułu**, czyli wymagał unikalności **globalnej**.

Funkcja `toHandle()` żyła wewnątrz skryptu eksportu i nie była widoczna dla guarda, więc oba miejsca mogły się rozjechać — i rozjechały.

Dodatkowo `dedupePosters()` odsiewa po `imagePath`, więc dwa różne pliki o tym samym tytule przechodziły przez nie bez szwanku.

## Zasada

**Tytuł plakatu musi dawać handle unikalny w całym katalogu.** Porównanie idzie po handle, nie po surowym tytule — dzięki temu „Cafe Mocha" i „Café Mocha" są wykrywane jako kolizja.

## Rozwiązanie

### 1. Wspólne źródło prawdy

`toHandle()` przeniesiona do `src/posterTitle.js` jako `toPosterHandle()`. Eksport importuje ją zamiast trzymać własną kopię. Bez tego kroku guard i eksport mogłyby znowu się rozjechać.

### 2. Zapobieganie

`src/posterNameGuard.js`:

- `collectGloballyUsedTitles(dbPosters)` — tytuły zajęte w całym katalogu, przekazywane do promptu, żeby LLM ich nie proponował
- `assertHandleGloballyUnique(title, dbPosters, opts)` — rzuca `PosterNameCollisionError`; pomija rekord samego plakatu po `imagePath`, żeby regeneracja nie wywalała się na sobie
- `findHandleCollisions(dbPosters)` — wszystkie kolizje; ten sam `imagePath` wielokrotnie to regeneracja, nie kolizja

Wpięte w `posterGenerator.js` (obie ścieżki wyboru tytułu) oraz w `preview.js` (walidacja Studia → HTTP 409). Kolizje wewnątrz jednej partii tytułów też są wykrywane.

### 3. Siatka bezpieczeństwa

`exportShopifyCsv.js` grupuje po handle przed zapisem pliku i przerywa eksport z wypisaniem kolidujących pozycji. Lepiej brak CSV niż CSV gubiący produkt.

### 4. Narzędzia

- `npm run audit:duplicates` — raport kolizji, kod wyjścia 1 gdy znajdzie; niczego nie zmienia
- `npm run test:guard` — 11 testów sprawdzających, że blokada faktycznie blokuje

## Naprawa istniejących kolizji

Zmienione wyłącznie pole `title` w `posters_inventory.json` dla plakatów **nieobecnych** na sklepie:

- Botanika / Minimalism: „Delicate Magnolia Branch" → **„Magnolia Over Still Water"**
- Humor i memy / Illustration: „Unexpected Tea Party" → **„Woodland Tea Society"**

Odwołania do starego tytułu w `shopDescription` podmienione. Nazwy plików, `id` i `prompt` nietknięte — obrazy leżą w osobnych folderach stylów, więc ich ścieżki i URL-e miniatur nigdy nie kolidowały. Kolidował wyłącznie handle liczony z tytułu.

Plakaty żyjące na sklepie zachowały swoje handle, żeby nie zepsuć działających adresów produktów. Które z pary są żywe, ustalono na podstawie `Image Src` w archiwalnym eksporcie z 2026-05-21, który utworzył te produkty.

## Weryfikacja

- `npm run test:guard` — 11/11
- `npm run audit:duplicates` — brak kolizji, 160 unikalnych handli
- eksport: 1590 wierszy = 159 produktów = **159 unikalnych handli** (przed naprawą 157)
- test negatywny: eksport z kolizją przerywa się i **nie nadpisuje** CSV
- Studio zwraca 409 dla tytułu zajętego w innej kategorii lub stylu

## Świadome pominięcia

Nie zmieniono nazw plików, struktury produktów w Shopify ani plakatów obecnych na sklepie. Nie przebudowano eksportu pod styl jako wariant produktu.
