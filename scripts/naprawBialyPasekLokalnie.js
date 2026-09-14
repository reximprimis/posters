/**
 * Lokalna (bez AI) naprawa wypalonego bialego paska na linii ciecia dyptyku/
 * tryptyku (kind:'set') — patrz scripts/audytBialychPaskow.js.
 *
 * AI-regeneracja jest tu ryzykowna (koszt, czas, a dla tresci graniczacych
 * z bezpieczenstwem tresci — realne ryzyko odrzucenia przez filtr, jak przy
 * Reclining Line Pair, temat: nagie postacie w line-art). Zamiast tego:
 * wycina sam wykryty bialy pasek z mastera (to potwierdzone puste tlo, nie
 * tresc), skleja obie polowki, dzieli na nowo w nowym srodku, i przebudowuje
 * PDF-y oraz wszystkie 5 wizualizacji z NOWYCH paneli. W pelni deterministyczne.
 *
 *   node scripts/naprawBialyPasekLokalnie.js --tytul "Reclining Line Pair"
 */

'use strict';

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PdfGenerator = require('../src/pdfGenerator');
const {
  buildSetThumbnail,
  buildSetPackshot,
  buildSetInterior,
  buildSetSheets,
  buildSetStack,
} = require('../src/posterSetVisuals');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

