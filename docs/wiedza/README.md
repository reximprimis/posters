# Baza wiedzy operacyjnej REXIMPRIMIS

System dowodzenia operacją: wszystko, co sprawdziliśmy w praktyce i wdrożyliśmy
(albo świadomie odrzuciliśmy), zapisujemy tutaj — żeby nie uczyć się tego
samego dwa razy. To NIE jest pamięć sesji Claude (ta znika/rotuje) — to trwała,
wersjonowana wiedza w repo, którą przeczyta każdy (i każda przyszła sesja).

## Kiedy dopisywać

Za każdym razem, gdy coś:
- **zadziałało i weszło na sklep** (nowy typ produktu, poprawka pipeline'u,
  nowy wzorzec tłumaczeń) — zapisz JAK to zrobiliśmy, żeby dało się powtórzyć.
- **nie zadziałało / okazało się bugiem** — zapisz PRZYCZYNĘ i naprawę, żeby
  nikt nie wpadł w tę samą pułapkę drugi raz.
- **wymagało dokładnego pomiaru/kalibracji** (np. geometria ramek, ceny,
  progi) — zapisz KONKRETNE liczby i skąd się wzięły, nie tylko wniosek.

## Jak dopisywać

1. Znajdź właściwy plik domenowy poniżej (albo załóż nowy, jeśli domena
   jeszcze nie istnieje — dopisz go też do tej listy).
2. Pisz krótko i konkretnie: polecenia, stałe, ścieżki plików, dokładne liczby.
   Nie streszczaj ogólnie "poprawiliśmy ramki" — napisz JAKIE wartości, W
   KTÓRYM pliku, i DLACZEGO stara wartość była zła.
3. Data + jednozdaniowy kontekst na górze wpisu (np. z jakiego zlecenia to
   wynikło) — ułatwia later grep po historii.
4. Jeśli wpis unieważnia wcześniejszy zapis w tym samym pliku, nie kasuj
   starego bezmyślnie — zostaw krótką notatkę "NIEAKTUALNE od DATA, patrz X"
   albo zaktualizuj wartość i dopisz kiedy/dlaczego się zmieniła.

## Domeny

- [`pipeline-plakatow.md`](pipeline-plakatow.md) — pełny cykl życia plakatu:
  generowanie → zatwierdzenie → PDF → mockupy → sync → Shopify. Znane bugi
  wyścigu zapisu i jak je obchodzić.
- [`shopify-tlumaczenia.md`](shopify-tlumaczenia.md) — mechanika tłumaczeń
  Shopify (translationsRegister, digesty, dwuetapowe SEO), skrypty.
- [`shopify-publikacja.md`](shopify-publikacja.md) — productSet, scope
  publikacji (`--only`), kolizje handle, kanały/publications.
- [`zestawy-scienne.md`](zestawy-scienne.md) — kompozycja zestawów ściennych:
  dokładna geometria (cm/px), stałe w `galleryVisuals.js`, jak dobierać
  rozmiary żeby hero i kolumna się bilansowały.
- [`ceny-i-rozmiary.md`](ceny-i-rozmiary.md) — które rozmiary REALNIE
  sprzedajemy (i które są tylko w starym kodzie, ale nie na sklepie).
- [`marketing.md`](marketing.md) — social, competitor watch, ads — na razie
  szkielet, dopisujemy na bieżąco.

## Powiązane, ale NIE tutaj

- `docs/FRAME_THUMB_PDF_FLOW.md`, `docs/VERSIONING.md` — istniejące doki
  techniczne sprzed tego systemu, zostają osobno.
- `.remember/` — pamięć bieżącej sesji Claude (dzienna, rotuje). Ta baza
  wiedzy to jej trwała, uporządkowana destylacja — nie duplikujemy tu
  wszystkiego z `.remember/`, tylko to, co ma wartość długoterminową.
