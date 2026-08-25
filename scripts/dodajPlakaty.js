/**
 * Dokłada pojedyncze plakaty o wskazanych tytulach.
 *
 * Uzupelnia luke miedzy dwoma istniejacymi narzedziami: uzupelnijKategorie.js
 * sam dobiera tytuly z pul, a przegenerujPlakaty.js dziala tylko na tym, co
 * juz jest w kartotece. Tu podajemy konkretne pozycje z reki.
 *
 *   node scripts/dodajPlakaty.js --kategoria vehicles --styl Photography "Tytul A" "Tytul B"
 *   node scripts/dodajPlakaty.js --wykonaj --kategoria vehicles --styl Photography "Tytul A"
 *   node scripts/dodajPlakaty.js --wykonaj --plan plan.json
 *
 * Format --plan: [{"tytul":"...","kategoria":"...","styl":"...","orientacja":"portrait"}]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

const argumenty = process.argv.slice(2);
const zapis = argumenty.includes('--wykonaj');

function flaga(nazwa) {
  const i = argumenty.indexOf('--' + nazwa);
  if (i < 0) return null;
  const v = argumenty[i + 1];
  return v && !v.startsWith('--') ? v : null;
}

const planZPliku = flaga('plan');
let plan;

if (planZPliku) {
  plan = JSON.parse(fs.readFileSync(path.resolve(ROOT, planZPliku), 'utf8'));
} else {
  const kategoria = flaga('kategoria');
  const styl = flaga('styl');
  const orientacja = flaga('orientacja') || 'portrait';
  if (!kategoria || !styl) {
    console.error('Podaj --kategoria i --styl (albo --plan plik.json).');
    process.exit(1);
  }
  const uzyte = new Set(['--wykonaj', '--kategoria', kategoria, '--styl', styl, '--orientacja', orientacja, '--plan']);
  const tytuly = argumenty.filter((a) => !uzyte.has(a) && !a.startsWith('--'));
  if (!tytuly.length) {
    console.error('Podaj co najmniej jeden tytul.');
    process.exit(1);
  }
  plan = tytuly.map((tytul) => ({ tytul, kategoria, styl, orientacja }));
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const zajete = new Set(inv.posters.map((p) => String(p.title).trim().toLowerCase()));

  // Handle liczy sie z samego tytulu, wiec kolizja nadpisalaby istniejacy
  // produkt w sklepie.
  const kolizje = plan.filter((p) => zajete.has(String(p.tytul).trim().toLowerCase()));
  if (kolizje.length) {
    console.log('KOLIZJE TYTULOW z kartoteka:');
    kolizje.forEach((p) => console.log('   ' + p.tytul));
    process.exit(1);
  }

  // Niedozwolona para kategoria+styl przerwalaby przebieg dopiero przy swojej
  // pozycji, po oplaconych wywolaniach wczesniejszych.
  const { CATEGORY_STYLES } = require('../src/categoryStyles');
  const zle = plan.filter((p) => !(CATEGORY_STYLES[p.kategoria] || []).includes(p.styl));
  if (zle.length) {
    console.log('NIEDOZWOLONE PARY kategoria+styl:');
    zle.forEach((p) => console.log('   ' + p.tytul + ': ' + p.kategoria + ' + ' + p.styl +
      '   (dozwolone: ' + (CATEGORY_STYLES[p.kategoria] || []).join(', ') + ')'));
    process.exit(1);
  }

  // Plakat udajacy KONKRETNY istniejacy obiekt to produkt wprowadzajacy
  // w blad: model nie zna lokalnych zabytkow i zamiast odmowic — wymysla je.
  // "Lomnica Palace" wyszedl jako ogromny barok z ogrodem francuskim, podczas
  // gdy prawdziwy palac to skromny zolty dwor. Domyslnie blokujemy; swiadome
  // uzycie wymaga flagi --obiekt-rzeczywisty.
  const { znajdzRyzykowne } = require('../src/realneObiekty');
  const ryzykowne = znajdzRyzykowne(plan.map((p) => p.tytul));
  if (ryzykowne.length && !argumenty.includes('--obiekt-rzeczywisty')) {
    console.log('');
    console.log('ZABLOKOWANE — tytuly obiecuja KONKRETNY istniejacy obiekt:');
    for (const r of ryzykowne) {
      console.log('   ' + r.tytul.padEnd(32) + r.powod);
    }
    console.log('');
    console.log('Model nie zna lokalnych zabytkow i zamiast odmowic — WYMYSLA je.');
    console.log('Klient z regionu rozpozna falsz, a produkt pod nazwa istniejacego');
    console.log('miejsca wprowadza w blad.');
    console.log('');
    console.log('Co zrobic:');
    console.log('  - opisac TYP budowli zamiast adresu ("Stave Church", "Tyrolean House"),');
    console.log('  - albo uzyc wlasnego zdjecia obiektu,');
    console.log('  - albo, jesli model ten obiekt naprawde zna i wynik zostal SPRAWDZONY,');
    console.log('    powtorzyc z flaga --obiekt-rzeczywisty.');
    process.exit(1);
  }

  console.log('');
  plan.forEach((p) => console.log('  ' + String(p.tytul).padEnd(32) + String(p.kategoria).padEnd(16) +
    String(p.styl).padEnd(13) + p.orientacja));
  console.log('');
  console.log('do wygenerowania: ' + plan.length);

  if (!zapis) {
    console.log('');
    console.log('To byl plan. Dodaj --wykonaj, zeby generowac.');
    return;
  }

  const PosterBatchGenerator = require('../src/posterGenerator');
  const ContentGenerator = require('../src/contentGenerator');
  const gen = new PosterBatchGenerator();
  const cg = new ContentGenerator();

  let ok = 0;
  let blad = 0;
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    console.log('');
    console.log(`[${i + 1}/${plan.length}] ${p.kategoria} / ${p.styl} / ${p.orientacja} — "${p.tytul}"`);
    try {
      const { text: imagePrompt } = await cg.generateImagePrompt(p.tytul, p.kategoria, p.styl, {
        aesthetic: p.estetyka || undefined,
      });
      if (!imagePrompt) throw new Error('pusty prompt');
      await gen.generateOnePoster(p.kategoria, p.tytul, p.styl, imagePrompt, {
        generatePdf: false,
        orientation: p.orientacja,
        aesthetic: p.estetyka || undefined,
      });
      ok++;
      console.log('   OK');
    } catch (e) {
      blad++;
      console.error('   BLAD ' + e.message);
    }
    gen.reloadDatabase();
  }

  console.log('');
  console.log('gotowe: ' + ok + ',  bledow: ' + blad);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
