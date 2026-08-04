/**
 * Testy eksportu na rynki zewnetrzne i mechanizmu tlumaczen.
 *
 * Najwazniejszy warunek: dodanie tlumaczen NIE MOZE zmienic zachowania
 * istniejacego eksportu Shopify. Shopify jest komercyjny i przynosi przychod.
 *
 * Uzycie: npm run test:marketplaces
 */

const path = require('path');
const tr = require(path.join(__dirname, '..', 'src', 'translations'));
const mk = require(path.join(__dirname, '..', 'src', 'marketplaces'));
const allegro = require(path.join(__dirname, '..', 'src', 'marketplaces', 'allegro'));

let pass = 0;
let fail = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  OK   ${name}`);
    pass++;
  } catch (e) {
    console.log(`  FAIL ${name}\n         ${e.message}`);
    fail++;
  }
}
function expectEqual(a, b, label) {
  if (a !== b) throw new Error(`${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}
function expectTrue(v, label) {
  if (!v) throw new Error(`${label}: oczekiwano true`);
}

const QUOTE = String.fromCharCode(34);

const plakat = {
  id: 'Botanika_Test_abc',
  title: 'Soft Flow',
  shopDescription: 'An English description.',
  imagePathThumb: 'posters/Botanika/minimalism/Test_thumb.jpg',
  imagePathFramedThumb: 'posters/Botanika/minimalism/Test_ramka_thumb.jpg',
  mockups: { interior: 'posters/Botanika/minimalism/Test_mockup_interior.jpg' },
};

console.log('TLUMACZENIA:');

check('angielski jest zrodlem, nie tlumaczeniem', () => {
  const c = tr.resolveContent(plakat, 'en');
  expectEqual(c.description, 'An English description.', 'opis');
  expectEqual(c.fallback, false, 'fallback');
});

check('brak tlumaczenia cofa sie do angielskiego i to zglasza', () => {
  const c = tr.resolveContent(plakat, 'pl');
  expectEqual(c.description, 'An English description.', 'opis');
  expectEqual(c.fallback, true, 'flaga fallback');
});

check('zapisane tlumaczenie wygrywa', () => {
  const p = tr.setTranslation({ ...plakat }, 'pl', { description: 'Polski opis.', name: 'Miękki Nurt' });
  const c = tr.resolveContent(p, 'pl');
  expectEqual(c.description, 'Polski opis.', 'opis');
  expectEqual(c.name, 'Miękki Nurt', 'nazwa');
  expectEqual(c.fallback, false, 'fallback');
});

check('zapis tlumaczenia NIE rusza pol zrodlowych ani innych jezykow', () => {
  const p = tr.setTranslation({ ...plakat, translations: { de: { description: 'Deutsch.' } } }, 'pl', {
    description: 'Polski.',
  });
  expectEqual(p.shopDescription, 'An English description.', 'zrodlo nietkniete');
  expectEqual(p.title, 'Soft Flow', 'tytul nietkniety');
  expectEqual(p.translations.de.description, 'Deutsch.', 'niemiecki nietkniety');
});

check('proba zapisu angielskiego jako tlumaczenia jest odrzucana', () => {
  let threw = false;
  try { tr.setTranslation({ ...plakat }, 'en', { description: 'x' }); } catch (_) { threw = true; }
  expectTrue(threw, 'wyjatek');
});

check('nieznany jezyk cofa sie do zrodla zamiast wysadzac eksport', () => {
  const c = tr.resolveContent(plakat, 'klingon');
  expectEqual(c.language, 'en', 'jezyk');
});

console.log('\nNAZWA OFERTY ALLEGRO:');

check('prefiks i rozmiar naprawiaja zbyt krotkie tytuly', () => {
  // "Soft Flow" to 9 znakow i 2 slowa — samo w sobie lamie wymogi Allegro.
  expectTrue(allegro.validateName('Soft Flow').length > 0, 'goly tytul niepoprawny');
  const n = allegro.buildName({ title: 'Soft Flow', sizeKey: '30x40', prefix: 'Plakat' });
  expectEqual(allegro.validateName(n).length, 0, 'nazwa zbudowana poprawna');
  expectTrue(n.includes('30x40'), 'rozmiar w nazwie');
});

check('nazwa NIE konczy sie jednostka "cm"', () => {
  // AI Allegro brala koncowe "cm" za marke i nadpisywala kolumne BRAND
  // wartoscia "CM". Jednostka nalezy do kolumny SIZE, nie do nazwy.
  for (const size of ['13x18', '21x30', '30x40', '50x70']) {
    const n = allegro.buildName({ title: 'Tańczące lisy w blasku księżyca', sizeKey: size, prefix: 'Plakat' });
    if (/\bcm\.?$/i.test(n)) throw new Error(`nazwa konczy sie jednostka: ${n}`);
  }
});

