# Marketing — social, ads, competitor watch

> Szkielet — ten plik rośnie na bieżąco, tak samo jak reszta bazy wiedzy.
> Sporo istniejącej wiedzy marketingowej żyje na razie w `.remember/` (pamięć
> sesji Claude) — poniżej tylko to, co już zweryfikowane i warte trwałego
> zapisu. Dopisuj tu za każdym razem, gdy coś marketingowego wejdzie na żywo.

## Język treści

**Domyślnie zawsze angielski** w treściach marketingowych (posty,
reklamy, opisy) — nigdy polski, chyba że jawnie inny rynek (np. kampania
PL). Reguła bez wyjątków, złamana raz = trzeba poprawiać ręcznie.

## Competitor Watch

Panel monitoruje reklamy konkurencji przez Meta Ad Library API. Token
długożyjący (60-dniowy), wymaga odświeżenia — sprawdź datę wygaśnięcia przed
poleganiem na automatycznym odświeżaniu. Monitoring skonfigurowany jako
Scheduled Task, dopisuje TYLKO nowe reklamy (nie duplikuje przy ponownym
uruchomieniu).

## Format contentu

- **Before/After** (pusta ściana → plakat): przetestowany i zaakceptowany w
  formie zdjęcie+wideo, technika opisana, jeszcze nie w pełni
  zautomatyzowana.
- Rotuj formaty, nie hard-sell w każdym poście — cel lejka: obserwowanie →
  kiedyś zakup, nie każdy post ma sprzedawać wprost.
- Unikaj generycznego/płaskiego "AI look" — dążyć do fotorealizmu (patrz
  `mockupGenerator.js` jako referencyjny standard jakości).

## Publikacja wideo FB/IG

Pełny przepis (scope tokenu, Page/IG ID, hosting na jsDelivr, FB video + IG
3-krokowy publish) — tokeny gotowe w `.env`. Zawsze pokazuj wizualny mockup
posta przed publikacją, nigdy sam tekst — użytkownik chce to zaakceptować
wizualnie, nie na podstawie opisu.

## Before/After / UGC wideo — WCIĄŻ W TRAKCIE UCZENIA SIĘ, nie loguj jako gotowa technika dopóki nie zadziała

