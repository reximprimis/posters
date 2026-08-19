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
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');

const argumenty = process.argv.slice(2);
const zapis = argumenty.includes('--wykonaj');
// Podmiana stylu ratuje plakat, gdy wadliwy jest sam styl w tej kategorii,
// a nie pojedyncze losowanie.
const wymuszonyStyl = (argumenty.find((a) => a.startsWith('--styl=')) || '').slice(7);
const tytuly = argumenty.filter((a) => a !== '--wykonaj' && !a.startsWith('--styl='));

if (!tytuly.length) {
  console.error('Podaj tytuly plakatow do przegenerowania.');
  process.exit(1);
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
    console.log(`[${i + 1}/${plan.length}] ${p.kategoria} / ${p.styl} / ${p.orientacja} — "${p.tytul}"`);
    try {
      const { text: imagePrompt } = await cg.generateImagePrompt(p.tytul, p.kategoria, p.styl, {});
      if (!imagePrompt) throw new Error('pusty prompt');
      await gen.generateOnePoster(p.kategoria, p.tytul, p.styl, imagePrompt, {
        generatePdf: false,
        orientation: p.orientacja,
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