check('nazwa nie przekracza 75 znakow', () => {
  const n = allegro.buildName({ title: 'A'.repeat(200), sizeKey: '30x40', prefix: 'Plakat' });
  expectTrue(n.length <= 75, 'dlugosc ' + n.length);
});

console.log('\nCENA I OPIS:');

check('cena ma format Allegro: liczba z kropka, bez waluty', () => {
  expectEqual(allegro.formatPrice('26'), '26.00', 'liczba calkowita');
  expectEqual(allegro.formatPrice('26,50'), '26.50', 'przecinek zamieniony na kropke');
  expectEqual(allegro.formatPrice('0'), '', 'zero odrzucone');
  expectEqual(allegro.formatPrice('abc'), '', 'tekst odrzucony');
});

check('osierocony cudzyslow w opisie jest naprawiany', () => {
  const r = allegro.sanitizeDescription('Tytul' + QUOTE + ' reszta opisu.');
  expectEqual(r.repaired, true, 'flaga naprawy');
  expectEqual(r.text.indexOf(QUOTE), -1, 'brak cudzyslowow');
});

check('poprawnie sparowane cudzyslowy zostaja nietkniete', () => {
  const src = 'Opis z ' + QUOTE + 'cytatem' + QUOTE + ' w srodku.';
  const r = allegro.sanitizeDescription(src);
  expectEqual(r.repaired, false, 'brak naprawy');
  expectEqual(r.text, src, 'tekst bez zmian');
});

console.log('\nBUDOWANIE WIERSZY:');

const content = () => ({ name: 'Soft Flow', description: 'Opis.', fallback: false });
const imageUrl = (p) => (p ? 'https://cdn.example/' + String(p).split('/').pop() : '');

check('jeden plakat daje po jednej ofercie na rozmiar', () => {
  const { rows } = allegro.buildRows({
    posters: [plakat],
    settings: { selectedSizes: ['21x30', '30x40'] },
    content,
    imageUrl,
  });
  expectEqual(rows.length, 2, 'liczba ofert');
});

check('mockup wnetrza trafia na drugie zdjecie', () => {
  const { rows } = allegro.buildRows({
    posters: [plakat],
    settings: { selectedSizes: ['30x40'] },
    content,
    imageUrl,
  });
  expectTrue(rows[0].IMAGE2.includes('mockup_interior'), 'IMAGE2 = mockup wnetrza');
});

check('brak ceny pomija rozmiar zamiast wystawiac za darmo', () => {
  const { rows, warnings } = allegro.buildRows({
    posters: [plakat],
    settings: { selectedSizes: ['30x40'], prices: { '30x40': '' } },
    content,
    imageUrl,
  });
  expectEqual(rows.length, 0, 'brak ofert');
  expectTrue(warnings.some((w) => /brak ceny/i.test(w)), 'ostrzezenie o cenie');
});

check('GTIN zostaje pusty — plakaty go nie maja', () => {
  const { rows } = allegro.buildRows({ posters: [plakat], settings: { selectedSizes: ['30x40'] }, content, imageUrl });
  expectEqual(rows[0].GTIN, '', 'GTIN');
});

console.log('\nPLIK CSV:');

check('naglowek ma dokladnie 28 kolumn szablonu Allegro', () => {
  expectEqual(allegro.columns.length, 28, 'liczba kolumn');
  expectEqual(allegro.columns[0], 'GTIN', 'pierwsza kolumna');
  expectEqual(allegro.columns[allegro.columns.length - 1], 'MATERIAL', 'ostatnia kolumna');
});

check('pola z przecinkiem sa cytowane, cudzyslowy podwajane', () => {
  expectEqual(mk.csvEscape('a,b'), QUOTE + 'a,b' + QUOTE, 'przecinek');
  expectEqual(mk.csvEscape('a' + QUOTE + 'b'), QUOTE + 'a' + QUOTE + QUOTE + 'b' + QUOTE, 'cudzyslow');
  expectEqual(mk.csvEscape('zwykly'), 'zwykly', 'bez zmian');
});

check('rejestr zna Allegro i odrzuca nieznane rynki', () => {
  expectTrue(mk.isKnownMarketplace('allegro'), 'allegro');
  expectEqual(mk.isKnownMarketplace('nieistnieje'), false, 'nieznany');
});

console.log(`\n${pass} przeszlo, ${fail} nie przeszlo`);
process.exit(fail === 0 ? 0 : 1);
