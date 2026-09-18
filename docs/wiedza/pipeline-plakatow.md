# Pipeline plakatu: generowanie → sklep

> Zbiorczy zapis z wielu sesji (najnowsze potwierdzenie: 2026-09-18, batch 96 + batch 10 zaległych).

## Pełny cykl

```
generowanie (dodajPlakaty.js)
  → zatwierdzenie (bulk-approval)
  → [auto-chain w preview.js: mockupy, PDF, thumb — CZĘSTO SIĘ ZACINA, patrz niżej]
  → sync miniatur do shopify_thumbs/ (git push, serwuje jsDelivr CDN)
  → eksport CSV (exportShopifyCsv.js)
  → publikacja (publishShopifyDirect.js)
  → tłumaczenia (tlumaczKatalog.js, patrz shopify-tlumaczenia.md)
```

## 1. Generowanie

```bash
node scripts/dodajPlakaty.js --plan plan.json            # próba (bez --wykonaj)
node scripts/dodajPlakaty.js --plan plan.json --wykonaj   # generuje realnie
```
Plan = tablica `[{ tytul, kategoria, styl, orientacja }, ...]`. Walidacja
kategoria+styl przez `CATEGORY_STYLES` (`src/categoryStyles.js`) — błędna
kombinacja odrzucana od razu, przed generowaniem.

**Filtr bezpieczeństwa jest DWUWARSTWOWY**: pre-flight w `dodajPlakaty.js`
(blokuje oczywiste słowa jak "Nude"/"Torso" ZANIM cokolwiek wyśle do API) +
filtr po stronie dostawcy obrazu (odrzuca dopiero PRZY generowaniu,
`safety_violations=[sexual]`). Pierwszy NIE łapie wszystkiego — np. tytuły
w stylu "Bent Knee Study", "Kneeling Figure Line" (line-art-figures) czy
nawet "Zodiac Elements Wheel" (stylizowana ludzka figura w zodiaku) przeszły
pre-flight, ale zostały odrzucone live. Nie próbuj z góry przewidzieć
wszystkich takich tytułów — plansuj tolerancję na kilka % strat w dużym
batchu (np. 96/100 to normalny wynik, nie błąd do naprawy).

## 2. Zatwierdzenie

```bash
curl -X PATCH http://localhost:PORT/api/posters/bulk-approval \
  -H "Content-Type: application/json" \
  --data '{"approvedForPrint":true,"items":[{"id":"..."}]}'
```
**Port serwera podglądu bywa 3000, 3001 albo 3901 — SPRAWDŹ przed użyciem**
(`curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/api/posters`,
oczekuj 200). Nieużywany port daje `curl` exit 7/28, nie czytelny błąd HTTP.

## 3. Auto-chain PO zatwierdzeniu — ZAWODNY, ZNANY PROBLEM

`bulk-approval` odpala w preview.js łańcuch: enforceMasterStandard →
autoFillMissingShopListings → applyUniformFrame → applyShopThumbnails →
applyFullPrintPdfs → applyFramedPrintPdfs → generateMockups. **Ten łańcuch
wielokrotnie się zacinał w trakcie** (potwierdzone w kilku sesjach) — nie
czekaj na niego ślepo przy większych batchach. Zamiast tego, po ok. minucie
sprawdź stan (`shopifyState` w kartotece) i jeśli stoi, obejdź auto-chain
bezpośrednimi wywołaniami:

```bash
# PDF-y bezpośrednio (bypass chain)
curl -X POST http://localhost:PORT/api/library/full-print-pdfs \
  -H "Content-Type: application/json" --data '{"posterIds":["id1","id2"]}'

# Mockupy bezpośrednio, per poster (patrz sekcja 3b — NIE uruchamiaj bez --scope!)
```

**Prawidłowy wskaźnik "gotowe" to `shopifyState === 'ready'` z
`shopifyIssues: []`** — NIE pole `mockups.frame` (starsze rekordy go nie
mają, mają za to `imagePathFramed`/`imagePathThumb`/`imagePathFramedThumb`;
sprawdzanie `mockups.frame` daje fałszywy negatyw na nowszych rekordach).

## 3a. Wyścig zapisu: mockupy vs bulk-approval — GUBI WPISY

**Objaw**: skrypt mockupów kończy "gotowe: N, błędów: 0", pliki leżą na
dysku, ale w kartotece `mockups` jest puste/brak.

