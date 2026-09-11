/**
 * Jednorazowa "runda urozmaicenia" katalogu zestawow sciennych: 10 produktow
 * dostaje inny kolor ramy (ta sama zawartosc/cena/opis — czysto prezentacyjne),
 * 2 produkty dostaja uklad SIATKI zamiast hero+kolumna (tez ta sama zawartosc
 * — 4 istniejace elementy, tylko inaczej ulozone jako 2x2).
 *
 * NIE zmienia items/pieceCount/price/description — wylacznie packshot i salon.
 *
 *   node scripts/urozmaicKatalog.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildGalleryPackshot } = require('../src/galleryVisuals');
const { buildGalleryInteriorAI } = require('../src/galleryInteriorAI');
const { toPosterHandle } = require('../src/posterTitle');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const MODEL = 'gpt-image-2.5-sunburst';

// Przyblizone kolory realnych ram (frames/products/<kolor>/front.jpg) do
// lokalnego (sharp) renderu packshotu — plaski prostokat, wiec nie oddaje
// polysku metalu/usloju drewna, ale ma byc SPOJNY z kolorem, ktory salon
// (AI) pokazuje, nie kontrastowac z nim.
const FRAME_HEX = {
  'czarny-mat': '#1a1a1a',
  'srebrny': '#b8bcc0',
  'miedziany': '#b8734f',
  'zloty': '#b6924f',
  'dab': '#c9a876',
  'bialy': '#f0ece2',
  'czarny': '#262220',
};

const PLAN = [
  { handle: 'architectural-sketch-wall-set', frame: 'dab' },
  { handle: 'garden-study-wall-set', frame: 'dab' },
  { handle: 'city-horizons-wall-set', frame: 'dab' },
  { handle: 'quiet-forms-wall-set', frame: 'srebrny' },
  { handle: 'silent-peaks-wall-set', frame: 'srebrny' },
  { handle: 'digital-pulse-wall-set', frame: 'srebrny' },
  { handle: 'evening-pour-wall-set', frame: 'miedziany' },
  { handle: 'botanical-light-wall-set', frame: 'miedziany' },
  { handle: 'sacred-lines-wall-set', frame: 'zloty' },
  { handle: 'stillness-wall-set', frame: 'zloty' },
  { handle: 'cosmic-study-wall-set', frame: 'czarny-mat', layout: 'grid' },
  { handle: 'animal-sketch-wall-set', frame: 'czarny-mat', layout: 'grid' },
];

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

function znajdzObraz(tytul) {
  const p = inv.posters.find((x) => x.title === tytul && x.kind !== 'gallery' && x.kind !== 'set');
  return p ? p.imagePath : null;
}

(async () => {
  let ok = 0, blad = 0;
  for (const plan of PLAN) {
    const p = inv.posters.find((x) => x.kind === 'gallery' && toPosterHandle(x.title) === plan.handle);
    if (!p) { console.log('⚠ ' + plan.handle + ' — nie znaleziono w kartotece'); blad += 1; continue; }

    const cm = (r) => r.split('x').map(Number);
    const items = [];
    let brak = false;
    for (const it of p.items || []) {
      const img = znajdzObraz(it.title);
      if (!img || !fs.existsSync(path.join(ROOT, img))) { brak = true; console.log('  ⚠ brak obrazu dla "' + it.title + '"'); break; }
      const [w, h] = cm(it.size);
      items.push({ absPath: path.join(ROOT, img), widthCm: w, heightCm: h });
    }
    if (brak) { blad += 1; continue; }

    const layout = plan.layout || 'auto';
    const katalog = path.join(ROOT, 'posters', '_galerie', plan.handle);
    const packshotOut = path.join(katalog, plan.handle + '_packshot.jpg');
    const salonOut = path.join(ROOT, p.mockups.interior);
    const roomSlug = (p.roomCollections || [])[0] || 'living-room';

    process.stdout.write(plan.handle + ' (rama: ' + plan.frame + ', uklad: ' + layout + ')... ');
    try {
      await buildGalleryPackshot(items, packshotOut, FRAME_HEX[plan.frame], layout);
      const refBuffer = fs.readFileSync(packshotOut);
      await buildGalleryInteriorAI(
        refBuffer,
        { pieceCount: items.length, roomSlug, model: MODEL, frameColorSlug: plan.frame, seed: plan.handle + '-v2' },
        salonOut
      );
      p.mockups.frame = path.relative(ROOT, packshotOut).split(path.sep).join('/');
      console.log('OK');
      ok += 1;
    } catch (e) {
      console.log('BLAD: ' + e.message);
      blad += 1;
    }
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2) + '\n', 'utf8');
  console.log('');
  console.log('Gotowe: ' + ok + ' OK, ' + blad + ' bledow. Kartoteka zapisana.');
})();
