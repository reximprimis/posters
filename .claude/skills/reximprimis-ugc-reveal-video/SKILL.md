---
name: reximprimis-ugc-reveal-video
description: Use when generating an AI Before/After or UGC-style reveal video for REXIMPRIMIS social content — a poster appearing on a wall, being unboxed, or hung — via fal.ai or Higgsfield. NOT YET A PROVEN TECHNIQUE — read the failure log before attempting.
---

# REXIMPRIMIS Before/After & UGC reveal video

## Status: promising candidate found, NOT yet finally accepted (last updated 2026-09-18)

Best result so far (2026-09-18, session end): Higgsfield GPT Image 2.5
Sunburst, two reference images (real product thumb + Lena persona), prompt
per "Dokładny przepis" section below. First variant (left, in a 1/4 batch)
matched our real "Winter Forest in Snow" product closely — mountain peak,
cool winter light, stream composition all correct; full-bleed, no
passe-partout, rigid paper. **User has NOT yet given final explicit
acceptance** — paused mid-review ("potestujemy inny dzień" / "to jest coś co
możemy wykorzystać bez budowania od nowa może", also raised SimpliGen local
app — UGC Studio / Product Studio — as a possible alternative worth testing).

**Next session: pick up here** — show the saved result again, get explicit
accept/reject, and/or evaluate SimpliGen (`mcp__simpligen__*` tools) as an
alternative to Higgsfield for this workflow before declaring anything final.
Do not present a new attempt as "the" solution until the user has explicitly
signed off — show every result before assuming it's usable. Full context
and every attempt so far lives in `docs/wiedza/marketing.md` under
"Before/After / UGC wideo" — read that section before starting a new
attempt, and add your attempt to that log regardless of outcome.

## Why this is hard

Every attempt so far has failed for a DIFFERENT specific reason — not one
recurring bug:
- Higgsfield UGC (2026-09-17): fake-looking tape/mounting broke authenticity.
- Veo 3.1 (2026-09-17): paper/margins rendered unrealistically.
- fal.ai `bytedance/seedance-2.5/image-to-video`, start→end frame
  (2026-09-18): whole transition read as an obvious "AI effect".

Treat each new attempt as a genuine experiment, not a variation on a known
formula. Budget for several rejected iterations.

## Working pipeline shape (tools, not a validated result)

1. Generate a photorealistic "before" still (empty wall, matching room style
   used in `posters/_galerie/*/` salon shots) — fal.ai `search_models` /
   `recommend_model` for text-to-image, currently `openai/gpt-image-2.5/sunburst`
   (~$1/image). Reuse the room description in
   `src/galleryInteriorAI.js` (`SCENY['living-room']`) for visual consistency
   with existing product photography.
2. For a video attempt: `search_models`/`recommend_model` (category
   `image-to-video`) — do not assume Seedance is right for the next attempt,
   it already failed once. Get pricing (`get_pricing`) and schema
   (`get_model_schema`) before running.
3. Upload local/generated images to fal.ai's CDN with `upload_file` (accepts
   a `url` directly — no separate "import" step needed; Higgsfield's
   `media_import_url` referenced in its own tool docs is NOT available in
   this environment, don't rely on it).
4. Long-running video jobs return `status: "processing"` — poll with
   `check_job` (respect `poll_after_seconds`), fetch with `get_job_result`.
   Don't resubmit while a job is in flight — that starts a new billable job.
5. Download the result locally (`scratchpad/social_weekend/` or similar) and
   send it to the user with `SendUserFile` before any further work — never
   describe a video result in words only.

## Before spending credits

Always confirm with the user before generating (video generation costs
real money) unless they've already said to proceed without asking each
time. Show cost via `get_pricing`/`get_cost` when available.

## When it finally works

Replace this whole file's pipeline section with the exact accepted
configuration (model, full prompt text, parameters) and remove the
"unsolved" framing — this skill should describe the proven method once one
exists, not the search for one.

## ROZWIĄZANE: jak wstrzyknąć nasz prawdziwy plik produktu (2026-09-18)

Higgsfield MCP nie ma działającego `media_upload`/`media_import_url` w tym
środowisku, i `show_reference_elements` odrzuca dowolne zewnętrzne URL jako
`media_input` (potrzebuje prawdziwego ID wydanego przez ich system). Ale
`mcp__claude-in-chrome__file_upload` DZIAŁA i jest szybkie:

