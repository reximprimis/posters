/**
 * Audyt: czy master zestawu (dyptyk/tryptyk) ma WYPALONY bialy pasek przy
 * linii ciecia, zamiast po prostu spokojnego tla. inspectCutLines() w
 * posterSetSplitter.js mierzy tylko "detal" (energia krawedzi Laplace'a) w
 * pasie przy ciecu — czysta biel ma detal ~0, wiec przechodzi kontrole
 * `ratio <= CUT_DETAIL_LIMIT` trywialnie, mimo ze wizualnie to widoczny,
 * niepożądany pionowy pasek wewnatrz panelu (model czasem bierze frazę
 * promptu "hung...with a gap between them" dosłownie i maluje sam gap W
 * OBRAZ, zamiast zostawic tam po prostu spokojne, ciagle tlo).
 *
 * Wykrywanie: dla kazdej linii ciecia skanuje kolumny w oknie wokol niej i
 * liczy, jaki % WYSOKOSCI kazdej kolumny jest "niemal bialy". Nastepnie
 * szuka NAJDLUZSZEGO CIAGLEGO PASMA kolumn spelniajacych ten warunek —
 * prawdziwy wypalony pasek to solidny blok (dziesiatki pikseli), nie
 * pojedyncze rozproszone jasne punkty (odblask slonca, mgla).
 *
 *   node scripts/audytBialychPaskow.js            — wszystkie zatwierdzone
 *   node scripts/audytBialychPaskow.js --all       — rowniez niezatwierdzone
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { LAYOUTS } = require('../src/posterSetSplitter');
const BY_ID = new Map(LAYOUTS.map((l) => [l.id, l]));

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const includeAll = process.argv.includes('--all');

const WINDOW_RATIO = 0.18; // % szerokosci panelu skanowane po KAZDEJ stronie ciecia
const WHITE_THRESHOLD = 245; // kanal RGB >= to liczy sie jako "niemal bialy"
const COLUMN_WHITE_FRACTION = 0.92; // % wysokosci kolumny ktora musi byc biala
const MIN_STRIP_WIDTH_PX = 20; // najkrotszy ciagly blok kolumn uznawany za "pasek", nie szum

async function columnWhiteFractions(sourceAbsPath, left, width, height) {
  const { data, info } = await sharp(sourceAbsPath)
    .extract({ left, top: 0, width, height })
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const fracs = new Array(info.width).fill(0);
  for (let x = 0; x < info.width; x++) {
    let whiteCount = 0;
    for (let y = 0; y < info.height; y++) {
      const idx = (y * info.width + x) * channels;
      if (data[idx] >= WHITE_THRESHOLD && data[idx + 1] >= WHITE_THRESHOLD && data[idx + 2] >= WHITE_THRESHOLD) {
        whiteCount += 1;
      }
    }
    fracs[x] = whiteCount / info.height;
  }
  return fracs;
}

function longestWhiteRun(fracs) {
  let best = 0, cur = 0, bestStart = -1, curStart = -1;
  for (let x = 0; x < fracs.length; x++) {
    if (fracs[x] >= COLUMN_WHITE_FRACTION) {
      if (cur === 0) curStart = x;
      cur += 1;
      if (cur > best) { best = cur; bestStart = curStart; }
    } else {
      cur = 0;
    }
  }
  return { width: best, start: bestStart };
}

async function auditOne(p) {
  const layout = BY_ID.get(p.layout);
  if (!layout) return null;
  const srcAbs = path.join(ROOT, p.imagePath);
  if (!fs.existsSync(srcAbs)) return { title: p.title, error: 'brak master pliku' };

  const meta = await sharp(srcAbs).metadata();
  const panelW = Math.floor(meta.width / layout.cols);
  const win = Math.max(20, Math.round(panelW * WINDOW_RATIO));

  const findings = [];
  for (let c = 1; c < layout.cols; c++) {
    const cutX = c * panelW;
    const left = Math.max(0, cutX - win);
    const width = Math.min(2 * win, meta.width - left);
    const fracs = await columnWhiteFractions(srcAbs, left, width, meta.height);
    const run = longestWhiteRun(fracs);
    if (run.width >= MIN_STRIP_WIDTH_PX) {
      findings.push({ cutX, stripWidthPx: run.width, stripStartX: left + run.start });
    }
  }
  return findings.length ? { title: p.title, id: p.id, layout: p.layout, imagePath: p.imagePath, findings } : null;
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  let sets = inv.posters.filter((p) => p.kind === 'set');
  if (!includeAll) sets = sets.filter((p) => p.approvedForPrint);

  console.log('Audytuje ' + sets.length + ' zestawow...');
  const bad = [];
  for (const p of sets) {
    process.stdout.write('  ' + p.title + '... ');
    try {
      const result = await auditOne(p);
      if (result) {
        console.log('BIALY PASEK: ' + JSON.stringify(result.findings));
        bad.push(result);
      } else {
        console.log('ok');
      }
    } catch (e) {
      console.log('BLAD: ' + e.message);
    }
  }

  console.log('');
  console.log('Podsumowanie: ' + bad.length + ' / ' + sets.length + ' z bialym paskiem przy ciecu.');
  if (bad.length) {
    fs.writeFileSync(path.join(ROOT, 'audyt_bialych_paskow.json'), JSON.stringify(bad, null, 2) + '\n', 'utf8');
    console.log('Zapisano: audyt_bialych_paskow.json');
  }
})();
