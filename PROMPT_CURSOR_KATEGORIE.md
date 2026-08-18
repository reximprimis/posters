# Prompt dla Cursora — przebudowa kategorii i nawigacji sklepu

> Skopiuj wszystko poniżej linii i wklej w Cursorze, mając otwarty projekt motywu Shopify.

---

## Kontekst

Katalog sklepu przeszedł migrację taksonomii. Kategorie były po polsku i pełniły
naraz trzy role: identyfikatora w kodzie, nazwy katalogu i napisu dla klienta.
Teraz są rozdzielone, a **cały katalog jest po angielsku** (docelowo z tłumaczeniami
na niemiecki i polski). Główny rynek to **Niemcy**.

Produkty zostały zaimportowane od nowa z pliku CSV. Motyw sklepu nadal używa starych,
polskich nazw kategorii — trzeba go przestawić.

**Nie zmieniaj handli produktów.** Zostały ustalone i są adresami URL — ich zmiana
zabija pozycje w wyszukiwarce.

## Jak są teraz otagowane produkty

Każdy produkt ma tagi **z przestrzeniami nazw**. To one, a nie osobne pola, niosą całą
strukturę katalogu — Shopify czyta je w kolekcjach automatycznych i w filtrach
Search & Discovery.

```
poster                       ← typ, bez prefiksu; zestawy mają dodatkowo: set
category:botanical
style:photography
orientation:portrait         ← albo landscape
room:living-room
color:green
occasion:christmas           ← opcjonalne, może być kilka
collection:new-arrivals      ← wyliczane z daty, ostatnie 30 dni
size:30x40
```

Zestawy mają dodatkowo: `set`, `set:duo` albo `set:triptych`, `set:pieces-2` / `set:pieces-3`.

Metapola wypełnione: `shopify.orientation`, `shopify.color-pattern`, `shopify.theme`,
oraz `Product Category` = `Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork`.

## Zadanie 1 — podmień nazwy kategorii

Znajdź w motywie wszystkie miejsca ze starymi polskimi nazwami (nawigacja, linki,
tłumaczenia w `locales/`, sekcje na stronie głównej, uchwyty kolekcji) i podmień
zgodnie z tabelą. **Uchwyt kolekcji** = wartość z kolumny „tag", **nazwa wyświetlana**
= kolumna „nazwa".

| stara nazwa PL | tag / uchwyt | nazwa | produktów |
|---|---|---|---|
| Abstrakcja | `abstract` | Abstract | 14 |
| AI i technologia | `ai-technology` | AI & Technology | 3 |
| Zwierzęta | `animals` | Animals | 25 |
| Architektura | `architecture` | Architecture | 7 |
| — | `bar-cocktails` | Bar & Cocktails | 2 |
| Botanika | `botanical` | Botanical | 14 |
| Mapy i miasta | `cities-travel` | Cities & Travel | 4 |
| Kawa i herbata | `coffee-tea` | Coffee & Tea | 5 |
| Cyberpunk i neon | `cyberpunk-neon` | Cyberpunk & Neon | 5 |
| — | `fashion-beauty` | Fashion & Beauty | 1 |
| — | `fitness-gym` | Fitness & Gym | 1 |
| Gaming i e-sport | `gaming-esports` | Gaming & Esports | 4 |
| Humor i memy | `humor-memes` | Humor & Memes | 7 |
| Plakaty dla dzieci | `kids-nursery` | Kids & Nursery | 5 |
| Kuchnia i jedzenie | `kitchen-food` | Kitchen & Food | 5 |
| — | `line-art-figures` | Line Art & Figures | 2 |
| — | `love-romance` | Love & Romance | 2 |
| — | `mountains-hiking` | Mountains & Hiking | 1 |
| Muzyka i dźwięk | `music-sound` | Music & Sound | 3 |
| Natura i krajobrazy | `nature-landscapes` | Nature & Landscapes | 7 |
| Retro | `retro-vintage` | Retro & Vintage | 5 |
| Morze i plaża | `sea-coast` | Sea & Coast | 7 |
| Kosmos i astronomia | `space-astronomy` | Space & Astronomy | 3 |
| Sport i hobby | `sports-hobbies` | Sports & Hobbies | 4 |
| Symbole i harmonia | `symbols-sacred-geometry` | Symbols & Sacred Geometry | 8 |
| — | `typography-quotes` | Typography & Quotes | 3 |
| Pojazdy | `vehicles` | Vehicles | 7 |
| Wellness i joga | `wellness-yoga` | Wellness & Yoga | 6 |
| — | `zodiac-astrology` | Zodiac & Astrology | 2 |
| — | `club-orzel` | Klub Orzeł Mysłakowice | 3 |

