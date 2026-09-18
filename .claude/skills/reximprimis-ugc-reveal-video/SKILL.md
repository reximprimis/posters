---
name: reximprimis-ugc-reveal-video
description: Use when generating an AI UGC-style still photo or short video (person holding/showing a REXIMPRIMIS poster, framed or unframed) for social content, via Higgsfield. Stills AND short image-to-video clips both have proven recipes as of 2026-09-18 — see below.
---

# REXIMPRIMIS UGC content: persona + product photo/video

## Status: STILL IMAGES SOLVED (2 recipes) + VIDEO SOLVED (image-to-video, 2026-09-18)

User explicitly accepted TWO results on 2026-09-18: framed+held ("super
wyszło dobrze") and unframed+flat-lying ("to jest ok zaakceptowane
przezemnie"). Both: **Higgsfield, model "GPT Image 2.5 Sunburst"**, two
reference images uploaded via `mcp__claude-in-chrome__file_upload` (real
product `_thumb.jpg` + a `soul_cast`-generated persona image), prompt built
from the permanent rules (full-bleed/no-passe-partout, exact real artwork,
this model, correct 30x40cm scale). Full recipes below under "Dokładny
przepis" (framed) and "Wariant BEZ ramy" (unframed).

**For future pieces, vary**: the surface/background (rug type, table, floor,
room), the camera angle/crop, how much of the hand(s) is shown, AND —
important addition — **the pose and the persona itself should NOT repeat
too often** ("dobra ale już nie za dużo tej samej pozycji i osoby",
2026-09-18). Don't default every single piece to "Lena, hands close to
chest, straight-on selfie" — rotate poses (angled, over-shoulder, close-up
crop on just hands+frame, etc.) and consider a second/third persona for
variety across a content batch. Keep the model, the size (30x40cm), and the
full-bleed/no-passe-partout/real-artwork language IDENTICAL across
variations — those are the parts that took multiple rejected iterations to
get right, don't re-litigate them.

Video: see "VIDEO — PROVEN TECHNIQUE" below. Solved 2026-09-18 by abandoning
the "reveal/transition" idea entirely (that's what failed 3 times — see
"Why earlier video attempts failed") and instead animating an ALREADY-
ACCEPTED still with minimal, subtle motion via Higgsfield's "Turn to video"
(Kling 3.0, image-to-video). Not a reveal, not an unboxing, not a scene
transition — just the existing photo very slightly coming alive.

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

## VIDEO — PROVEN TECHNIQUE (2026-09-18)

User accepted two video results the same day both stills were finalized:
the unframed flat-lay ("akceptuję" for the mandala reel) and the framed
held-in-chest shot ("akceptuję" for the Winter Forest reel). Both used the
exact same method — apply it as-is to any other already-accepted still.

**The method:**
1. Start from an ALREADY-ACCEPTED still from this skill's still-image
   recipes (framed or unframed) — never a fresh/unvetted image. The still
   must already pass full-bleed/real-product/scale checks before you
   animate it; video does not fix a bad still.
2. Open it in Higgsfield asset detail view and click **"Turn to video"** —
   this lands on `https://higgsfield.ai/ai/video` (Create Video tab) with
   the still pre-loaded as the start frame, model **Kling 3.0**.