1. Otwórz `https://higgsfield.ai/ai/image?model=gpt-image-2-5-sunburst` przez
   `mcp__claude-in-chrome__navigate` — to jest PRAWDZIWE, zalogowane Chrome
   użytkownika (NIE `mcp__Claude_Browser`, to osobna, niezalogowana
   przeglądarka w aplikacji — myląco podobna nazwa, sprawdzone 2026-09-18).
2. `find` z zapytaniem typu "upload image file input button (+ icon near
   prompt box)" żeby znaleźć `ref` inputu plików.
3. `file_upload` z lokalną ścieżką — **limit 10 MB na wywołanie**. Master
   PNG (30+ MB) jest za duży — użyj `<Tytul>_thumb.jpg` (~200-300 KB,
   plenty sharp for reference) zamiast masteru.
4. Powtórz dla drugiego pliku (np. persony) jeśli model wspiera wiele
   referencji — kliknij drugi "+"/`find` ponownie po pierwszym uploadzie
   (dostaje nowy `ref`).
5. Wybierz model w UI (patrz zasada #3 niżej), wpisz prompt (pełne zasady
   full-bleed/no-passe-partout, patrz `docs/wiedza/marketing.md`), klik
   Generate.

To zastępuje wcześniejsze "brak rozwiązania" — nie proponuj już userowi
ręcznego wgrywania przez widget Higgsfield, rób to sam tą ścieżką.

**Dlaczego to ważne dla przyszłości**: `GPT Image 2.5 Sunburst` w Higgsfield
to ten sam model OpenAI (`gpt-image-2.5-sunburst`) co w naszym własnym
pipelinie generowania plakatów (`src/posterGenerator.js`, wywoływany wprost
przez `OPENAI_API_KEY` z `.env`). Higgsfield tu jest tylko wygodną warstwą UI
+ referencje (Elements) — **gdy ta technika się sprawdzi, można ją
odtworzyć bezpośrednio przez OpenAI Images API (`images.edit` z wieloma
obrazami referencyjnymi) i pominąć kredyty Higgsfield całkowicie.** Dlatego
dokumentuj TU dokładny kształt promptu i który obraz pełni jaką rolę (persona
vs produkt) — to przenosi się wprost na `images.edit(image: [ref1, ref2],
prompt: "...")`.

### Dokładny przepis z sesji 2026-09-18 (do powtórzenia/przeniesienia na własne API)

1. Referencja #1 (rola: produkt) — `<Tytul>_thumb.jpg` naszego prawdziwego
   plakatu (NIE master PNG — za duży, >10MB; thumb ~200-300KB wystarcza).
2. Referencja #2 (rola: persona) — wygenerowany portret postaci (np.
   `soul_cast` multi-view sheet).
3. Prompt (pełna wersja użyta, sprawdzona pod kątem 3 trwałych zasad —
   full-bleed, prawdziwy produkt, model): zaczynaj od "Photorealistic
   UGC-style selfie of the woman from the second reference image... holding
   up the exact framed poster from the first reference image... Reproduce
   the artwork inside the frame exactly as in the first reference image —
   [opisz konkretne cechy: scena, paleta, oświetlenie] — do not invent a
   different scene." Potem PEŁEN cytat anti-passe-partout (patrz wyżej), potem
   opis papieru 220gsm.
4. Model: GPT Image 2.5 Sunburst. Rozdzielczość 2K, jakość High.

## TRWAŁA ZASADA #3 — model obrazu: WYŁĄCZNIE GPT Image 2.5 Sunburst/Flare (2026-09-18, ZAMKNIĘTE — nie dyskutować ponownie)

Higgsfield domyślnie podstawia Nano Banana nawet gdy prosisz o co innego.
**Zawsze wybieraj jawnie w UI (albo przez dokładny endpoint_id w MCP)
"GPT Image 2.5 Sunburst" (precyzja, edycje) lub "GPT Image 2.5 Flare"
(szybsze, codzienne)** — user potwierdził 2026-09-18: "to nowe [modele],
słuchają promptów [dobrze]". NIGDY plain "GPT Image 2", NIGDY Nano Banana,
NIGDY Seedream/Soul dla tego typu contentu. Zweryfikuj w wyniku, jakiego
modelu FAKTYCZNIE użyto — Higgsfield potrafi po cichu podstawić inny.
Ta zasada jest zamknięta — nie proponować innych modeli i nie pytać o to
ponownie.
