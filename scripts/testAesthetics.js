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

console.log('\nKATEGORIE UZYTKOWNIKA:');

check('kategorie wbudowane nie dostaja bloku CATEGORY FOCUS', () => {
  const b = quiet(() => pr.routePromptBuildResult({ category: 'Botanika', style: 'Minimalism', title: 'Test' }));
  expectEqual(b.imagePrompt.includes('CATEGORY FOCUS'), false, 'blok nie powinien wystapic');
});

check('liczba par wbudowanych jest stala', () => {
  expectEqual(cs.getBuiltInCategoryStylePairs().length, 71, 'pary wbudowane');
});

check('wbudowana kategoria nie jest kategoria uzytkownika', () => {
  expectEqual(cs.isUserCategory('Botanika'), false, 'Botanika');
});

check('nieznana kategoria pozostaje nieznana', () => {
  expectEqual(cs.isKnownCategory('Kompletnie Zmyslona Kategoria'), false, 'zmyslona');
});

console.log(`\n${pass} przeszlo, ${fail} nie przeszlo`);
process.exit(fail === 0 ? 0 : 1);
