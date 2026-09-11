/**
 * Przebudowuje PACKSHOT (mockups.frame) dla zestawow sciennych (kind: 'gallery')
 * ktore maja go w BLEDNYM stylu: jedna wspolna rama wokol wszystkich elementow
 * (stary ad-hoc AI mockup, mockupGenerator.js uzyty na mastrze zestawu zamiast
 * per-produktowego buildGalleryPackshot). Docelowy styl to KAZDY element w
 * WLASNEJ ramce, z realnymi odstepami — dokladnie to, co buildGalleryPackshot
 * (src/galleryVisuals.js) juz robi lokalnie, deterministycznie, bez AI.
 *
 * Referencja "zly styl" rozpoznawana po nazwie pliku: Tytul_Z_Podkreslnikami_
 * mockup_frame.jpg (z mockupGenerator.js) zamiast <handle>_packshot.jpg
 * (z buildGalleryPackshot). Zapisuje NOWY plik <handle>_packshot.jpg i
 * podmienia mockups.frame w kartotece na ta sciezke — stary Title_Case plik
 * zostaje na dysku nieuzywany (mozna posprzatac pozniej).
 *
 *   node scripts/przebudujPackshotyGalerii.js              — wszystkie ze zlym stylem
 *   node scripts/przebudujPackshotyGalerii.js --handle=xyz  — jeden produkt (wymusza przebudowe)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildGalleryPackshot, buildGalleryMaster } = require('../src/galleryVisuals');
const { toPosterHandle } = require('../src/posterTitle');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const onlyHandle = (process.argv.find((a) => a.startsWith('--handle=')) || '').split('=')[1] || null;

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const wszystkiePlakaty = inv.posters;

function znajdzObraz(tytul) {
  const p = wszystkiePlakaty.find((x) => x.title === tytul && x.kind !== 'gallery' && x.kind !== 'set');
  return p ? p.imagePath : null;
}

let lista = inv.posters.filter((p) => p.kind === 'gallery' && p.approvedForPrint);
if (onlyHandle) {
  lista = lista.filter((p) => toPosterHandle(p.title) === onlyHandle);
} else {
  // Zly styl = mockups.frame NIE konczy sie na "_packshot.jpg" (czyli nie
  // pochodzi juz z buildGalleryPackshot).
  lista = lista.filter((p) => {
    const f = p.mockups && p.mockups.frame;
    return !f || !f.endsWith('_packshot.jpg');
  });
}

console.log('Do przebudowy packshotu: ' + lista.length + ' zestawow');

(async () => {
  let ok = 0, blad = 0;
  for (const p of lista) {
    const handle = toPosterHandle(p.title);
    const cm = (r) => r.split('x').map(Number);
    const items = [];
    let brak = false;
    for (const it of p.items || []) {
      const img = znajdzObraz(it.title);
      if (!img || !fs.existsSync(path.join(ROOT, img))) { brak = true; console.log('  ⚠ ' + handle + ' — brak obrazu dla "' + it.title + '"'); break; }
      const wym = cm(it.size);
      items.push({ absPath: path.join(ROOT, img), widthCm: wym[0], heightCm: wym[1] });
    }
    if (brak || !items.length) { blad += 1; continue; }

    const katalog = path.join(ROOT, 'posters', '_galerie', handle);
    const packshotOut = path.join(katalog, handle + '_packshot.jpg');
    process.stdout.write('  ' + handle + '... ');
    try {
      await buildGalleryPackshot(items, packshotOut);
      const rel = path.relative(ROOT, packshotOut).split(require('path').sep).join('/');
      p.mockups = p.mockups || {};
      p.mockups.frame = rel;
      console.log('OK');
      ok += 1;
    } catch (e) {
      console.log('BLAD: ' + e.message);
      blad += 1;
    }
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2) + '\n', 'utf8');
  console.log('');
  console.log('Gotowe: ' + ok + ' OK, ' + blad + ' bledow/pominietych. Kartoteka zapisana.');
})();
