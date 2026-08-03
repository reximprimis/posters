/**
 * Testy trzeciej osi taksonomii (estetyka) i kategorii uzytkownika.
 *
 * Najwazniejszy warunek: bez wybranej estetyki prompt musi zostac IDENTYCZNY
 * co do bajta. Estetyka to dodatek, nie przebudowa - inaczej zepsulibysmy
 * 71 dopracowanych par kategoria+styl.
 *
 * Uzycie: npm run test:aesthetics
 */

const path = require('path');
const ae = require(path.join(__dirname, '..', 'src', 'aesthetics'));
const pr = require(path.join(__dirname, '..', 'src', 'promptRouter'));
const cs = require(path.join(__dirname, '..', 'src', 'categoryStyles'));

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

// Wyciszamy logi routera, zeby wynik testow byl czytelny.
const origLog = console.log;
function quiet(fn) {
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = origLog;
  }
}

console.log('KATALOG ESTETYK:');

check('katalog nie jest pusty i ma komplet pol', () => {
  expectTrue(ae.AESTHETICS.length >= 5, 'liczba estetyk');
  for (const a of ae.AESTHETICS) {
    for (const f of ['id', 'label', 'description', 'palette', 'mood', 'texture', 'avoid']) {
      if (!a[f]) throw new Error(`${a.id}: brak pola ${f}`);
    }
  }
});

check('japandi i boho sa w katalogu', () => {
  expectTrue(ae.isKnownAesthetic('japandi'), 'japandi');
  expectTrue(ae.isKnownAesthetic('boho'), 'boho');
});

check('nieznana estetyka jest odrzucana', () => {
  expectEqual(ae.isKnownAesthetic('nieistnieje'), false, 'nieznana');
  expectEqual(ae.isKnownAesthetic(''), false, 'pusta');
});

console.log('\nNIENARUSZALNOSC PROMPTU:');

check('bez estetyki prompt jest identyczny co do bajta', () => {
  const a = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test' }));
  const b = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test', aesthetic: '' }));
  expectEqual(a.imagePrompt, b.imagePrompt, 'prompt');
});

check('nieznana estetyka nie zmienia promptu', () => {
  const a = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test' }));
  const b = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test', aesthetic: 'midjourney' }));
  expectEqual(a.imagePrompt, b.imagePrompt, 'prompt');
});

check('estetyka tylko DOKLEJA, nie przepisuje', () => {
  const a = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test' }));
  const b = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test', aesthetic: 'japandi' }));
  expectTrue(b.imagePrompt.startsWith(a.imagePrompt), 'prompt bazowy zachowany w calosci');
  expectTrue(b.imagePrompt.length > a.imagePrompt.length, 'prompt urosl');
});

check('blok estetyki niesie palete i zakazy', () => {
  const b = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test', aesthetic: 'boho' }));
  expectTrue(b.imagePrompt.includes('AESTHETIC OVERRIDE'), 'naglowek');
  expectTrue(b.imagePrompt.includes('terracotta'), 'paleta boho');
  expectTrue(b.imagePrompt.includes('Avoid:'), 'zakazy');
});

check('estetyka nie rusza zasad bezpiecznego kadru', () => {
  const b = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test', aesthetic: 'japandi' }));
  expectTrue(b.imagePrompt.includes('SAFE PRINT FRAMING'), 'blok safe framing nadal obecny');
  expectTrue(b.imagePrompt.includes('must NOT change the subject'), 'jawne zastrzezenie w bloku');
});

check('kazda estetyka daje niepusty i rozny blok', () => {
  const blocks = ae.AESTHETICS.map((a) => ae.buildAestheticBlock(a.id));
  for (const b of blocks) expectTrue(b.length > 100, 'dlugosc bloku');
  expectEqual(new Set(blocks).size, blocks.length, 'wszystkie bloki rozne');
});

console.log('\nROTACJA (MIESZANIE):');

check('rotacja rozdaje kazda estetyke zanim cokolwiek powtorzy', () => {
  const n = ae.AESTHETICS.length;
  const rot = ae.createAestheticRotation();
  const pierwszaTura = Array.from({ length: n }, () => rot.next());
  expectEqual(new Set(pierwszaTura).size, n, 'unikalnych w pierwszej turze');
});

check('rotacja nie wyczerpuje sie po pelnej turze', () => {
  const n = ae.AESTHETICS.length;
  const rot = ae.createAestheticRotation();
  const dwieTury = Array.from({ length: n * 2 }, () => rot.next());
  expectEqual(dwieTury.filter(Boolean).length, n * 2, 'wszystkie niepuste');
  expectEqual(new Set(dwieTury.slice(n)).size, n, 'druga tura tez pelna');
});

check('rotacja nigdy nie powtarza estetyki pod rzad, takze na styku tur', () => {
  // 200 losowan przez wiele tur — styk tur jest jedynym miejscem, gdzie
  // powtorka moglaby wystapic, wiec test musi obejmowac wiele cykli.
  for (let proba = 0; proba < 40; proba++) {
    const rot = ae.createAestheticRotation();
    let prev = '';
    for (let i = 0; i < 200; i++) {
      const cur = rot.next();
      if (cur === prev) throw new Error(`powtorka pod rzad: ${cur} na pozycji ${i}`);
      prev = cur;
    }
  }
});

check('rotacja zwraca wylacznie znane estetyki', () => {
  const rot = ae.createAestheticRotation();
  for (let i = 0; i < 20; i++) {
    expectTrue(ae.isKnownAesthetic(rot.next()), 'znana estetyka');
  }
});

check('mix bez rotacji nie wysadza sie, tylko oddaje brak estetyki', () => {
  expectEqual(ae.resolveAestheticForPoster('mix', null), '', 'brak rotacji');
});

