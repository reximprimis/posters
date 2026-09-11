/**
 * Przebudowuje SALON (mockups.interior) dla wszystkich zatwierdzonych
 * zestawow sciennych (kind: 'gallery') przez src/galleryInteriorAI.js —
 * AI-fotografia zamiast plaskiego sharp-wklejenia w staly plik pokoju.
 *
 * Referencja dla modelu: packshot (mockups.frame, z fallbackiem na
 * imagePathPackshot dla starszych rekordow bez tego pola w mockups).
 * Pokoj: roomCollections[0], przez ten sam slownik SCENY co zestaw+rama.
 * Zapisuje POD TA SAMA SCIEZKA co obecny plik (mockups.interior) — zaden
 * inny skrypt (sync, eksport CSV) nie musi sie zmieniac.
 *
 *   node scripts/przebudujSalonyGalerii.js                        — wszystkie zatwierdzone
 *   node scripts/przebudujSalonyGalerii.js --handle=xyz            — jeden produkt
 *   node scripts/przebudujSalonyGalerii.js --frame=srebrny          — inny kolor ramy
 *
 * --frame: klucz z FRAME_STYLES w src/galleryInteriorAI.js (czarny-mat
 * [domyslny], srebrny, miedziany, zloty, dab, bialy, czarny — te same 7
 * kolorow co realne SKU ramek w sklepie, src/ramkiKatalog.js).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildGalleryInteriorAI } = require('../src/galleryInteriorAI');
const { toPosterHandle } = require('../src/posterTitle');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const MODEL = process.env.SALON_MODEL || 'gpt-image-2.5-sunburst';

const onlyHandle = (process.argv.find((a) => a.startsWith('--handle=')) || '').split('=')[1] || null;
const skipArg = (process.argv.find((a) => a.startsWith('--skip=')) || '').split('=')[1] || '';
const skipSet = new Set(skipArg.split(',').filter(Boolean));
const frameColorSlug = (process.argv.find((a) => a.startsWith('--frame=')) || '').split('=')[1] || undefined;

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
let lista = inv.posters.filter((p) => p.kind === 'gallery' && p.approvedForPrint);
if (onlyHandle) lista = lista.filter((p) => toPosterHandle(p.title) === onlyHandle);
if (skipSet.size) lista = lista.filter((p) => !skipSet.has(toPosterHandle(p.title)));

console.log('Do przebudowy: ' + lista.length + ' zestawow, model: ' + MODEL);

(async () => {
  let ok = 0, blad = 0;
  for (const p of lista) {
    const handle = toPosterHandle(p.title);
    const mk = p.mockups || {};
    const packshotRel = (mk.frame && fs.existsSync(path.join(ROOT, mk.frame))) ? mk.frame
      : (p.imagePathPackshot && fs.existsSync(path.join(ROOT, p.imagePathPackshot))) ? p.imagePathPackshot
      : null;
    if (!packshotRel) { console.log('⚠ ' + handle + ' — brak packshotu, pomijam'); blad += 1; continue; }
    if (!mk.interior) { console.log('⚠ ' + handle + ' — brak mockups.interior (docelowej sciezki), pomijam'); blad += 1; continue; }

    const roomSlug = (p.roomCollections || [])[0] || 'living-room';
    const outAbs = path.join(ROOT, mk.interior);
    const refBuffer = fs.readFileSync(path.join(ROOT, packshotRel));

    process.stdout.write('  ' + handle + ' (' + roomSlug + ', ' + p.pieceCount + ' szt.)... ');
    try {
      await buildGalleryInteriorAI(refBuffer, { pieceCount: p.pieceCount, roomSlug, model: MODEL, frameColorSlug, seed: handle }, outAbs);
      console.log('OK');
      ok += 1;
    } catch (e) {
      console.log('BLAD: ' + e.message);
      blad += 1;
    }
  }
  console.log('');
  console.log('Gotowe: ' + ok + ' OK, ' + blad + ' pominietych/bledow.');
})();
