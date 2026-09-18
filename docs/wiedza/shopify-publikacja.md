# Shopify: publikacja i scope

## Skrypt

```bash
node scripts/publishShopifyDirect.js <csv> --only=handle1,handle2 --dry-run   # próba
node scripts/publishShopifyDirect.js <csv> --only=handle1,handle2             # realnie
```
Używa `productSet` (upsert) — bezpieczne do wielokrotnego uruchamiania na
tych samych handles. `--only=` scopes do konkretnych produktów — **zawsze
używaj przy dokładaniu nowej partii**, żeby nie dotykać całego katalogu
niepotrzebnie (768+ produktów, długi czas + ryzyko).

Skrypt sam robi commit+push `shopify_thumbs/` i czyści cache jsDelivr
wewnętrznie (po incydencie: niewypchnięte miniatury dawały "Media processing
failed" na Shopify) — ale rób sync/push ręcznie najpierw jeśli zależy Ci na
przewidywalnej kolejności.

## Handle collision = duplikat, nie błąd do obejścia

```
Handle 'xyz' already in use. Please provide a new handle.
```
Oznacza: produkt o tym handle JUŻ ISTNIEJE na Shopify (opublikowany wcześniej
pod innym lokalnym ID). **Nie nadawaj nowego handle** — sprawdź
`productByHandle(handle)` na Shopify, potwierdź że to ten sam plakat, i usuń
zbędny duplikat z lokalnej kartoteki (patrz `pipeline-plakatow.md`).

## Tłumaczenia PO publikacji, nie przed

`tlumaczKatalog.js` wymaga, żeby produkt już istniał na Shopify
(`translatableResource` po handle) — próba tłumaczenia przed publikacją cicho
nic nie robi (raportuje "0 produktów", bo `shopifyState` jeszcze nie jest w
praktyce użytecznym stanie dla `translatableResource`). Kolejność w
`publishShopifyDirect.js` jest poprawna: publikacja → dopiero potem pętla
`tlumaczKatalog.js --handle=X` per opublikowany produkt.

Pojedynczy błąd tłumaczenia (np. `Cannot read properties of undefined
(reading 'title')`) bywa przejściowy (rate limit) — **retry tego samego
`--handle=` osobno zwykle wystarcza**, nie trzeba powtarzać całej publikacji.

## Kanały / publications

`write_publications` dograne — `publishShopifyDirect.js` publikuje
automatycznie na wszystkich 6 kanałach (Headless jest krytyczny, sklep
headless na tym się opiera).

## Port serwera lokalnego podglądu

Nie jest stały — bywał 3000, 3001, 3901 w różnych sesjach. **Zawsze
sprawdź przed pierwszym wywołaniem**:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/api/posters
# oczekuj 200; inny port da curl exit 7/28 (connection refused), nie czytelny błąd HTTP
```
