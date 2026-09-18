---
name: reximprimis-ugc-reveal-video
description: Use when generating an AI Before/After or UGC-style reveal video for REXIMPRIMIS social content — a poster appearing on a wall, being unboxed, or hung — via fal.ai or Higgsfield. NOT YET A PROVEN TECHNIQUE — read the failure log before attempting.
---

# REXIMPRIMIS Before/After & UGC reveal video

## Status: unsolved, actively iterating (last updated 2026-09-18)

No configuration below has produced an accepted result yet. Do not present
a new attempt as "the" solution — show it to the user first, every time,
before assuming it's usable. Full context and every attempt so far lives in
`docs/wiedza/marketing.md` under "Before/After / UGC wideo" — read that
section before starting a new attempt, and add your attempt to that log
regardless of outcome.

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

## Ograniczenie środowiska: brak upload_file do Higgsfield (2026-09-18)

Nie mam w tym środowisku działającego `media_upload`/`media_import_url` dla
Higgsfield (opisane w dokumentacji narzędzi, ale niedostępne jako
faktyczne MCP tool). Skutek: nie da się wstrzyknąć naszego PRAWDZIWEGO
zdjęcia produktu jako referencji do `show_reference_elements`/`generate_image`
— tylko opis tekstowy w promptcie, co daje PODOBNY, ale nie identyczny obraz
(potwierdzone: wygenerowany "Winter Forest" miał ciepłe złote światło i brak
góry w tle, podczas gdy prawdziwy produkt ma chłodne zimowe światło i górski
szczyt).

Dwie opcje na przyszłość, gdy trzeba wiernie odtworzyć konkretny plakat:
1. `mcp__claude-in-chrome` + `media_upload_widget` — user ręcznie wybiera
   plik w przeglądarce (działa, ale wymaga jego interakcji za każdym razem).
2. Zaakceptować, że UGC/lifestyle content z osobą trzymającą plakat to
   ZAWSZE stylizowana aproksymacja tekstowa, nie wierna reprodukcja — OK dla
   "inspired by" contentu, ale NIE prezentować jako dokładne zdjęcie
   konkretnego SKU bez wyraźnego zastrzeżenia.

## TRWAŁA ZASADA #3 — model obrazu: GPT Image 2.5, NIE Nano Banana (2026-09-18)

Higgsfield Elements/generate_image domyślnie podstawia `nano_banana_pro`/
`nano_banana_2` nawet gdy prosisz o co innego. **Dla REXIMPRIMIS zawsze
wymuszaj `model: 'gpt_image_2'`** (ta sama rodzina co `gpt-image-2.5-sunburst`
używana w głównym pipeline generowania plakatów, `src/posterGenerator.js`)
— spójność jakości/stylu z resztą katalogu, nie Nano Banana. Sprawdź w
wyniku `job_display`, jakiego modelu FAKTYCZNIE użyto (pole `model` w
odpowiedzi) — Higgsfield potrafi po cichu podstawić inny.
