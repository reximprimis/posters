/**
 * Przebudowuje master (packshot) WSZYSTKICH zestawow plakatow i ramek
 * (kind: 'gallery-framed') przez AI (gpt-image-2.5-sunburst) —
 * src/galleryFramedPackshotAI.js. Odwrotnosc scripts/przebudujMasteryLokalnie.js:
 * uzytkownik ocenil lokalny cien jako "wyciete kwadraty" i wybral spojny,
 * "sfotografowany" wyglad AI mimo ze lokalny mial gwarantowany kolor
 * (2026-09-10, po tescie tego samego zestawu obiema metodami).
 *
 * Salon (mockups.interior) NIE jest ruszany.
 * Robi kopie zapasowa starego mastera i thumb przed nadpisaniem.
 *
 *   node scripts/przebudujMasteryAI.js
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

const { buildFramedGridRaw } = require('../src/galleryFramedVisuals');
const { buildFramedMasterAI } = require('../src/galleryFramedPackshotAI');
const { opisRamy } = require('../src/ramkiKatalog');
const { NAZWY_MATERIALU, NAZWY_KOLORU } = require('../src/galleryFramedDescription');

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const zestawy = inv.posters.filter((p) => p.kind === 'gallery-framed');
  console.log('Zestawow do przebudowy: ' + zestawy.length);
  console.log('');

  let ok = 0, bledy = 0;
  for (const gf of zestawy) {
    console.log('=== ' + gf.title + ' (' + gf.frameColor + ') ===');
    try {
      const items = gf.items.map((it) => {
        const p = inv.posters.find((x) => x.title === it.title && x.kind !== 'set' && x.kind !== 'gallery' && x.kind !== 'gallery-framed');
        if (!p) throw new Error('brak posteru w kartotece: ' + it.title);
        const [wcm, hcm] = it.size.split('x').map(Number);
        return { absPath: path.join(ROOT, p.imagePath), widthCm: wcm, heightCm: hcm };
      });

      const masterPath = path.join(ROOT, gf.imagePath);
      const thumbPath = path.join(ROOT, gf.imagePathThumb);
      const backupDir = path.join(path.dirname(masterPath), '_backup_przed_ai25');
      fs.mkdirSync(backupDir, { recursive: true });
      if (fs.existsSync(masterPath)) fs.copyFileSync(masterPath, path.join(backupDir, path.basename(masterPath)));
      if (fs.existsSync(thumbPath)) fs.copyFileSync(thumbPath, path.join(backupDir, path.basename(thumbPath)));

      const raw = await buildFramedGridRaw(items, gf.frameColor);
      const rama = opisRamy(gf.frameColor);
      const opisRamyEn = (NAZWY_KOLORU.en[gf.frameColor] || gf.frameColor) + ' ' + (NAZWY_MATERIALU.en[rama.material] || rama.material) + ' frame';
      await buildFramedMasterAI(raw.buffer, { pieceCount: gf.items.length, opisRamy: opisRamyEn }, masterPath);
      await sharp(masterPath).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumbPath);

      console.log('   OK, kopia w ' + path.relative(ROOT, backupDir));
      ok++;
    } catch (e) {
      console.log('   BLAD: ' + e.message);
      bledy++;
    }
    console.log('');
  }

  const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  for (const gf of swieza.posters.filter((p) => p.kind === 'gallery-framed')) {
    gf.masterRebuiltAI25At = new Date().toISOString();
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');

  console.log('Gotowe: ' + ok + ' OK, ' + bledy + ' bledow.');
})().catch((e) => { console.error('BLAD KRYTYCZNY:', e); process.exit(1); });
