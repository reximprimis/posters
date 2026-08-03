# Estetyki (trzecia oś) i działające kategorie użytkownika — projekt

Data: 2026-08-03

## Problem

Dwa objawy, jedna przyczyna.

**Objaw 1: dodawanie kategorii było funkcją dekoracyjną.** Kategoria dodana z panelu trafiała wyłącznie do `user_settings.json`, pojawiała się na listach i w filtrach, ale każda próba generowania kończyła się błędem `Unknown category`. Podany przy niej `hint` był przekazywany tylko do wyświetlenia i nigdy nie docierał do generatora.

**Objaw 2: brakowało miejsca na trendy.** Taksonomia miała dwie osie — kategoria (co) i styl (jak, czyli technika). Trendy pokroju Japandi, Boho czy wabi-sabi to ani temat, ani technika, lecz *estetyka*: paleta, nastrój, faktura. Nie miały gdzie zamieszkać.

**Dowód, że to luka projektowa, a nie brak treści:** opis kategorii „Plakaty dla dzieci" zawierał `Boho-Scandi ... muted earthy pastels on cream`. Estetyka została przemycona do opisu tematu, bo nie było dla niej osobnej osi.

## Zasada

Trzy osie zamiast dwóch:

```
KATEGORIA (co)  ×  STYL (jak)  ×  ESTETYKA (w jakim nastroju i palecie)
```

Estetyka jest **opcjonalna i ortogonalna**. Nie zmienia tematu ani techniki — nadpisuje wyłącznie paletę, nastrój i fakturę.

## Nienaruszalność istniejących promptów

Warunek nadrzędny: 71 dopracowanych par kategoria+styl nie może się zmienić. Realizacja:

- estetyka jest **doklejana na końcu** promptu jako blok `AESTHETIC OVERRIDE`, bez ingerencji w istniejący tekst
- bez wybranej estetyki prompt jest **identyczny co do bajta** (test)
- nieznana estetyka jest ignorowana, nie wysadza generowania (test)
- blok jawnie zastrzega, że nie zmienia tematu, kompozycji ani zasad bezpiecznego kadru

## Katalog estetyk

Oparty na researchu rynku wall-art na 2026: `japandi`, `wabi-sabi`, `boho`, `quiet-luxury`, `mid-century`, `scandi`. Każda niesie paletę, nastrój, fakturę i listę zakazów.

## Kategorie użytkownika — poziom roboczy (opcja C)

Kategoria dodana z panelu działa **od razu**, ale na promptcie ogólnym (`style_generic`), i jest tak oznaczona w zakładce Prompty. Gdy nisza sprawdzi się sprzedażowo, można ją awansować do dedykowanego buildera w kodzie.

Zmiany:

- przy dodawaniu wybierasz style, które kategoria obsługuje; bez tego pola kategoria była martwa
- `hint` trafia do `getCategoryDescription()`, a stamtąd realnie do promptu
- kategorie użytkownika wczytuje `categoryStyles.js`, nie `preview.js` — dzięki temu widzi je **każde** wejście do systemu: serwer, CLI `node index.js`, skrypty. Inaczej batch z terminala nie znałby kategorii dodanej w przeglądarce.
- kategorie użytkownika dostają blok `CATEGORY FOCUS`, bo część ścieżek (np. Minimalism) wywodzi temat wyłącznie z tytułu, a bez własnej puli tytułów tożsamość takiej kategorii by się gubiła. Kategorie wbudowane bloku nie dostają.
- `validateAllowedPairsCount()` liczy **wyłącznie pary wbudowane** (stałe 71) — kategorie użytkownika są zmienne i nie mogą wywalać startu aplikacji

## DALL·E 3 usunięty z katalogu modeli

Pomiar: limit promptu DALL·E 3 to 4000 znaków, z czego 2564 zjada stały narzut, zostawiając **1436 znaków** na treść. Prompty z routera mają 2800–3500 znaków, więc wybór tego modelu wywaliłby generowanie. Model usunięty z katalogu wraz z uzasadnieniem w kodzie; test pilnuje, żeby nie wrócił bez skrócenia warstw promptu.

## Weryfikacja

- `npm run test:aesthetics` — 13 testów, w tym identyczność promptu bez estetyki
- `npm run test:models` — 14 testów, w tym nieobecność DALL·E 3
- `npm run test:guard` — 11, `npm test` — walidacja par, `npm run audit:duplicates` — czysty
- trzy tryby generatora bez regresji (409 / 400 / 200)
- kategoria testowa dodana i usunięta na żywo, działała bez restartu

## Świadome pominięcia

Nie dodaję pul tytułów ani mapowania na kolekcje pokoi dla kategorii użytkownika — tytuły powstają przez LLM z użyciem `hint`. Estetyki są na razie stałym katalogiem w kodzie; przeniesienie ich do panelu to osobny krok.
