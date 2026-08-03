# Plakaty — generator i pipeline do Shopify

System do generowania plakatów print-ready (AI) i publikowania ich w sklepie
[reximprimis.com](https://reximprimis.com/collections/posters). Obejmuje: prompty i generowanie
obrazów, ramkę + miniatury + PDF-y, lokalną bazę produktów oraz eksport CSV do Shopify.

## Szybki start

```bash
npm install
cp .env.example .env      # uzupełnij OPENAI_API_KEY (reszta ma sensowne domyślne)
npm run dev               # UI podglądu na http://localhost:3000
```

Bez `OPENAI_API_KEY` aplikacja wstaje, ale nie wygeneruje nowych plakatów.

## Dwa sposoby pracy

**UI (`npm run dev`)** — główne narzędzie. Przeglądanie biblioteki, generowanie, zatwierdzanie
(`approve`), ramki/miniatury/PDF, ustawienia eksportu. Cała reszta dokumentacji zakłada,
że codzienna praca odbywa się tutaj.

**CLI (`node index.js`)** — generowanie wsadowe bez UI.

```bash
node index.js generate "Botanika" 5                 # 5 plakatów, wszystkie style kategorii
node index.js generate "Botanika" 5 --style Minimalism
node index.js generate "Botanika" 5 --mat-frame     # passe-partout wokół motywu
node index.js generate-all 5                        # wszystkie kategorie
node index.js stats                                 # statystyki inventory
```

Bez `--style` liczba oznacza plakaty **na styl**; z `--style` — łącznie.

## Kategorie i style

21 kategorii × 5 globalnych stylów, ale nie każda para jest dozwolona — macierz ma **71
dopuszczonych kombinacji** i jest pilnowana w `src/categoryStyles.js`.

Style: `Photography`, `Minimalism`, `Abstract`, `Illustration`, `Line art`.

Kategorie: Botanika, Abstrakcja, Natura i krajobrazy, Zwierzęta, Mapy i miasta, Plakaty dla
dzieci, Kosmos i astronomia, Retro, Pojazdy, Kawa i herbata, Kuchnia i jedzenie, Architektura,
Morze i plaża, Sport i hobby, Gaming i e-sport, AI i technologia, Humor i memy, Cyberpunk i neon,
Muzyka i dźwięk, Wellness i joga, Symbole i harmonia.

Aktualną listę promptów per kategoria/styl trzyma `CATEGORY_STYLE_PROMPTS_USED.md`.
Walidacja macierzy: `npm test`.

## Pipeline Shopify

Obowiązuje stała kolejność: **approve → ramka/thumb/PDF → sync thumbów → eksport CSV**.

```bash
npm run shopify:reconcile        # klasyfikacja inventory: ready / pending_assets / legacy_blocked
npm run shopify:thumbs           # sync miniatur gotowych produktów do shopify_thumbs/
npm run shopify:export           # CSV z rekordów `ready` -> shopify_csv/products_export_shopify.csv
npm run shopify:headless:check   # porównanie live sklepu (Storefront API) z lokalnym inventory
```

Szczegóły statusów i przepływu assetów: `docs/FRAME_THUMB_PDF_FLOW.md`.
Co jest czym w katalogu CSV i jak działają ceny: `shopify_csv/README.md`.

### Rozmiary i ceny

Sześć rozmiarów print-ready: 13×18, 21×30, 30×40, 40×50, 50×70, 70×100 cm — 300 DPI, 3 mm spadu,
profil CMYK. Do sklepu eksportowanych jest domyślnie pięć (bez 70×100).

Ceny **nie są ustalane w repo** — źródłem prawdy jest sklep, a `shopify_export_settings.json`
tylko je odwzorowuje. Aktualna tabela cen i zasada `Compare At`: `shopify_csv/README.md`.

### Unikalne handle

Handle Shopify liczy się z samego tytułu, więc dwa plakaty o tym samym tytule nadpisałyby się
przy imporcie. Zabezpieczenie działa na czterech poziomach (wspólna funkcja `toPosterHandle()`
w `src/posterTitle.js`, guard przy generowaniu, walidacja w UI, twardy stop przed zapisem CSV).

```bash
npm run audit:duplicates   # raport kolizji, kod wyjścia 1 gdy są duplikaty
npm run test:guard         # testy sprawdzające, że guard faktycznie blokuje
```

Projekt: `docs/superpowers/specs/2026-08-03-duplikaty-handli-design.md`.

## Struktura projektu

```
index.js                      # CLI
preview.js                    # serwer UI + API (Express)
config.js                     # konfiguracja: rozmiary, DPI, ścieżki, kategorie
public/                       # frontend UI (index.html, style.css, logotypy)
src/                          # moduły generatora
  posterGenerator.js          #   orkiestrator generowania
  contentGenerator.js         #   tytuły i prompty (OpenAI)
  dalleImageGenerator.js      #   generowanie obrazów
  promptBuilders.js           #   składanie promptów
  promptRouter.js             #   wybór trybu promptu per kategoria/styl
  categoryStyles.js           #   macierz kategoria × styl (źródło prawdy)
  posterTitle.js              #   normalizacja tytułu -> handle Shopify
  posterNameGuard.js          #   blokada duplikatów tytułów/handli
  safePrintFraming.js         #   walidacja marginesów przed drukiem
  posterMatFrame.js           #   passe-partout
  pdfGenerator.js             #   PDF 300 DPI / CMYK
  mockupGenerator.js          #   mockupy produktowe
  lifestyleMockup.js          #   mockupy wnętrz (Sharp, bez AI)
  shopifyState.js             #   statusy eksportowe
  shopifyHeadless.js          #   Storefront API
scripts/                      # narzędzia operacyjne (eksport, audyty, naprawy)
shopify_csv/                  # eksporty CSV (+ archive/, frames/)
shopify_thumbs/               # miniatury serwowane do Shopify przez Git CDN
docs/                         # dokumentacja operacyjna
design-md/                    # referencje designerskie dla promptów UI
```

### Dane lokalne (poza gitem)

`posters/` (wygenerowane PNG/PDF), `posters_inventory.json` (baza produktów),
`prompt_cache.json`, kopie `posters_inventory.backup_*.json` oraz logi `*.log` są
w `.gitignore` — repo trzyma tylko kod, konfigurację i miniatury eksportowe.

⚠️ `posters_inventory.json` nie ma kopii w repo. Przed operacjami masowymi na danych
handlowych zrób backup tego pliku.

## Konfiguracja

Wszystkie zmienne środowiskowe są opisane w `.env.example` — to źródło prawdy obok kodu.
Najważniejsze grupy: klucz OpenAI, parametry generowania obrazu i upscale'u, safe print framing,
passe-partout, mockupy wnętrz, dostęp do Storefront API.

Tytuły i prompty obrazu układa wyłącznie OpenAI — obsługa Claude'a została z aplikacji usunięta
(`llmProvider=anthropic` zwraca teraz błąd 400).

## Dokumentacja

| Plik | Zawartość |
|---|---|
| `WORKFLOW.md` | Jak dzielimy pracę nad projektem i jak zlecać zadania |
| `docs/FRAME_THUMB_PDF_FLOW.md` | Statusy eksportowe i kolejność generowania assetów |
| `docs/VERSIONING.md` | Zasady wersjonowania aplikacji |
| `shopify_csv/README.md` | Eksporty CSV, ceny, co można importować |
| `CATEGORY_STYLE_PROMPTS_USED.md` | Prompty użyte per kategoria/styl |
| `IMPLEMENTATION_PLAN.md` | Historyczny plan wdrożenia (nieaktualny w szczegółach) |
| `DESIGN.md` | Referencja systemu designu dla UI |

## Testy

```bash
npm test              # walidacja macierzy kategoria × styl
npm run test:guard    # blokada duplikatów handli
npm run audit:duplicates
```
