/**
 * Audyt: czy grafiki uzyte w zestawach sciennych (kind:'gallery') sa
 * NAPRAWDE full-bleed (wydruk do samej krawedzi), czy maja wypalony
 * bialy/jasny margines mimo ze inwentarz mowi printLayout:'full',
 * matFrame:false — metadane moga klamac, jesli generacja AI zignorowala
 * instrukcje "no border, no mat, full bleed".
 *
 * Wykrywanie: dla kazdej z 4 krawedzi porownuje pas TUZ PRZY BRZEGU z
 * pasem TUZ ZA NIM (dalej w glab obrazu). Prawdziwy pelny-spad ma plynne
 * przejscie (tlo kontynuuje sie); sztuczny margines/mata ma OSTRY SKOK
 * jasnosci na granicy dwoch pasow — to jest podpis "tu zaczyna sie
 * grafika, tam byl bialy brzeg".
 *
 *   node scripts/audytFullBleedZestawy.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

const BAND_RATIO = 0.02; // szerokosc kazdego z dwoch badanych pasow, jako % krotszego boku
const WHITE_THRESHOLD = 240; // pas uznany za "jasny brzeg" gdy srednia >= to
const JUMP_THRESHOLD = 22; // roznica sredniej jasnosci miedzy pasami, uznawana za "ostry skok"

async function edgeBands(absPath) {
  const meta = await sharp(absPath).metadata();
  const w = meta.width, h = meta.height;
  const band = Math.max(3, Math.round(Math.min(w, h) * BAND_RATIO));

  async function avgBrightness(left, top, width, height) {
    const { data, info } = await sharp(absPath)
      .extract({ left, top, width, height })
      .flatten({ background: '#ffffff' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / (info.width * info.height);
  }

  const edges = {
    top: { outer: await avgBrightness(0, 0, w, band), inner: await avgBrightness(0, band, w, band) },
    bottom: { outer: await avgBrightness(0, h - band, w, band), inner: await avgBrightness(0, h - band * 2, w, band) },
    left: { outer: await avgBrightness(0, 0, band, h), inner: await avgBrightness(band, 0, band, h) },
    right: { outer: await avgBrightness(w - band, 0, band, h), inner: await avgBrightness(w - band * 2, 0, band, h) },
  };
  return edges;
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const gallery = inv.posters.filter((p) => p.kind === 'gallery' && p.approvedForPrint);

  const seen = new Map();
  for (const g of gallery) {
    for (const it of g.items || []) {
      const poster = inv.posters.find((x) => x.title === it.title && x.kind !== 'gallery' && x.kind !== 'set');
      if (!poster || seen.has(poster.title)) continue;
      seen.set(poster.title, { poster, wallSets: [g.title] });
    }
  }
  // Zbierz wszystkie zestawy, w ktorych wystepuje kazdy plakat (do raportu).
  for (const g of gallery) {
    for (const it of g.items || []) {
      const entry = seen.get(it.title);
      if (entry && !entry.wallSets.includes(g.title)) entry.wallSets.push(g.title);
    }
  }

  console.log('Audytuje ' + seen.size + ' unikalnych plakatow z ' + gallery.length + ' zestawow...');
  const bad = [];
  let i = 0;
  for (const [title, { poster, wallSets }] of seen) {
    i += 1;
    const absPath = path.join(ROOT, poster.imagePath);
    if (!fs.existsSync(absPath)) { console.log('⚠ ' + title + ' — brak pliku'); continue; }
    try {
      const edges = await edgeBands(absPath);
      const flagged = [];
      for (const [side, { outer, inner }] of Object.entries(edges)) {
        const jump = inner - outer; // dodatnie = brzeg jasniejszy niz to co za nim
        if (outer >= WHITE_THRESHOLD && jump >= JUMP_THRESHOLD) {
          flagged.push({ side, outer: Number(outer.toFixed(1)), inner: Number(inner.toFixed(1)), jump: Number(jump.toFixed(1)) });
        }
      }
      if (flagged.length) {
        bad.push({ title, wallSets, flagged });
        console.log('  [' + i + '/' + seen.size + '] ' + title + ' — MARGINES: ' + JSON.stringify(flagged));
      }
    } catch (e) {
      console.log('  [' + i + '/' + seen.size + '] ' + title + ' — BLAD: ' + e.message);
    }
  }

  console.log('');
  console.log('Podsumowanie: ' + bad.length + ' / ' + seen.size + ' plakatow z podejrzanym marginesem.');
  if (bad.length) {
    fs.writeFileSync(path.join(ROOT, 'audyt_full_bleed_zestawy.json'), JSON.stringify(bad, null, 2) + '\n', 'utf8');
    console.log('Zapisano: audyt_full_bleed_zestawy.json');
  }
})();
