# Shopify: mechanika tłumaczeń

> Skonsolidowane z sesji audytu/poprawek DE (2026-09-17/18).

## API i wersja

Admin GraphQL API `2025-01`: `https://${domain}/admin/api/2025-01/graphql.json`,
nagłówek `X-Shopify-Access-Token`. Storefront API `2025-10` do weryfikacji
market/locale (`@inContext(language: $lang, country: $country)` — **country
jest wymagany, żeby dostać właściwą walutę**; samo `language` domyślnie
wraca do waluty bazowej sklepu).

## `translatableResource` pokazuje TYLKO pola z jakąkolwiek wartością

`translatableResource(resourceId)` → `translatableContent[]` z
`key`/`digest`/`locale`/`value` — pole, które nigdy nie miało wartości (NAWET
w "en", źródłowym locale), **w ogóle się nie pojawia**, więc nie da się do
niego dopiąć tłumaczenia przez `translationsRegister` (potrzebuje realnego
digestu istniejącej wartości).

**Objaw**: chcesz dodać `meta_title`/`meta_description` po niemiecku
produktowi, który nigdy nie miał SEO ustawionego (ani po angielsku) —
`translationsRegister` nie ma czego dopiąć.

**Naprawa, dwuetapowa**:
```js
// 1. Ustaw bazową (angielską) wartość — TWORZY pole z digestem
await gql(`mutation($input: ProductInput!) {
  productUpdate(input: $input) { userErrors { field message } }
}`, { input: { id: gid, seo: { title: enTitle, description: enDesc } } });

// 2. Dopiero teraz translatableResource zwróci digest — rejestruj tłumaczenie
const content = await getDigests(gid); // translatableResource { translatableContent { key digest } }
const field = content.find(c => c.key === 'meta_title');
await gql(`mutation($resourceId: ID!, $translations: [TranslationInput!]!) {
  translationsRegister(resourceId: $resourceId, translations: $translations) {
    userErrors { field message }
  }
}`, { resourceId: gid, translations: [
  { locale: 'de', key: 'meta_title', value: deTitle, translatableContentDigest: field.digest }
]});
```
Użyte na 31 produktach-ramkach naraz bez problemu (`apply_frame_meta.js`,
patrz `scratchpad/` z sesji 2026-09-17 jako wzorzec — jednorazowe skrypty,
nie stałe narzędzia, ale dobry przykład tego wzorca).

## Reużywalne helpery (wzorzec potwierdzony wielokrotnie)

```js
function deriveMetaDescription(bodyHtml) {
  const plain = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= 160) return plain;
  const cut = plain.slice(0, 160);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 100 ? lastSpace : 160).trim() + '…';
}
function replaceQuotedTitle(body, oldTitle, newTitle) {
  const escaped = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`["„'"]\\s*${escaped}\\s*([.,]?)\\s*["""']`, 'g');
  const replaced = body.replace(re, (_m, punct) => `„${newTitle}"${punct}`);
  return { replaced, matched: replaced !== body };
}
```

## Zasady bezpieczeństwa przy masowych poprawkach tekstu (nauczone na twardo)

1. **Nigdy mechaniczny find-replace przez cały katalog na raz.** Każdy tytuł
   czytaj indywidualnie (EN + pełny opis DE), zrozum co produkt faktycznie
   przedstawia, dopiero wtedy pisz naturalne tłumaczenie. Global
   find/replace psuje przypadki gramatyczne (patrz niżej).
2. **Zgodność rodzaju gramatycznego przy podmianie rzeczownika w opisie.**
   Podmieniając np. niemiecki rzeczownik w zdaniu z odmianą przez przypadek,
   nowe słowo MUSI mieć ten sam rodzaj co stare, albo rodzajnik/przymiotnik
   trzeba poprawić ręcznie. Realny błąd z tej sesji: "Via Ferrata Leiter"
   (rodzaj żeński) zamieniono na "Klettersteig" (rodzaj męski) wewnątrz
   frazy "einer X" (celownik żeński) → wyszło błędne "einer Klettersteig"
   zamiast "eines Klettersteigs". Złapane dopiero przy ręcznej próbce 20
   produktów — **zawsze rób próbkę żywą (Storefront API + wizualnie), nie
   tylko sprawdzaj że pole jest niepuste.**
3. **Sprawdzaj duplikaty PRZED zapisem nowego tytułu** — cross-check
   case-insensitive po całym katalogu. Złapane 2 realne kolizje w 121-item
   passie (np. `decorative-orchard-rhythm` i `orchard-in-blossom` oba
   wyszłyby jako "Blühender Obstgarten").
4. **Po masowej poprawce zrób programistyczny re-scan całego katalogu**:
   (a) resztki starej nazwy w polach które nie zostały dotknięte (np.
   `meta_description` gdy zmieniał się tylko `title`, bo skrypt aktualizuje
   meta TYLKO gdy `bodyChanged` — łatwo przeoczyć pola zależne), (b)
   duplikaty tytułów/meta, (c) brakujące meta. Złapało to w tej sesji 4
   przeoczone resztki i 1 pomylony handle (patrz `pipeline-plakatow.md` →
   sekcja duplikatów) — bez tego re-scanu poszłyby na żywo.

## Skrypty opcji wariantów (Size/Print Style)

`scripts/tlumaczOpcjeWariantow.js` — tłumaczy **ProductOption/ProductOptionValue**
(np. "13 × 18 cm (Small)" → "13 × 18 cm (Klein)"), NIE treść produktu. Ma
własny `DICT`/`LOCALES`. Progress trzymany PER LOCALE (`doneLocales: []`),
nie jako płaskie `done: true` — pozwala douczyć nowy język bez ponownego
przetwarzania już zrobionych.