**Kategorie usunięte** — jeśli gdziekolwiek w motywie zostały, skasuj:
`Japonia`, `Podróże i plakaty vintage`, `Grzyby i las`.
Ich produkty przeniesiono do `cities-travel`, `botanical`, `animals`
i `nature-landscapes`.

**`club-orzel` jest tylko dla rynku polskiego** — nazwa zostaje po polsku celowo.
Ukryj tę kategorię w nawigacji dla rynku niemieckiego i angielskiego.

## Zadanie 2 — zbuduj nawigację na osiach

Zamiast jednej długiej listy zrób menu z osobnymi kolumnami. Każda oś to osobny
prefiks tagu, więc kolekcje automatyczne budują się warunkiem
*„tag zawiera `<prefiks>:<wartość>`"*.

**Kategorie** — z tabeli wyżej.

**Pomieszczenia** (`room:`) — Living Room, Bedroom, Kitchen, Dining Room, Home Office,
Study, Bathroom, Kids Room, Teen Room, Café.

**Kolory** (`color:`) — black, white, grey, beige, brown, gold, red, orange, yellow,
green, blue, purple, pink.

**Style** (`style:`) — photography, minimalism, abstract, illustration, line art.

**Estetyki** (`aesthetic:` — pojawi się przy kolejnych produktach) — bauhaus,
black-white, exhibition, ukiyo-e, japandi, wabi-sabi, boho, quiet-luxury,
mid-century, scandi.

**Okazje** (`occasion:`) — Christmas, Halloween, Easter, Valentine's Day, New Year,
Birthday, Wedding, New Baby, Housewarming, Party & Fun oraz dwie pod rynek niemiecki:
**Oktoberfest** i **First Day of School** (Einschulung).

**Pory roku** (`occasion:`) — Spring, Summer, Autumn, Winter. Trzymaj je w osobnej
kolumnie niż okazje: sezon trwa kwartał, okazja tydzień.

**Toplisty** — Nowości (`collection:new-arrivals`, odświeża się samo z daty),
Bestsellery (kolekcja automatyczna sortowana po sprzedaży — Shopify ma te dane,
nie tagujemy tego ręcznie).

**Kolekcje autorskie** — `collection:karkonosze` (Karkonosze: Śnieżka, Karpacz,
Kotlina Jeleniogórska).

## Zadanie 3 — filtry

Skonfiguruj Search & Discovery tak, żeby filtrowały po: kategorii, pomieszczeniu,
kolorze, stylu, orientacji i rozmiarze. Orientacja i kolor są dostępne również
jako natywne metapola Shopify, więc użyj metapól tam, gdzie się da — działają
lepiej niż tagi.

## Ograniczenia

- **Nie ruszaj handli produktów.**
- **Nie twórz kolekcji dla kategorii bez produktów** — pusta kategoria w sklepie
  wygląda gorzej niż jej brak. Liczby produktów są w tabeli.
- Nie usuwaj tagów `size:` — na nich stoją warianty rozmiarowe.
- Zachowaj polskie znaki w nazwie `Klub Orzeł Mysłakowice`.

## Weryfikacja

Po zmianach sprawdź:

1. Żadna strona ani plik tłumaczeń nie zawiera już starych polskich nazw kategorii
   (poza `Klub Orzeł Mysłakowice`).
2. Każda kolekcja w nawigacji zwraca co najmniej jeden produkt.
3. Karta produktu pokazuje cztery zdjęcia: plakat, wariant z ramką, packshot w ramie
   i wizualizację w pomieszczeniu.
4. Plakaty poziome (`orientation:landscape`) mają w opisie rozmiarów odwrócone
   wymiary — 40 × 30 cm, a nie 30 × 40.