**Zasada:** ten format (AI-generowane ujęcie "plakat pojawia się / zostaje
odebrany / wisi na ścianie") wymaga jeszcze dużo prób — NIE zapisuj żadnej
konkretnej konfiguracji jako "sprawdzoną technikę" dopóki wynik nie zostanie
faktycznie zaakceptowany. Poniżej log prób, żeby nie powtarzać dokładnie
tych samych błędów, ale żadna z nich NIE jest jeszcze wzorcem do kopiowania.

Próby do tej pory:
- **2026-09-17, Higgsfield UGC** (empty wall → 50×70 poster pickup →
  framed): pierwsza wersja miała sztuczną taśmę/taping, kłóciła się z
  "autentycznością" UGC — usunięta z publikacji. Scena poprawiona (bez
  pokazywania mocowania/rozpakowania), przełączono model na Seedance 2.5 w
  trakcie — wynik tamtej konkretnej próby nie został zapisany w pamięci
  sesji (nie potwierdzone czy zaakceptowany).
- **2026-09-17, Veo 3.1**: odrzucone — **papier/marginesy wyszły źle**
  (grubość/wygląd papieru nierealistyczny), nie kwestia samego przejścia.
- **2026-09-18, fal.ai `bytedance/seedance-2.5/image-to-video`**
  (`image_url`=wygenerowana pusta ściana, `end_image_url`=gotowy packshot):
  odrzucone — user: "jakaś tragedia, żadnych AI przejść", wygląda sztucznie.

**Wspólny wątek:** za każdym razem inny konkretny problem (taśma, papier,
teraz całe przejście) — to nie jeden łatwy bug do naprawienia, tylko obszar
wymagający realnego treningu/iteracji nad promptami i doborem modeli. Nie
traktować kolejnej próby jako "na pewno się uda" — testować małymi krokami,
pokazywać user każdy wynik przed jakąkolwiek dalszą pracą nad nim.

Gdy coś W KOŃCU zadziała i zostanie zaakceptowane: dopiero wtedy opisać tu
dokładną konfigurację (model, dokładny prompt, parametry) jako referencyjną
technikę do powtarzania.

Bezpieczna alternatywa na czas nauki: statyczne zdjęcie przed/po (bez wideo,
zero ryzyka sztucznego efektu) — użyte zamiast wideo, dopóki technika wideo
nie dojrzeje.

## TODO do uzupełnienia tutaj

- Dokładne kroki Competitor Watch (setup tokenu, jak dodać nową markę do
  śledzenia).
- Wnioski strategiczne z analizy konkurencji (gap analysis katalogu vs
  konkurenci) — obecnie tylko w pamięci sesji, warto skondensować tutaj.
- Plan wzrostu FB/IG — osobne strategie per platforma.

## Decyzja architektoniczna: osobna aplikacja, NIE zakładka w Plakaty (2026-09-18)

System marketingowy (biblioteka assetów: postacie/Soul, sceny, gotowe posty,
log technik, wielo-platformowe publikowanie FB/IG/TikTok/YouTube/Pinterest)
**będzie osobną web-aplikacją**, nie nową zakładką w istniejącej apce Plakaty
(`public/index.html` ma już 10 895 linii — zbyt duża, żeby dokładać kolejny
duży podsystem). Decyzja usera, nie zaczynamy budowy "na już" — to osobny,
przyszły projekt (spec → plan → implementacja jak każdy większy feature).

## TRWAŁA ZASADA — REXIMPRIMIS to full bleed, ZAWSZE (2026-09-18)

**Nasze plakaty w 99% katalogu to full bleed** (`printLayout: 'full'` w
`posterGenerator.js:194,643` — domyślny layout; `matFrame = printLayout !==
'full'`, więc przy full bleed w ogóle NIE MA marginesu/passe-partout).
Obraz wypełnia CAŁY arkusz do samej krawędzi, potem oprawiony edge-to-edge
w ramie — **żadnego białego/kremowego marginesu między grafiką a ramą,
NIGDY**, w żadnym materiale (packshot, salon, social, UGC wideo).

To nie jest szczegół do przypominania za każdym razem — **jeśli generujesz
JAKIKOLWIEK obraz pokazujący nasz plakat w ramie (real photo, AI, UGC,
packshot, wideo), ZAWSZE explicite zabroń mat/passe-partout/border w
promptcie, z góry, bez czekania aż wyjdzie źle.** Sprawdzony, silny wzorzec
tekstu (z `src/galleryInteriorAI.js budujPrompt()`, już używany i działający
w innym miejscu kodu):

> "Do not add a mat board. Do not add a passe-partout. Do not add any cream,
> white, off-white or paper-colored border strip between the artwork and
> the inside of the frame. This rule matters more than anything else in
> this brief — read it twice before generating. [...] the print is face-
> mounted flush to the glass, edge-to-edge [...] zero gap, zero visible
> paper, zero border of any color."

Złapane 2 razy z rzędu w tej samej sesji testowej (2026-09-18, Higgsfield
nano_banana_pro UGC test) mimo że reguła była już znana z innego pliku —
**nie kopiować rozwiązania z pamięci, kopiować DOSŁOWNIE ten cytowany
tekst** za każdym razem przy nowym promptcie dotykającym oprawionego
plakatu.

## TRWAŁA ZASADA #2 — content MUSI pokazywać nasz prawdziwy produkt (2026-09-18)

Obok reguły full-bleed/no-passe-partout (wyżej): każda generacja AI z naszym
plakatem MUSI pokazywać RZECZYWISTY plik produktu, nie tekstowe przybliżenie
"na podstawie opisu". Złamane w tej samej sesji testowej (wygenerowany
"Winter Forest" różnił się od prawdziwego SKU — ciepłe złote światło zamiast
zimnego zimowego, brak góry w tle). Jeśli narzędzie nie przyjmuje realnego
zdjęcia jako referencji (patrz ograniczenie w
`.claude/skills/reximprimis-ugc-reveal-video/SKILL.md`), NIE generuj i nie
prezentuj wyniku jako gotowego contentu — najpierw rozwiąż wstrzyknięcie
prawdziwego pliku (np. user uploaduje ręcznie przez widget).

## Inspiracja UX dla przyszłej własnej aplikacji (2026-09-18)

Higgsfield (UGC Builder, Actor/Elements library, generation widget) to dobry
punkt odniesienia UX dla naszej przyszłej osobnej apki marketingowej (patrz
"Decyzja architektoniczna" wyżej) — biblioteka referencji (postacie/sceny),
prosty flow wyboru + promptu + generowania. Nie kopiować 1:1, ale warto
review przy projektowaniu.

## Before/After / UGC stills — ZAAKCEPTOWANE (2026-09-18)

Po testach z tego dnia: user potwierdził wynik jako "super wyszło dobrze",
w tym konkretnie ramę/full-bleed jako OK. Pełny przepis (model, referencje,
prompt) w `.claude/skills/reximprimis-ugc-reveal-video/SKILL.md` — status
zmieniony z "unsolved" na "PROVEN dla zdjęć statycznych". Wideo (przejście/
reveal) NADAL nierozwiązane, osobny problem.
