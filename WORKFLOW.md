# WORKFLOW.md

## Jak pracujemy nad projektem Plakaty

### 1. Aktualny tryb pracy: BUILD MODE
Na ten moment **nie generuję plakatów samodzielnie**.

Ty uruchamiasz generowanie:
- ręcznie
- albo swoim automatem w programie

Ja zajmuję się:
- poprawą generatora
- promptów
- logiki kategorii i stylów
- CSV / Shopify / opisów / struktury danych
- porządkowaniem workflow
- diagnozowaniem błędów

## 2. Domyślny podział pracy

### Ty
- decydujesz co teraz robimy
- uruchamiasz generowanie z programu
- oceniasz wynik wizualny i kierunek

### Ja
- analizuję problem
- robię poprawki w kodzie lub plikach
- zapisuję nowe wersje plików jako osobne warianty, gdy to bezpieczniejsze
- nie robię zbędnego hałasu technicznego
- nie odpalam generowania bez wyraźnej prośby

## 3. Jak najlepiej zlecać zadania
Najlepszy format wiadomości:

- **cel**: co chcesz osiągnąć
- **zakres**: jaki plik / katalog / moduł
- **język**: PL / EN
- **styl**: premium / prosty / bardziej sprzedażowy / bardziej SEO
- **output**: nowy plik czy nadpisanie

### Przykład
- popraw prompt dla Retro + Photography
- zrób nowy CSV z opisami ramek po angielsku
- nie generuj nic, tylko przygotuj logikę

## 4. Standard działania przy plikach
Jeśli pracujemy na danych handlowych lub CSV:
- domyślnie robię **nowy plik** zamiast nadpisywać stary
- jeśli trzeba, dodaję wersję typu `v2`, `bot`, `final`
- zachowuję oryginał do porównania

## 5. Standard działania przy promptach
Jeśli podajesz mi wzorcowy prompt:
- traktuję go jako kierunek docelowy
- mogę go wdrożyć na automat dla wybranej kategorii i stylu
- nie uruchamiam testowego generowania bez pytania

## 6. Standard komunikacji
- piszę po polsku, chyba że prosisz o angielski
- błędy techniczne ogarniam po cichu
- daję krótki konkret: co zrobiłem, gdzie zapisałem, co dalej

## 7. Proponowany porządek etapów

### Etap A. Build
- prompty
- style
- logika generatora
- struktura katalogów

### Etap B. Test
- Ty odpalasz test z programu
- sprawdzamy wynik
- poprawiamy kierunek

### Etap C. Content / Store
- tytuły
- opisy
- SEO
- Shopify CSV
- metafields

### Etap D. Finalizacja
- porządek plików
- eksport
- gotowe materiały do wrzucenia

## 8. Jedna zasada główna
Najpierw **budujemy system dobrze**, dopiero potem skalujemy generowanie.