3. Clear whatever leftover prompt is in the textbox (the field often has
   stale text from a previous unrelated project — always check and replace,
   don't append).
4. Write a MINIMAL-MOTION prompt, not a transition/reveal/story prompt.
   This is the key insight that made it work where 3 prior attempts failed:
   ask for the photo to *almost* stay still with one small natural motion,
   never a scene change, unboxing, or camera move that reads as "effect".
5. Generate (30 credits, ~5.0s @ 4K, 9:16, audio, takes ~2-3 min — poll
   with screenshots every ~10s, don't resubmit while "Generating").
6. Download via the panel download icon (top-right of the video player,
   not the "..." menu) — it saves to the user's real Chrome Downloads
   folder. Copy it into `scratchpad/social_weekend/` and send with
   `SendUserFile` before reporting it as done — never describe a video
   result in words only.

**Accepted prompt template — unframed/flat-lay variant** (used on the
Golden Mandala Bloom still):

> Subtle, realistic overhead product video, almost still. A poster print
> lies completely flat on a soft cream rug, a woman's hand resting on one
> corner. The camera holds an almost static overhead angle with only a
> very slight, slow, natural drift, like a handheld phone held steady.
> Soft window daylight shifts very gently, shadows move subtly as if from
> a passing cloud. The hand makes one small, natural motion: fingers
> gently press down then relax, as if smoothing the print. The poster
> paper itself stays perfectly flat, rigid and unmoving the entire time -
> no curling, no lifting, no flapping, no bending. No camera zoom, no
> cuts, no text, no watermark. Authentic phone-camera look, like a live
> photo, not an obvious AI effect.

**Accepted prompt template — framed/held variant** (used on the Winter
Forest in Snow framed still):

> Subtle, realistic UGC-style selfie video, almost still. A woman holds a
> small framed poster print close to her chest with both hands, smiling
> gently at the camera, exactly as in the reference image. The camera
> holds an almost static handheld angle with only a very slight, slow,
> natural sway, like a real phone held in one hand. Her expression shifts
> very slightly and naturally - a soft blink, a small genuine smile
> forming. The frame in her hands stays perfectly still and steady, held
> firmly and confidently, no shaking, no tilting, no change in size or
> position relative to her body. Soft indoor daylight flickers very
> gently. No camera zoom, no cuts, no text, no watermark. Authentic
> phone-camera look, like a live photo, not an obvious AI effect.

**Pattern to copy for new variants**: keep the "almost static camera / one
small natural motion / [the poster or frame] stays perfectly rigid and
unmoving / no camera zoom, no cuts, no text, no watermark / authentic
phone-camera look, not an obvious AI effect" skeleton — only swap in the
specific pose/scene description and which single element gets the "one
small natural motion" (hand for flat-lay, face/expression for held-in-hands).

**Why this worked where 3 prior attempts failed**: every earlier attempt
tried to generate a STORY (reveal, unboxing, before→after transition) —
see "Why earlier video attempts failed" below for the specifics. A model
generating a story has to invent new content each time, and that's exactly
where "obvious AI effect" artifacts crept in. Asking for near-stillness
instead sidesteps the problem: there's almost nothing left to hallucinate.

**5s is short but usable** ("krótki ale do ujęcia się nada", user
2026-09-18) — treat each clip as ONE shot in a longer sequence/carousel/
reel, not a standalone finished video. Don't try to stretch duration or
add a story to a single clip; cut multiple such clips together instead if
a longer piece is needed.

**Before spending credits**: confirm cost with the user before generating
(30 credits ≈ real money) unless they've already said to proceed without
asking each time — the Generate button shows the credit cost, read it back
to the user or just state it plainly before clicking.

## Why earlier video attempts failed (kept for reference — don't repeat)

Every attempt before 2026-09-18 tried to generate a STORY/transition, and
failed for a different specific reason each time:
- Higgsfield UGC (2026-09-17): fake-looking tape/mounting broke authenticity.
- Veo 3.1 (2026-09-17): paper/margins rendered unrealistically.
- fal.ai `bytedance/seedance-2.5/image-to-video`, start→end frame
  (2026-09-18): whole transition read as an obvious "AI effect".

The fix wasn't a better prompt for any of these specific problems — it was
abandoning the "story" premise entirely (see "VIDEO — PROVEN TECHNIQUE"
above).

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

## POTWIERDZONE: bezpośrednie OpenAI API — PREFEROWANA metoda dla stilli (2026-09-18)

Przetestowane wprost 2026-09-18 (seria Golden Autumn Forest Path, 3 ujęcia) —
`client.images.edit({model: 'gpt-image-2.5-sunburst', image: [productFile,
personaFile], prompt, size: '1024x1536', quality: 'high', n: 1})` z pakietu
`openai` (SDK v6.34.0+) daje wynik **identycznej lub lepszej jakości** niż
przez Higgsfield UI, bez limitu 10MB na referencję, bez flakiness przeglądarki
(timeouty typing, zgubione uploady), bez kredytów Higgsfield, i szybciej
(jeden request, brak pollingu UI). `images.edit` przyjmuje `image` jako
TABLICĘ plików (`toFile(buffer, name, {type})` per obraz) — dwie referencje
(produkt + persona) działają dokładnie tak jak w Higgsfield, kolejność w
tablicy = kolejność "first/second reference image" w promptcie.

**Od teraz: dla NOWYCH stilli w tym stylu, użyj bezpośrednio tego API,
NIE Higgsfield przeglądarki** — Higgsfield zostaje jako opcja zapasowa (np.
gdy trzeba coś wizualnie sprawdzić z userem krok po kroku) albo do wideo
(Kling 3.0/Seedance — te NIE są dostępne przez to samo OpenAI API, video
nadal wymaga Higgsfield albo fal.ai). Wzorcowy skrypt jednorazowy:
`scratchpad/social_weekend/gen_ugc_direct2.js` (2026-09-18) — kopiuj i
podmieniaj `PRODUCT_PATH`/`ART_DESC`/prompty dla kolejnych plakatów/póz.

### Dokładny przepis z sesji 2026-09-18 — FINALNIE ZAAKCEPTOWANY ("super")

1. Referencja #1 (rola: produkt) — `<Tytul>_thumb.jpg` naszego prawdziwego
   plakatu (NIE master PNG — za duży, >10MB; thumb ~200-300KB wystarcza).
2. Referencja #2 (rola: persona) — wygenerowany portret postaci (np.
   `soul_cast` multi-view sheet).
3. Model: **GPT Image 2.5 Sunburst**. Rozdzielczość 2K, jakość High.
4. Prompt (pełna zaakceptowana wersja, złożona iteracyjnie):

> Photorealistic UGC-style selfie of the woman from the second reference
> image, at home, holding up a SMALL framed poster print with both hands
> close to her chest, showing it to the camera. IMPORTANT SIZE: the poster
> is a modest 30x40cm print — about the size of a large magazine or a
> laptop screen, clearly smaller than her torso, held comfortably close to
> her body with both hands without stretching her arms wide or the frame
> extending past her shoulders. Do NOT make it large or oversized.
> Reproduce the artwork inside the frame exactly as in the first reference
> image — [opisz konkretne cechy: scena, paleta, oświetlenie] — do not
> invent a different scene or lighting. [PEŁEN cytat anti-passe-partout,
> patrz sekcja full-bleed wyżej] CRITICAL paper quality: genuine thick
> 220gsm fine-art poster print, rigid, flat, substantial weight, matte
> non-reflective surface, held firmly flat with no bending, sagging or
> curling — NOT thin copy paper. Natural indoor daylight, cozy modern
> living room background, authentic phone-camera look, candid genuine
> smile.

**Kluczowa poprawka z tej sesji: jawnie podaj rozmiar w cm i porównanie do
znanego przedmiotu (magazyn/laptop)** — bez tego model domyślnie generuje
plakat wyglądający jak 70×100 (za duży względem osoby, nienaturalna skala).
"30x40cm... nie większy niż tors... blisko ciała, bez rozciągania ramion" to
sprawdzony, działający fragment do kopiowania przy każdym kolejnym promptcie
z osobą trzymającą plakat.

### Spójność między ujęciami w tej samej sekwencji/wideo (2026-09-18)

Jeśli kilka zdjęć (np. plakat sam + plakat w ramie trzymany przez osobę)
mają być użyte razem w jednej sekwencji/karuzeli/wideo — **rozmiar (np.
30x40cm) i wygląd ramy muszą być identyczne we wszystkich ujęciach**, nie
generowane niezależnie za każdym razem. Ustal rozmiar i styl ramy raz, wpisz
identyczne wartości w każdy kolejny prompt tej samej serii.

**Złapane na żywo (2026-09-19)**: seria 3 zdjęć (Golden Autumn Forest Path,
ta sama persona) — dwa ujęcia z ramą wygenerowane osobnymi promptami dostały
RÓŻNY kolor ramy (jedno drewniane, jedno czarne), mimo że żaden prompt nie
podawał koloru ramy wprost — model sam wymyślił kolor za każdym razem.
User złapał to od razu: "Dwie różne ramki". **Fix: zawsze wpisuj DOKŁADNY
kolor/materiał ramy explicite w promptcie** (np. "a plain, thin, matte
BLACK frame — same black frame color and thin profile as a standard modern
poster frame, NOT wood, NOT brown, NOT any other color"), nie polegaj na
domyślnym zachowaniu modelu, nawet przy tym samym produkcie/personie w tej
samej serii. Ustal kolor ramy PRZED pierwszym promptem serii, wpisz go
identycznie w każdy kolejny.

### Wariant BEZ ramy — FINALNIE ZAAKCEPTOWANY ("to jest ok zaakceptowane przezemnie")

Iteracje po drodze i co odrzucono:
1. ❌ Stojący oparty o ścianę bez ramy — fizycznie niemożliwe, papier nie
   stoi sam.
2. ❌ Leżący płasko, ręce W TRAKCIE rozwijania z rolki (widoczny zwinięty
   koniec) — user: "plakat bez zawijania z rolki", chciał całkowicie płaski.
3. ❌ Ze stylizacją (książki, doniczka z kwiatkiem) — user: "książka i
   kwiatek w kadrze to głupie" — zero dodatkowych rekwizytów.
4. ✅ **Zaakceptowane**: całkowicie płasko leżący plakat na jasnym dywanie,
   WIDOK LEKKO Z GÓRY POD KĄTEM, jedna dłoń delikatnie dotykająca rogu
   (nie trzymająca, nie rozwijająca), zero rekwizytów poza dywanem.

Zaakceptowany prompt (kopiuj i podmieniaj tylko opis konkretnej sceny):

> Photorealistic overhead lifestyle product photo, viewed from slightly
> above at an angle. A poster print lies completely FLAT on a soft
> cream-colored rug — no curl, no rolling, no bending anywhere, fully flat
> from edge to edge as if freshly placed down. NO frame of any kind. A
> woman's hand (matching the hands of the woman in the second reference
> image, no face needed) rests gently on one corner of the print,
> fingertips just touching the surface. The print is a modest 30x40cm
> size. No other props, no books, no plants, no extra styling — just the
> rug, the flat print, and the hand. Reproduce the artwork exactly as in
> the first reference image — [opisz konkretne cechy: scena, paleta,
> oświetlenie] — do not invent a different scene or lighting. The artwork
> is full-bleed, edge-to-edge, with NO white border or margin around it at
> all. CRITICAL paper quality: genuine thick 220gsm fine-art poster paper,
> visible slight thickness at the edge, matte non-reflective surface,
> completely flat and rigid — NOT thin flimsy copy paper, NOT curling, NOT
> rolled. Soft warm daylight from a window, authentic photography look, no
> text, no watermark.

**Mamy teraz DWA gotowe, zaakceptowane przepisy**: z ramą trzymaną w rękach
(wyżej) i bez ramy leżący płasko (tu). Oba: GPT Image 2.5 Sunburst, 30x40cm,
2 referencje (produkt + persona), pełne zasady full-bleed/prawdziwy produkt.

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
