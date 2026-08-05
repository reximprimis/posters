/**
 * Naprawa zestawow uszkodzonych przez pipeline zatwierdzania.
 *
 * Zatwierdzenie do druku uruchamialo sciezke pisana dla POJEDYNCZYCH plakatow,
 * zanim zestawy zostaly z niej wykluczone. Skutki:
 *
 *  1. panorama przerobiona na proporcje plakatu 3:2 (tryptyk mial 2:1, dyptyk 4:3),
 *  2. powstal wariant "_ramka" z passe-partout, ktorego zestawy NIE MAJA
 *     (sa wylacznie full bleed),
 *  3. powstaly PDF-y CALEJ PANORAMY, choc do druku ida wylacznie panele,
 *  4. imagePathThumb wskazal miniature panoramy zamiast miniatury zestawu.
 *
 * PANELE SA NIETKNIETE — pipeline czytal tylko imagePath. Dlatego panorame da sie
 * odtworzyc sklejajac panele z powrotem, bez ponownego placenia za generowanie.
 *
 *   node scripts/naprawZestawyPoPipeline.js            — proba
 *   node scripts/naprawZestawyPoPipeline.js --wykonaj  — naprawa
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').replace(/\\/g, '/');
const abs = (p) => path.join(ROOT, norm(p));

/** Pliki, ktorych zestaw miec nie powinien. */
function smieciZestawu(rec) {
  const lista = [];
  if (rec.imagePathFramed) lista.push(rec.imagePathFramed);
  if (rec.imagePathFramedThumb) lista.push(rec.imagePathFramedThumb);
  // Miniatura panoramy — zestaw uzywa wlasnej (_zestaw_thumb).
  if (rec.imagePathThumb && !norm(rec.imagePathThumb).includes('_zestaw_thumb')) {
    lista.push(rec.imagePathThumb);
  }
  Object.values(rec.pdfPaths || {}).forEach((p) => lista.push(p));
  Object.values(rec.pdfPathsFramed || {}).forEach((p) => lista.push(p));
  return lista.filter((p) => fs.existsSync(abs(p)));
}

async function odtworzPanorame(rec) {
  const panele = (rec.panels || []).slice().sort((a, b) => a.index - b.index);
  if (!panele.length) return null;

  const meta = [];
  for (const p of panele) meta.push(await sharp(abs(p.imagePath)).metadata());

  const szer = meta.reduce((a, m) => a + m.width, 0);
  const wys = Math.max(...meta.map((m) => m.height));

  let x = 0;
  const warstwy = [];
  for (let i = 0; i < panele.length; i++) {
    warstwy.push({ input: abs(panele[i].imagePath), left: x, top: 0 });
    x += meta[i].width;
  }

  const buf = await sharp({
    create: { width: szer, height: wys, channels: 3, background: '#ffffff' },
  })
    .composite(warstwy)
    .png()
    .toBuffer();

  return { buf, szer, wys };
}

(async () => {
  const zapis = process.argv.includes('--wykonaj');
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const zestawy = (inv.posters || []).filter((p) => p.kind === 'set');

  let usunieteRazem = 0;

  for (const z of zestawy) {
    console.log('=== ' + z.title + ' ===');

    const przed = await sharp(abs(z.imagePath)).metadata();
    const nowa = await odtworzPanorame(z);
    if (nowa) {
      console.log('  panorama: ' + przed.width + 'x' + przed.height + '  ->  ' + nowa.szer + 'x' + nowa.wys);
      if (zapis) fs.writeFileSync(abs(z.imagePath), nowa.buf);
    }

    const smieci = smieciZestawu(z);
    console.log('  plikow do usuniecia: ' + smieci.length);
    smieci.slice(0, 3).forEach((s) => console.log('     ' + path.basename(s)));
    if (smieci.length > 3) console.log('     ... i ' + (smieci.length - 3) + ' wiecej');
    usunieteRazem += smieci.length;

    if (zapis) {
      for (const s of smieci) {
        try {
          fs.unlinkSync(abs(s));
        } catch (e) {
          console.warn('     nie udalo sie usunac: ' + s);
        }
      }
      // Kartoteka: zestaw nie ma wariantu z ramka ani PDF-ow panoramy.
      delete z.imagePathFramed;
      delete z.imagePathFramedThumb;
      z.pdfPaths = {};
      z.pdfPathsFramed = {};
      const baza = norm(z.imagePath).replace(/\.png$/i, '');
      z.imagePathThumb = baza + '_zestaw_thumb.jpg';
      z.printLayout = 'full';
      z.matFrame = false;
    }
    console.log('');
  }

  console.log('plikow do usuniecia lacznie: ' + usunieteRazem);
  if (!zapis) {
    console.log('');
    console.log('To byla proba. Uruchom z --wykonaj, zeby naprawic.');
    return;
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  console.log('Kartoteka zapisana.');
})().catch((e) => {
  console.error('BLAD:', e.message);
  process.exit(1);
});
