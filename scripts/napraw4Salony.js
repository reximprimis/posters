/**
 * Jednorazowa naprawa: 4 zestawy+rama mialy pomieszczenie salonu
 * niedopasowane do tresci (dzieciece ilustracje w przedpokoju/kuchni,
 * brutalistyczna architektura w pokoju dziecka) — zauwazone przez
 * uzytkownika (2026-09-10). Regeneruje TYLKO salon (AI), master zostaje.
 */
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

const { buildFramedGridRaw } = require('../src/galleryFramedVisuals');
const { buildFramedInteriorAI } = require('../src/galleryFramedInteriorAI');
const { opisRamy } = require('../src/ramkiKatalog');
const { NAZWY_MATERIALU, NAZWY_KOLORU } = require('../src/galleryFramedDescription');

const NAPRAWY = {
  'gallery-framed_gentle-tales-grid': 'kids-room',
  'gallery-framed_soft-beginnings-grid': 'kids-room',
  'gallery-framed_woodland-friends-grid': 'kids-room',
  'gallery-framed_modern-lines-grid': 'living-room',
};

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  for (const [id, nowyPokoj] of Object.entries(NAPRAWY)) {
    const gf = inv.posters.find((p) => p.id === id);
    if (!gf) { console.log('BRAK:', id); continue; }
    console.log('=== ' + gf.title + ' -> ' + nowyPokoj + ' ===');
    const items = gf.items.map((it) => {
      const p = inv.posters.find((x) => x.title === it.title && x.kind !== 'set' && x.kind !== 'gallery' && x.kind !== 'gallery-framed');
      const [wcm, hcm] = it.size.split('x').map(Number);
      return { absPath: path.join(ROOT, p.imagePath), widthCm: wcm, heightCm: hcm };
    });
    const raw = await buildFramedGridRaw(items, gf.frameColor);
    const rama = opisRamy(gf.frameColor);
    const opisRamyEn = (NAZWY_KOLORU.en[gf.frameColor] || gf.frameColor) + ' ' + (NAZWY_MATERIALU.en[rama.material] || rama.material) + ' frame';
    const salonPath = path.join(ROOT, gf.mockups.interior);
    await buildFramedInteriorAI(raw.buffer, { pieceCount: gf.items.length, opisRamy: opisRamyEn, roomSlug: nowyPokoj }, salonPath);
    gf.roomCollections = [nowyPokoj];
    gf.mockups.generatedAt = new Date().toISOString();
    fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2) + '\n', 'utf8');
    console.log('   OK');
  }
  console.log('Gotowe.');
})().catch((e) => { console.error('BLAD:', e); process.exit(1); });
