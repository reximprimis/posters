/**
 * Przegenerowuje wskazane plakaty od nowa, zachowujac kategorie, styl
 * i orientacje.
 *
 * Uzywane, gdy plakat wyszedl wadliwie w sposob nie do poprawienia
 * (wypalone passe-partout, temat kompletnie obok kategorii). Bierzemy
 * wylacznie NIEZATWIERDZONE: nie maja PDF-ow, mockupow ani pozycji
 * w sklepie, wiec skasowanie rekordu i katalogu niczego nie zrywa.
 *
 *   node scripts/przegenerujPlakaty.js "Tytul A" "Tytul B"
 *   node scripts/przegenerujPlakaty.js --wykonaj "Tytul A" "Tytul B"
 *   node scripts/przegenerujPlakaty.js --wykonaj --estetyka=bauhaus "Tytul A"
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ESTETYKI, estetykaPasujeDoTytulu } = require('../src/categoryAesthetics');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');

const argumenty = process.argv.slice(2);
const zapis = argumenty.includes('--wykonaj');
// Podmiana stylu ratuje plakat, gdy wadliwy jest sam styl w tej kategorii,
// a nie pojedyncze losowanie.
const wymuszonyStyl = (argumenty.find((a) => a.startsWith('--styl=')) || '').slice(7);
// To samo dla estetyki: gdy plakat jest do przegenerowania WLASNIE z jej
// powodu (czarno-biala przy tytule obiecujacym kolor), przeniesienie starej
// odtworzyloby wade.
const wymuszonaEstetyka = (argumenty.find((a) => a.startsWith('--estetyka=')) || '').slice(11);
const tytuly = argumenty.filter((a) => a !== '--wykonaj' && !a.startsWith('--styl=') && !a.startsWith('--estetyka='));

if (!tytuly.length) {
  console.error('Podaj tytuly plakatow do przegenerowania.');
  process.exit(1);
}


/**
 * Estetyka NIE jest polem rekordu — idzie tylko do promptu, wiec przy
 * przegenerowaniu trzeba ja odczytac z promptu starego plakatu. Bez tego
 * skrypt "zachowujacy kategorie, styl i orientacje" po cichu gubil czwarta
 * os i oddawal plakat bez estetyki.
 *
 * Naglowki blokow sa PO POLSKU, wiec mapujemy z powrotem na klucze — ale
 * mapa BUDUJE SIE Z src/aesthetics.js, a nie jest przepisana recznie.
 * Recznie przepisana zdazyla juz zawiesc: po dodaniu estetyki
 * "rycina przyrodnicza" nie znala jej etykiety, wiec przegenerowanie
 * pierwszej rytiny oddalo plakat CALKIEM bez estetyki. Kazda nowa estetyka
 * lapie sie teraz sama.
 */
const { AESTHETICS } = require('../src/aesthetics');
const NAZWY_PL = Object.fromEntries(AESTHETICS.map((a) => [String(a.label).toLowerCase(), a.id]));

function estetykaStarego(rekord) {
  const l = String(rekord.prompt || '').split('\n').find((x) => /AESTHETIC OVERRIDE/i.test(x));
  if (!l) return '';
  const pl = l.replace(/.*AESTHETIC OVERRIDE\s*[—-]\s*/i, '').replace(/:\s*$/, '').trim().toLowerCase();
  const klucz = NAZWY_PL[pl] || '';
  if (!klucz) return '';

  // Jesli stara estetyka klocila sie z tytulem, wlasnie po to przegenerowujemy —
  // biore pierwsza z listy kategorii, ktora nie kloci sie wcale.
  if (estetykaPasujeDoTytulu(rekord.title, klucz)) return klucz;
  const lista = ESTETYKI[rekord.category] || [];
  return lista.find((e) => estetykaPasujeDoTytulu(rekord.title, e)) || '';
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const plan = [];

  for (const tytul of tytuly) {
    const rekord = inv.posters.find((p) => p.title === tytul);
    if (!rekord) {
      console.log('POMINIETE  ' + tytul + ' — brak w kartotece');
      continue;
    }
    if (rekord.approvedForPrint) {
      console.log('POMINIETE  ' + tytul + ' — ZATWIERDZONY, wymaga podmiany w miejscu');
      continue;
    }
    plan.push({
      tytul,
      kategoria: rekord.category,
      styl: wymuszonyStyl || rekord.artStyle,
      estetyka: wymuszonaEstetyka || estetykaStarego(rekord),
      orientacja: rekord.orientation || 'portrait',
      katalog: path.join(ROOT, path.dirname(norm(rekord.imagePath))),
      id: rekord.id,
    });
  }

  console.log('');
  for (const p of plan) {
    console.log('  ' + p.tytul.padEnd(26) + p.kategoria.padEnd(20) + p.styl.padEnd(12) + p.orientacja);
  }
  console.log('');
  console.log('do przegenerowania: ' + plan.length);

  if (!zapis) {
    console.log('');
    console.log('To byla proba. Dodaj --wykonaj, zeby kasowac i generowac.');
    return;
  }

  // Kasujemy i zapisujemy PRZED utworzeniem generatora. Generator wczytuje
  // kartoteke do pamieci przy starcie — gdyby powstal wczesniej, jego zapis
  // przywrocilby skasowane rekordy.
  const doUsuniecia = new Set(plan.map((p) => p.id));
  inv.posters = inv.posters.filter((p) => !doUsuniecia.has(p.id));
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  for (const p of plan) {
    if (fs.existsSync(p.katalog)) fs.rmSync(p.katalog, { recursive: true, force: true });
  }
  console.log('usuniete stare rekordy i katalogi: ' + plan.length);

  const PosterBatchGenerator = require('../src/posterGenerator');
  const ContentGenerator = require('../src/contentGenerator');
  const gen = new PosterBatchGenerator();
  const cg = new ContentGenerator();

  let ok = 0;
  let blad = 0;
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    console.log('');
    console.log(`[${i + 1}/${plan.length}] ${p.kategoria} / ${p.styl} / ${p.estetyka || 'bez estetyki'} / ${p.orientacja} — "${p.tytul}"`);
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
