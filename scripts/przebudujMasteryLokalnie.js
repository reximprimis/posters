/**
 * Przebudowuje master (packshot) WSZYSTKICH zestawow plakatow i ramek
 * (kind: 'gallery-framed') lokalnym, bez-AI mechanizmem (src/galleryFramedMasterLocal.js)
 * zamiast GPT Image 2 — patrz naglowek tamtego pliku po uzasadnienie.
 *
 * Salon (mockups.interior) NIE jest ruszany — zostaje wersja z AI.
 *
 * Robi kopie zapasowa starego mastera i thumb przed nadpisaniem.
 *
 *   node scripts/przebudujMasteryLokalnie.js
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

const { buildFramedGridRaw } = require('../src/galleryFramedVisuals');
const { buildFramedMasterLocal } = require('../src/galleryFramedMasterLocal');

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const zestawy = inv.posters.filter((p) => p.kind === 'gallery-framed');
  console.log('Zestawow do przebudowy: ' + zestawy.length);
  console.log('');

  for (const gf of zestawy) {
    console.log('=== ' + gf.title + ' (' + gf.frameColor + ') ===');
    const items = gf.items.map((it) => {
      const p = inv.posters.find((x) => x.title === it.title && x.kind !== 'set' && x.kind !== 'gallery' && x.kind !== 'gallery-framed');
      if (!p) throw new Error('brak posteru w kartotece: ' + it.title);
      const [wcm, hcm] = it.size.split('x').map(Number);
      return { absPath: path.join(ROOT, p.imagePath), widthCm: wcm, heightCm: hcm };
    });

    const masterPath = path.join(ROOT, gf.imagePath);
    const thumbPath = path.join(ROOT, gf.imagePathThumb);
    const backupDir = path.join(path.dirname(masterPath), '_backup_przed_local_shadow');
    fs.mkdirSync(backupDir, { recursive: true });
    if (fs.existsSync(masterPath)) fs.copyFileSync(masterPath, path.join(backupDir, path.basename(masterPath)));
    if (fs.existsSync(thumbPath)) fs.copyFileSync(thumbPath, path.join(backupDir, path.basename(thumbPath)));

    const raw = await buildFramedGridRaw(items, gf.frameColor);
    await buildFramedMasterLocal(raw.buffer, { width: raw.width, height: raw.height }, masterPath);
    await sharp(masterPath).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumbPath);

    console.log('   master i thumb przebudowane, kopia w ' + path.relative(ROOT, backupDir));
    console.log('');
  }

  const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  for (const gf of swieza.posters.filter((p) => p.kind === 'gallery-framed')) {
    gf.masterRebuiltLocalAt = new Date().toISOString();
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');

  console.log('Gotowe: ' + zestawy.length + ' masterow przebudowanych lokalnym cieniem, kartoteka zaktualizowana.');
})().catch((e) => { console.error('BLAD:', e.message); process.exit(1); });
