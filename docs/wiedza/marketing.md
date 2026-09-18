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

## Before/After wideo — AI-generowane przejście ODRZUCONE (2026-09-18)

Próba: `openai/gpt-image-2.5/sunburst` (fal.ai) wygenerował realistyczną pustą
ścianę, potem `bytedance/seedance-2.5/image-to-video` (fal.ai, `image_url` =
pusta ściana, `end_image_url` = gotowy packshot z plakatem na ścianie) miał
zrobić płynne "przejście" między nimi. **Wynik odrzucony przez usera: wygląda
sztucznie, "jakaś tragedia", widać że to AI-przejście.** Nie próbować
ponownie tej samej metody (model generuje WŁASNY pomysł na przejście między
klatkami — nie da się tego kontrolować na tyle precyzyjnie, żeby wyglądało
jak prawdziwe ujęcie).

Wniosek: do Before/After NIE używać AI do generowania samego przejścia.
Następnym razem spróbować: (a) prosty cut/crossfade montowany ręcznie (nie
przez model wideo) z dwóch gotowych zdjęć, (b) albo faktyczne nagranie wideo
(prawdziwa kamera) jeśli dostępne, (c) albo zrezygnować z wideo dla tego
formatu i zostać przy statycznym zdjęciu przed/po (split lub karuzela 2
slajdów) — to była pierwotna, bezpieczniejsza propozycja w planie.

## TODO do uzupełnienia tutaj

- Dokładne kroki Competitor Watch (setup tokenu, jak dodać nową markę do
  śledzenia).
- Wnioski strategiczne z analizy konkurencji (gap analysis katalogu vs
  konkurenci) — obecnie tylko w pamięci sesji, warto skondensować tutaj.
- Plan wzrostu FB/IG — osobne strategie per platforma.
