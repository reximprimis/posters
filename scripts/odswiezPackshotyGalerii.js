/**
 * Przebudowuje PACKSHOT (mockups.frame) dla WSZYSTKICH zatwierdzonych
 * zestawow sciennych (kind: 'gallery'), kazdy we WLASNYM kolorze ramy
 * (p.frameColorSlug) — po zmianie w ulozElement (galleryVisuals.js): rama
 * ma teraz gradient + ciemniejszy rabek zamiast plaskiego jednolitego
 * wypelnienia, ktore na jasnych/metalicznych kolorach (zloty, srebrny,
 * bialy) czytalo sie jak nalepiona grafika z Photoshopa, niespojnie z
 * fotorealistycznym salonem AI.
 *
 * Tylko WALL-SET (kind: 'gallery') — dyptyki/tryptyki (kind: 'set') maja
 * osobny kod (posterSetVisuals.js) i nie sa tu ruszane.
 *
 *   node scripts/odswiezPackshotyGalerii.js            — wszystkie zatwierdzone
 *   node scripts/odswiezPackshotyGalerii.js --handle=xyz  — jeden produkt
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildGalleryPackshot } = require('../src/galleryVisuals');
const { toPosterHandle } = require('../src/posterTitle');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const onlyHandle = (process.argv.find((a) => a.startsWith('--handle=')) || '').split('=')[1] || null;

const FRAME_HEX = {
  'czarny-mat': '#1a1a1a',
  'srebrny': '#b8bcc0',
  'miedziany': '#b8734f',
  'zloty': '#b6924f',
  'dab': '#c9a876',
  'bialy': '#f0ece2',
  'czarny': '#262220',
};

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

function znajdzObraz(tytul) {
  const p = inv.posters.find((x) => x.title === tytul && x.kind !== 'gallery' && x.kind !== 'set');
  return p ? p.imagePath : null;
}

let lista = inv.posters.filter((p) => p.kind === 'gallery' && p.approvedForPrint);
if (onlyHandle) lista = lista.filter((p) => toPosterHandle(p.title) === onlyHandle);

console.log('Do odswiezenia packshotu: ' + lista.length + ' zestawow');

(async () => {
  let ok = 0, blad = 0;
  for (const p of lista) {
    const handle = toPosterHandle(p.title);
    const kolor = FRAME_HEX[p.frameColorSlug || 'czarny-mat'] || FRAME_HEX['czarny-mat'];
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

    const mk = p.mockups || {};
    const packshotOut = mk.frame ? path.join(ROOT, mk.frame) : path.join(ROOT, 'posters', '_galerie', handle, handle + '_packshot.jpg');
    process.stdout.write('  ' + handle + ' (' + (p.frameColorSlug || 'czarny-mat') + ')... ');
    try {
      await buildGalleryPackshot(items, packshotOut, kolor);
      console.log('OK');
      ok += 1;
    } catch (e) {
      console.log('BLAD: ' + e.message);
      blad += 1;
    }
  }
  console.log('');
  console.log('Gotowe: ' + ok + ' OK, ' + blad + ' bledow/pominietych.');
})();
