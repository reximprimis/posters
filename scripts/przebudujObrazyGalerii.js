/**
 * Przebudowuje packshot i salon ISTNIEJACEGO zestawu sciennego, nie ruszajac
 * jego rekordu (id, approvedForPrint, cena) ani plikow do druku.
 *
 * Do uzycia po zmianie logiki wizualizacji (src/galleryVisuals.js) — inaczej
 * jedyna droga byloby usuniecie i ponowne dodanie produktu, co dla juz
 * zatwierdzonego / zaimportowanego do Shopify handle jest niepotrzebnym
 * ryzykiem (inny import moglby go potraktowac jako nowy produkt).
 *
 *   node scripts/przebudujObrazyGalerii.js "Green Botanical Wall"
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const BS = String.fromCharCode(92);
const norm = (p) => String(p || '').split(BS).join('/');
const abs = (p) => path.join(ROOT, norm(p));

const { toPosterHandle } = require('../src/posterTitle');
const { buildGalleryMaster, buildGalleryPackshot, buildGalleryInterior } = require('../src/galleryVisuals');

const tytul = process.argv[2];
if (!tytul) { console.error('Podaj tytul zestawu.'); process.exit(1); }

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const g = inv.posters.find((p) => p.kind === 'gallery' && p.title === tytul);
if (!g) { console.error('Nie znalazlem zestawu: ' + tytul); process.exit(1); }

const items = (g.items || []).map((it) => {
  const [w, h] = it.size.split('x').map(Number);
  const skladnik = inv.posters.find((p) => p.title === it.title && p.kind !== 'set' && p.kind !== 'gallery');
  if (!skladnik) throw new Error('Skladnik zniknal z kartoteki: ' + it.title);
  return { absPath: abs(skladnik.imagePath), widthCm: w, heightCm: h };
});

const handle = toPosterHandle(g.title);
const katalog = path.join(ROOT, path.dirname(norm(g.imagePath)));

(async () => {
  const master = path.join(katalog, handle + '_master.jpg');
  await buildGalleryMaster(items, master);
  const packshot = path.join(katalog, handle + '_packshot.jpg');
  await buildGalleryPackshot(items, packshot);
  const salon = path.join(katalog, handle + '_salon.jpg');
  await buildGalleryInterior(items, salon);
  const thumb = path.join(katalog, handle + '_thumb.jpg');
  await sharp(master).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumb);

  const rel = (p) => path.relative(ROOT, p).split(BS).join('/');
  const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const cel = swieza.posters.find((p) => p.id === g.id);
  // imagePath = MASTER (bez ramy) — to jest produkt. Packshot i salon zostaja
  // wizualizacjami efektu w mockups, tak jak przy kazdym innym produkcie.
  cel.imagePath = rel(master);
  cel.imagePathThumb = rel(thumb);
  cel.mockups = { frame: rel(packshot), interior: rel(salon), generatedAt: new Date().toISOString() };
  fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');

  console.log('przebudowane: ' + g.title);
  console.log('   master:   ' + rel(master));
  console.log('   packshot: ' + rel(packshot));
  console.log('   salon:    ' + rel(salon));

  // Stare pliki (podglad, poprzedni packshot-jako-imagePath) zostaja na dysku
  // jako nieuzywane — nie kasujemy automatycznie plikow spoza tego, co ten
  // skrypt sam tworzy w tym przebiegu.
})().catch((e) => { console.error(e); process.exit(1); });
