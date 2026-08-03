# Panel: Połączenia, Modele, Prompty — projekt

Data: 2026-08-03

## Problem

Zakładka „API & Modele" była wyłącznie podglądem i nie mówiła, skąd pochodzą wartości ani czego dotyczą. Trzy ustalenia z analizy kodu pokazują, że problemem była nie tylko forma, ale i treść:

1. **`generateImagePrompt()` nigdy nie wywołuje LLM-a.** Zawsze bierze wbudowany szablon z `promptRouter` i oznacza go jako `provider: 'template'`, `model: master-prompt-v1`. Etykieta „Model promptów: gpt-4o-mini" sugerowała nieprawdę — ten model obsługuje wyłącznie tytuły i opisy sklepowe.
2. **Anthropic jest obiecany, ale martwy.** `.env` ustawia `ANTHROPIC_API_KEY` i `PROMPT_LLM=openai|anthropic`, lecz w `package.json` nie ma SDK, a `getAvailableLlmProviders()` zwraca twardo `['openai']`.
3. **Trzy ścieżki generowania używają modeli inaczej**, czego panel nie pokazywał.

## Macierz wpływu

| Ścieżka | Model obrazów | Model tytułów i opisów | Wbudowane prompty |
|---|---|---|---|
| Dodaj własne zdjęcie | nieużywany | tylko opis sklepowy | nie |
| Generator manualny | tak | tylko opis sklepowy | jako podpowiedź w polu |
| Generator automatyczny | tak | tytuły + opisy | rdzeń generacji |

## Zasada

Każde ustawienie nosi plakietki **gdzie działa**: `[Własne zdjęcie]` `[Manualny]` `[Automatyczny]`. Wyszarzona plakietka oznacza, że ta ścieżka danego ustawienia nie używa. Zasięg zmiany jest widoczny przed jej wprowadzeniem.

## Zakładki

**Połączenia** — karty dostawców ze statusem, przeznaczeniem i źródłem konfiguracji: OpenAI (aktywny), Anthropic (klucz ustawiony, brak integracji), Shopify Storefront, CDN jsDelivr.

**Modele** — picker inspirowany Higgsfieldem: karta na model z ikoną, plakietką i jednym zdaniem opisu.
- Model obrazów: `gpt-image-2`, `gpt-image-1.5`, `dall-e-3`
- Model tytułów i opisów: `gpt-4o-mini`, `gpt-4o`, `gpt-5`

Nazwa „Model promptów" zmieniona na „Model tytułów i opisów", żeby usunąć nieporozumienie z punktu 1.

**Prompty** — wybór kategorii i stylu pokazuje trasę (jedna z 6), pełny tekst promptu i macierz wszystkich 71 dozwolonych par. Podgląd jest darmowy: `buildImagePromptForRoute()` to czysta funkcja bez wywołań API. Stan wyjściowy: 71/71 par ma dedykowany prompt, zero na `core_fallback`.

## Precedencja konfiguracji

Nadpisania z panelu trafiają do `user_settings.json` w polu `models`. Karta zawsze pokazuje obie wartości — z `.env` i z panelu — oraz która wygrywa. Precedencja jest wystawiona, nie ukryta; to odpowiedź na ryzyko dwóch źródeł prawdy.

Nadpisania są stosowane do `process.env` przy starcie serwera i przy każdym zapisie.

## Zmiany w kodzie

- `src/modelCatalog.js` (nowy) — katalog modeli: id, etykieta, opis, plakietka, zasięg ścieżek; jedyne źródło prawdy dla UI i walidacji
- `config.js` — `openaiPromptModel` z pola stałego na getter, żeby zmiana działała bez restartu
- `preview.js` — `/api/settings` rozszerzone o połączenia i nadpisania; nowe `/api/settings/models`, `/api/prompts/routes`, `/api/prompts/preview`
- `public/index.html` — przebudowa zakładki na trzy sekcje

## Zachowanie funkcjonalności

Trzy tryby generatora pozostają nietknięte. Nie zmieniam `generateStagingPreview`, `generateStagingPreviewFromImageBuffer` ani ścieżki batch. Panel czyta konfigurację i podmienia dwie nazwy modeli — logika generowania bez zmian.

## Świadome pominięcia

Prompty są tylko do podglądu; ich edycja to zmiana kodu, nie ustawień. Klucze API pozostają wyłącznie w `.env` — nie przechodzą przez formularz. Nie dodaję modeli innych dostawców, bo aplikacja nie ma ich SDK.

## Weryfikacja

- `npm run test:models` — katalog spójny, walidacja odrzuca nieznany model, precedencja `.env` vs panel liczona poprawnie
- macierz promptów zwraca 71 par i zero `core_fallback`
- zmiana modelu obrazów widoczna w `/api/settings` bez restartu
- wszystkie trzy tryby generatora odpowiadają po zmianie ustawień
