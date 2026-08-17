/**
 * Wpina gotowe plakaty klubowe do kartoteki jako produkty.
 *
 * DECYZJA O ZATWIERDZENIU: do sklepu idzie tylko plakat herbowy. Zdjecia
 * klubu maja 1152x1536, co na 50x70 daje 56 dpi — trawa zamieni sie w papke.
 * Plaska grafika wektorowa znosi powiekszanie duzo lepiej: miekna krawedzie,
 * ale nie pojawia sie szum. Dlatego herbowy dostaje approvedForPrint = true,
 * a dwa pozostale zostaja w bibliotece jako niezatwierdzone — sa gotowe do
 * kampanii na ekranie, a do druku wroca, gdy klub przysle oryginaly zdjec.
 *
 *   node scripts/wepnijPlakatyKlubowe.js             — proba
 *   node scripts/wepnijPlakatyKlubowe.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { getPosterOutputDir } = require('../src/posterPaths');
const { normalizeOrientation } = require('../src/posterOrientation');
const { nearestColorKey, normalizeRooms } = require('../src/taxonomy');
const { assertHandleGloballyUnique, makeSafeFileBase } = require('../src/posterNameGuard');

const ROOT = path.join(__dirname, '..');
const ZRODLO = path.join(ROOT, 'zestawy_robocze', 'klub_orzel');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const zapis = process.argv.includes('--wykonaj');
const rel = (abs) => path.relative(ROOT, abs).split('\\').join('/');

const DO_WPIECIA = [
  {
    plik: '1_herbowy.png',
    title: 'Herb Klubu na Zielonym',
    artStyle: 'Illustration',
    orientation: 'portrait',
    approved: true,
    opis:
      'Herb Klubu Sportowego Orzeł Mysłakowice na głębokiej zieleni klubowej, w złotej ramce. ' +
      'Plakat na osiemdziesięciolecie klubu założonego 10 października 1946 roku.',
  },
  {
    plik: '2_boisko.png',
    title: 'Nasze Boisko w Mysłakowicach',
    artStyle: 'Photography',
    orientation: 'portrait',
    approved: false,
    opis:
      'Boisko Orła Mysłakowice w jesiennym słońcu, z herbem klubu na zielonym pasie. ' +
      'Zdjęcie prawdziwego obiektu klubowego.',
  },
  {
    plik: '3_karkonosze.png',
    title: 'Karkonosze nad Boiskiem',
    artStyle: 'Photography',
    orientation: 'landscape',
    approved: false,
    opis:
      'Panorama Karkonoszy nad boiskiem Orła Mysłakowice, w układzie poziomym. ' +
      'Zdjęcie prawdziwego obiektu klubowego.',
  },
];

const KATEGORIA = 'club-orzel';
const POKOJE = normalizeRooms(['Do pokoju młodzieżowego', 'Do salonu', 'Do biura', 'Do kawiarni']);

/** Ten sam algorytm co scripts/ustawKolory.js — udzialy kubelkow, nie srednia. */
async function policzKolory(abs) {
  const { data, info } = await sharp(abs).resize(64, 64, { fit: 'fill' }).removeAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const licz = new Map();
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const k = nearestColorKey(data[i], data[i + 1], data[i + 2]);
    licz.set(k, (licz.get(k) || 0) + 1);
    n++;
  }
  const NEUTR = new Set(['white', 'black', 'grey', 'beige']);
  return [...licz.entries()].map(([k, c]) => ({ k, u: c / n })).sort((a, b) => b.u - a.u)
    .filter((x) => x.u >= (NEUTR.has(x.k) ? 0.4 : 0.12)).slice(0, 3).map((x) => x.k);
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const plan = [];

  for (const p of DO_WPIECIA) {
    const zr = path.join(ZRODLO, p.plik);
    if (!fs.existsSync(zr)) { console.error('  x brak pliku: ' + p.plik); continue; }

    try {
      assertHandleGloballyUnique(p.title, inv.posters);
    } catch (e) {
      console.error('  x ' + p.title + ': ' + e.message);
      continue;
    }

    const baza = makeSafeFileBase(p.title);
    // getPosterOutputDir oddaje sciezke BEZWZGLEDNA — doklejenie do niej ROOT
    // dawalo "C:\...\Plakaty\C:\...\Plakaty\posters\...".
    const katalog = getPosterOutputDir(KATEGORIA, p.artStyle, baza);
    const cel = path.join(katalog, baza + '.png');
    const meta = await sharp(zr).metadata();
    const kolory = await policzKolory(zr);

    plan.push({ p, zr, cel, katalog, baza, meta, kolory });
    console.log(
      '  ' + (p.approved ? '[do sklepu] ' : '[biblioteka]') + ' ' + p.title.padEnd(30) +
      meta.width + 'x' + meta.height + '  ' + p.orientation.padEnd(10) + kolory.join(', ')
    );
  }

  console.log('');
  console.log('do wpiecia: ' + plan.length + ',  zatwierdzonych do druku: ' + plan.filter((x) => x.p.approved).length);

  if (!zapis) { console.log('\nTo byla proba. Dodaj --wykonaj.'); return; }

  for (const x of plan) {
    fs.mkdirSync(path.dirname(x.cel), { recursive: true });
    fs.copyFileSync(x.zr, x.cel);
    inv.posters.push({
      id: `${KATEGORIA}_${x.baza}_${uuidv4().slice(0, 8)}`,
      category: KATEGORIA,
      title: x.p.title,
      artStyle: x.p.artStyle,
      orientation: normalizeOrientation(x.p.orientation),
      colors: x.kolory,
      rooms: POKOJE,
      imagePath: rel(x.cel),
      pdfPaths: {},
      prompt: 'Skład ręczny: herb klubu i napisy nakładane programowo, bez generowania.',
      printLayout: 'full',
      matFrame: false,
      shopDescription: x.p.opis,
      createdAt: new Date().toISOString(),
      status: 'ready',
      approvedForPrint: x.p.approved === true,
      shopifyState: 'pending_assets',
      shopifyIssues: [],
    });
  }

  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  console.log('\nZapisane. W kartotece: ' + inv.posters.length + ' rekordow.');
})().catch((e) => { console.error(e); process.exit(1); });