check('konkretna estetyka omija rotacje', () => {
  const rot = ae.createAestheticRotation();
  expectEqual(ae.resolveAestheticForPoster('boho', rot), 'boho', 'wybor uzytkownika');
});

check('pusta i nieznana wartosc daja brak estetyki', () => {
  const rot = ae.createAestheticRotation();
  expectEqual(ae.resolveAestheticForPoster('', rot), '', 'pusta');
  expectEqual(ae.resolveAestheticForPoster('nieistnieje', rot), '', 'nieznana');
});

console.log('\nKATEGORIE UZYTKOWNIKA:');

check('kategorie wbudowane nie dostaja bloku CATEGORY FOCUS', () => {
  const b = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test' }));
  expectEqual(b.imagePrompt.includes('CATEGORY FOCUS'), false, 'blok nie powinien wystapic');
});

check('liczba par wbudowanych zgadza sie z deklaracja', () => {
  // Walidacja i tak rzuca przy niezgodnosci — tu pilnujemy, ze stala nie
  // rozjechala sie po cichu z rzeczywista zawartoscia CATEGORY_STYLES.
  expectEqual(cs.getBuiltInCategoryStylePairs().length, cs.EXPECTED_ALLOWED_COMBINATIONS, 'pary wbudowane');
});

check('nowe kategorie tematyczne maja dedykowany tryb promptu', () => {
  const pr2 = require(path.join(__dirname, '..', 'src', 'promptRouter'));
  for (const c of ['Japonia', 'Podróże i plakaty vintage', 'Grzyby i las']) {
    const styles = cs.getAllowedStylesForCategory(c);
    expectTrue(styles.length >= 3, `${c}: liczba stylow`);
    for (const s of styles) {
      const kind = pr2.getPromptRouteKind(c, s);
      if (kind === 'core_fallback' || kind === 'style_generic') {
        throw new Error(`${c} + ${s}: trasa ${kind}, oczekiwano dedykowanego trybu`);
      }
    }
  }
});

check('Japonia to TEMAT, a japandi to ESTETYKA — nie mylimy osi', () => {
  expectTrue(cs.isKnownCategory('Japonia'), 'Japonia jako kategoria');
  expectEqual(cs.isKnownCategory('Japandi'), false, 'Japandi nie moze byc kategoria');
  expectTrue(ae.isKnownAesthetic('japandi'), 'japandi jako estetyka');
});

check('wbudowana kategoria nie jest kategoria uzytkownika', () => {
  expectEqual(cs.isUserCategory('Botanika'), false, 'Botanika');
});

check('nieznana kategoria pozostaje nieznana', () => {
  expectEqual(cs.isKnownCategory('Kompletnie Zmyslona Kategoria'), false, 'zmyslona');
});

console.log('\nOCHRONA PRAW AUTORSKICH:');

check('KAZDA dozwolona para ma blok praw dokladnie raz', () => {
  // Sprzedajemy komercyjnie, wiec brak tego bloku to ryzyko prawne, nie usterka
  // estetyczna. Osiem plikow siega po stale restrykcji bezposrednio, wiec latwo
  // o sciezke, ktora go omija — dlatego sprawdzamy wszystkie pary, nie probke.
  const brak = [];
  const zdublowane = [];
  for (const { category, style } of cs.getAllAllowedCategoryStylePairs()) {
    const p = quiet(() => pr.routePromptBuildResult({ category, style, title: 'Test Subject' })).imagePrompt;
    const n = (p.match(/Rights safety/g) || []).length;
    if (n === 0) brak.push(`${category} / ${style}`);
    else if (n > 1) zdublowane.push(`${category} / ${style} (x${n})`);
  }
  if (brak.length) throw new Error(`bez bloku praw: ${brak.slice(0, 5).join(', ')}${brak.length > 5 ? ` (+${brak.length - 5})` : ''}`);
  if (zdublowane.length) throw new Error(`zdublowany blok: ${zdublowane.slice(0, 5).join(', ')}`);
});

check('blok praw zakazuje wizerunku, klubow i postaci', () => {
  const p = quiet(() => pr.routePromptBuildResult({ category: 'Sport i hobby', style: 'Photography', title: 'Cycling Road at Dawn' })).imagePrompt;
  for (const fraza of [
    'likeness of any public figure',
    'national team jerseys',
    'competition trophies',
    'copyrighted characters',
  ]) {
    expectTrue(p.includes(fraza), `fraza "${fraza}"`);
  }
});

check('prompt sportowy nie podsuwa juz tenisa', () => {
  // Wczesniej tekst zawieral "not only tennis" i "tennis racket OR court".
  // Negacja i tak podsuwa temat — 9 z 11 pierwszych plakatow wyszlo tenisowych.
  for (const style of cs.getAllowedStylesForCategory('Sport i hobby')) {
    const p = quiet(() => pr.routePromptBuildResult({ category: 'Sport i hobby', style, title: 'Chess Board Still Life' })).imagePrompt;
    if (/tennis/i.test(p)) throw new Error(`styl ${style}: prompt nadal zawiera slowo "tennis"`);
  }
});

check('tenis nadal MOZLIWY, gdy zada go tytul', () => {
  // Nie wycinamy tenisa z oferty — usuwamy tylko samoczynne ciagoty do niego.
  const { CATEGORY_TITLE_POOLS } = require(path.join(__dirname, '..', 'src', 'categoryTitlePools'));
  const pool = CATEGORY_TITLE_POOLS['Sport i hobby'] || [];
  expectTrue(pool.some((t) => /tennis/i.test(t)), 'tenisowy tytul w puli');
});

console.log(`\n${pass} przeszlo, ${fail} nie przeszlo`);
process.exit(fail === 0 ? 0 : 1);
