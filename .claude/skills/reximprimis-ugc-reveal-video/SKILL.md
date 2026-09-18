---
name: reximprimis-ugc-reveal-video
description: Use when generating an AI UGC-style still photo (person holding/showing a REXIMPRIMIS poster) for social content, via Higgsfield. PROVEN technique for stills as of 2026-09-18 — see the recipe below. Video (reveal/transition) is still unsolved — read the failure log before attempting that.
---

# REXIMPRIMIS UGC content: persona + product photo

## Status: STILL IMAGES SOLVED (2026-09-18) — video still unsolved

User explicitly accepted a result on 2026-09-18: "super wyszło dobrze".
Recipe: **Higgsfield, model "GPT Image 2.5 Sunburst"**, two reference
images uploaded via `mcp__claude-in-chrome__file_upload` (real product
`_thumb.jpg` + a `soul_cast`-generated persona image), prompt built from
the three permanent rules (full-bleed/no-passe-partout, exact real artwork,
this model). Matched the real "Winter Forest in Snow" product closely —
mountain peak, cool winter light, stream composition all correct; full
bleed, no mat, rigid 220gsm-looking paper. **Use this exact recipe for
future UGC still-photo requests — see "Dokładny przepis" below for the
full step-by-step.**

Video (a still turning into a reveal/transition/unboxing clip) is a
SEPARATE, still-unsolved problem — see "Why this is hard" below. Don't
assume solving stills also solved video; the failure modes were different.

Also worth evaluating before assuming Higgsfield is the only option: the
user has a local **SimpliGen** app (`mcp__simpligen__*` tools) with a
dedicated UGC Studio / Product Studio — flagged by the user as a possible
ready-made alternative ("to jest coś co możemy wykorzystać bez budowania od
nowa"), not yet tested for this workflow.

## REJECTED: unframed poster "leaning against a wall" (2026-09-18)

Asked for a poster-only shot with NO frame, propped standing against a wall
(same pose as the framed version). User rejected on physical plausibility:
**"to nie wygląda naturalnie, plakat tak sam od siebie nie ustoi"** — a real
unframed sheet of paper cannot stand rigid on its own edge like a framed/
rigid panel would. Obvious in hindsight, missed because the framed version's
pose was reused without rethinking physics for the unframed case.

Fix for next attempt: an unframed print must be shown either (a) lying flat
on a table/floor, (b) held by a person (hands provide the support), or
(c) pinned/clipped to something. Never "self-standing" unless it's actually
framed/rigid-backed.

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