**Przyczyna**: `bulk-approval` trzyma całą kartotekę W PAMIĘCI przez cały
(długi) przebieg i zapisuje ją na końcu. Endpoint mockupów czyta kartotekę Z
DYSKU przy każdym wywołaniu i zapisuje od razu. Jeśli mockupy lecą W TRAKCIE
gdy bulk-approval jeszcze pracuje (albo gdy przerwiesz proces równoległy
ręcznie, np. `TaskStop` w trakcie), końcowy zapis bulk-approval NADPISUJE to,
co mockupy w międzyczasie dopisały — do 72 wpisów bywa utraconych naraz.

**Naprawa (nie wymaga regeneracji — pliki są bezpieczne na dysku)**:
```bash
node scripts/naprawWpisyMockupow.js             # próba — pokaże co odzyska
node scripts/naprawWpisyMockupow.js --wykonaj   # przywraca wskaźniki
```
Odzyskuje wpis `mockups.frame`/`mockups.interior` dla każdego rekordu, którego
PLIKI `<base>_mockup_frame.jpg` / `_mockup_interior.jpg` istnieją na dysku, ale
kartoteka o nich nie wie. Uruchamiaj DOPIERO gdy wszystkie równoległe procesy
piszące do kartoteki się skończyły — inaczej naprawa sama zostanie nadpisana.

## 3b. Generowanie mockupów TYLKO dla konkretnych ID

`node scripts/dogenerujMockupy.js --wykonaj` bierze WSZYSTKIE
`approvedForPrint===true && !mockups.frame` — **na dużym katalogu to może
złapać dziesiątki starych, już gotowych rekordów** (fałszywy negatyw z
sekcji wyżej), nie tylko te, o które Ci chodzi. Widziane 2026-09-18: miało
zrobić 10 nowych, złapało 96 (86 już gotowych, tylko brakowało im legacy pola
`mockups.frame`) — ~97 minut niepotrzebnej pracy. **Przed uruchomieniem na
całym katalogu zrób dry-run (bez `--wykonaj`) i sprawdź liczbę — jeśli dużo
większa niż oczekujesz, NIE odpalaj `--wykonaj`, tylko napisz scoped wariant
wołający `POST /api/posters/{id}/generate-mockups` tylko dla Twojej listy ID.**

## 4. Sync + publikacja

```bash
node scripts/syncShopifyThumbs.js                  # kopiuje do shopify_thumbs/ (płaski katalog!)
git add shopify_thumbs/ && git commit -m "..." && git push origin main
node scripts/exportShopifyCsv.js                    # shopify_csv/products_export_shopify.csv
node scripts/publishShopifyDirect.js <csv> --only=handle1,handle2 --dry-run   # próba
node scripts/publishShopifyDirect.js <csv> --only=handle1,handle2             # realnie
```
`--only=<handles>` scopes do konkretnych produktów — używaj przy dokładaniu
kilku/kilkunastu nowych, żeby nie dotykać całego katalogu. Skrypt sam robi
commit+push miniatur i czyści cache jsDelivr wewnętrznie, ale rób to ręcznie
najpierw jeśli chcesz mieć pewność kolejności (patrz `shopify-publikacja.md`).

## Duplikaty w lokalnej kartotece — realny, powtarzalny problem

Ten sam tytuł potrafi mieć DWA rekordy w `posters_inventory.json` (różne
`id`, ten sam `imagePath`) — jeden już opublikowany i żywy na Shopify, drugi
zapomniany, nigdy niezatwierdzony. Objaw: `productSet` przy publikacji zwraca
`Handle 'xyz' already in use`. To NIE jest błąd do naprawiania przez zmianę
handle — to sygnał, że lokalny rekord jest zbędnym duplikatem.

**Sprawdzenie przed zatwierdzaniem "zaległych" plakatów**:
```js
const dupes = inv.posters.filter(p => /* ten sam title */);
// jeśli >1 rekord z tym samym title, sprawdź który ma shopifyState:'ready'
// i approvedForPrint:true JUŻ ustawione — to jest ten żywy, NIE zatwierdzaj drugiego
```
Po potwierdzeniu (np. przez `productByHandle` na Shopify), usuń zbędny
duplikat z kartoteki:
```js
inv.posters = inv.posters.filter(p => p.id !== 'ID_DUPLIKATU');
```
`posters_inventory.json` jest w `.gitignore` — zmiana nie wymaga commitu.

## Znane zdjęte z produkcji

- **70×100 cm NIE jest sprzedawany** — patrz `ceny-i-rozmiary.md`. Nie
  używaj go jako rozmiaru w nowych planach/zestawach mimo że kod (np.
  `galerieScienne.js SIZE_PRICES`) go wciąż zna.
