# shopify_csv

## Co jest czym

| Ścieżka | Zawartość |
|---|---|
| `products_export_shopify.csv` | **Jedyny aktualny eksport.** Nadpisywany przy każdym `npm run shopify:export`. |
| `archive/` | Historyczne eksporty z datą w nazwie. **Nie importować do Shopify** — mają nieaktualne ceny. Trzymane wyłącznie do porównań. |
| `frames/` | Ręcznie pisane opisy ramek (`frames.csv`, `frame_bot*.csv`, `frame_cursor.csv`). Nie są eksportem produktów, żaden skrypt ich nie używa. |

## Ceny — źródłem prawdy jest sklep

Ceny **nie** są ustalane w tym repo. Odczytujemy je ze sklepu (Storefront API) i dopasowujemy do nich aplikację, nigdy odwrotnie.

Stan na 2026-08-03 (PLN):

| Rozmiar | Cena | Compare at |
|---|---|---|
| 13×18 | 16.00 | 32.00 |
| 21×30 | 26.00 | 52.00 |
| 30×40 | 43.00 | 86.00 |
| 40×50 | 57.00 | 114.00 |
| 50×70 | 71.00 | 142.00 |

`Variant Price` to cena płacona przez klienta. `Variant Compare At Price` to cena przekreślona (cennik) — wyliczana jako cena × `compareAtMultiplier` z `shopify_export_settings.json`. Plakietka `-50%` nie jest nigdzie zapisana: motyw sklepu liczy ją z różnicy między tymi dwoma polami.

⚠️ W ustawieniach podajesz **cenę końcową** (16.00), nie cennikową (32.00).

## Zanim uruchomisz eksport

`scripts/exportShopifyCsv.js` przy każdym uruchomieniu nadpisuje `products_export_shopify.csv`, `shopify_export_history.json` i potencjalnie `posters_inventory.json` — również z flagą `--timestamped`, która jedynie dokłada kopię z datą. Przy operacjach na danych handlowych warto wcześniej zrobić kopię tych trzech plików.