function arg(nazwa) {
  const i = process.argv.indexOf(`--${nazwa}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

(async () => {
  const tytul = arg('tytul');
  if (!tytul) throw new Error('Uzycie: --tytul "..."');

  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const idx = inv.posters.findIndex((p) => p.title === tytul && p.kind === 'set');
  if (idx < 0) throw new Error('Nie znaleziono: ' + tytul);
  const record = inv.posters[idx];

  const masterAbs = path.join(ROOT, record.imagePath);
  const outDir = path.dirname(masterAbs);
  const base = path.basename(record.imagePath, path.extname(record.imagePath));

  const meta = await sharp(masterAbs).metadata();
  console.log('Master: ' + meta.width + 'x' + meta.height);

  // Znajdz najdluzszy ciagly pas niemal-bialych kolumn wokol kazdej linii
  // ciecia (ta sama logika co audytBialychPaskow.js), potem go WYTNIJ.
  const layout = record.layout === 'tryptyk' ? { cols: 3 } : { cols: 2 };
  const panelWNominal = Math.floor(meta.width / layout.cols);
  const WHITE_THRESHOLD = 245;
  const COLUMN_WHITE_FRACTION = 0.92;

  async function columnWhiteFractions(left, width) {
    const { data, info } = await sharp(masterAbs)
      .extract({ left, top: 0, width, height: meta.height })
      .flatten({ background: '#ffffff' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const fracs = new Array(info.width).fill(0);
    for (let x = 0; x < info.width; x++) {
      let white = 0;
      for (let y = 0; y < info.height; y++) {
        const i = (y * info.width + x) * info.channels;
        if (data[i] >= WHITE_THRESHOLD && data[i + 1] >= WHITE_THRESHOLD && data[i + 2] >= WHITE_THRESHOLD) white++;
      }
      fracs[x] = white / info.height;
    }
    return fracs;
  }

  function longestRun(fracs) {
    let best = 0, cur = 0, bestStart = -1, curStart = -1;
    for (let x = 0; x < fracs.length; x++) {
      if (fracs[x] >= COLUMN_WHITE_FRACTION) {
        if (cur === 0) curStart = x;
        cur += 1;
        if (cur > best) { best = cur; bestStart = curStart; }
      } else cur = 0;
    }
    return { width: best, start: bestStart };
  }

  const strips = []; // { cutX, start, width } posortowane malejaco wg left, do wycinania od prawej do lewej
  for (let c = 1; c < layout.cols; c++) {
    const cutX = c * panelWNominal;
    const win = Math.round(panelWNominal * 0.18);
    const left = Math.max(0, cutX - win);
    const width = Math.min(2 * win, meta.width - left);
    const fracs = await columnWhiteFractions(left, width);
    const run = longestRun(fracs);
    if (run.width < 20) throw new Error('Brak wykrywalnego bialego paska przy ciecu x=' + cutX + ' — nic do wyciecia.');
    strips.push({ cutX, start: left + run.start, width: run.width });
  }
  console.log('Wykryte paski do wyciecia: ' + JSON.stringify(strips));

  // Wytnij paski OD PRAWEJ DO LEWEJ, zeby wczesniejsze wyciecia nie przesunely
  // wspolrzednych kolejnych.
  strips.sort((a, b) => b.start - a.start);
  let img = sharp(masterAbs);
  let buf = await img.toBuffer();
  for (const s of strips) {
    const m = await sharp(buf).metadata();
    const left = sharp(buf).extract({ left: 0, top: 0, width: s.start, height: m.height });
    const right = sharp(buf).extract({ left: s.start + s.width, top: 0, width: m.width - (s.start + s.width), height: m.height });
    const leftBuf = await left.toBuffer();
    const rightBuf = await right.toBuffer();
    const newW = s.start + (m.width - (s.start + s.width));
    buf = await sharp({ create: { width: newW, height: m.height, channels: 3, background: '#ffffff' } })
      .composite([{ input: leftBuf, left: 0, top: 0 }, { input: rightBuf, left: s.start, top: 0 }])
      .png()
      .toBuffer();
  }

  const finalMeta = await sharp(buf).metadata();
  console.log('Nowy master (bez paskow): ' + finalMeta.width + 'x' + finalMeta.height);
  await sharp(buf).png().toFile(masterAbs);

  // Podziel na nowo, w nowym (rownym) srodku.
  const newPanelW = Math.floor(finalMeta.width / layout.cols);
  const panelPaths = [];
  for (let c = 0; c < layout.cols; c++) {
    const left = c * newPanelW;
    const width = c === layout.cols - 1 ? finalMeta.width - left : newPanelW;
    const panelAbs = path.join(outDir, `${base}_panel${c + 1}.png`);
    await sharp(masterAbs).extract({ left, top: 0, width, height: finalMeta.height }).png().toFile(panelAbs);
    panelPaths.push(panelAbs);
    console.log('  panel' + (c + 1) + ': ' + width + 'x' + finalMeta.height);
  }

  // Przebuduj PDF-y kazdego panelu.
  const pdfGen = new PdfGenerator();
  for (let i = 0; i < record.panels.length; i++) {
    const panel = record.panels[i];
    const panelAbs = panelPaths[i];
    const results = await pdfGen.createMultisizePDF(panelAbs, record.title, outDir, {
      nameInfix: `panel${panel.index}`,
      printLayout: 'full',
      matFrame: false,
    });
    const rel = {};
    for (const [sizeKey, value] of Object.entries(results)) {
      if (typeof value === 'string' && value.startsWith('ERROR')) continue;
      rel[sizeKey] = path.relative(ROOT, value).replace(/\\/g, '/');
    }
    panel.pdfPaths = rel;
    panel.imagePath = path.relative(ROOT, panelAbs).replace(/\\/g, '/');
    const pm = await sharp(panelAbs).metadata();
    panel.width = pm.width;
    panel.height = pm.height;
    console.log('  PDF-y panelu ' + panel.index + ': ' + Object.keys(rel).length);
  }

  // Przebuduj wszystkie 5 wizualizacji z nowych paneli.
  const thumbAbs = path.join(outDir, `${base}_zestaw_thumb.jpg`);
  const packAbs = path.join(outDir, `${base}_mockup_frame.png`);
  const interiorAbs = path.join(outDir, `${base}_mockup_interior.jpg`);
  const interior2Abs = path.join(outDir, `${base}_mockup_interior2.jpg`);
  const sheetsAbs = path.join(outDir, `${base}_arkusze.png`);
  const stackAbs = path.join(outDir, `${base}_kaskada.png`);

  await buildSetThumbnail(panelPaths, thumbAbs);
  await buildSetPackshot(panelPaths, packAbs);
  await buildSetInterior(panelPaths, interiorAbs);
  await buildSetInterior(panelPaths, interior2Abs, { secondary: true, category: record.category });
  await buildSetSheets(panelPaths, sheetsAbs);
  await buildSetStack(panelPaths, stackAbs);

  record.imagePathThumb = path.relative(ROOT, thumbAbs).replace(/\\/g, '/');
  record.mockups = {
    frame: path.relative(ROOT, packAbs).replace(/\\/g, '/'),
    interior: path.relative(ROOT, interiorAbs).replace(/\\/g, '/'),
    interior2: path.relative(ROOT, interior2Abs).replace(/\\/g, '/'),
    sheets: path.relative(ROOT, sheetsAbs).replace(/\\/g, '/'),
    stack: path.relative(ROOT, stackAbs).replace(/\\/g, '/'),
    generatedAt: new Date().toISOString(),
  };

  inv.posters[idx] = record;
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2) + '\n', 'utf8');
  console.log('');
  console.log('GOTOWE. Kartoteka zaktualizowana.');
})().catch((e) => {
  console.error('BLAD:', e.message);
  process.exit(1);
});
