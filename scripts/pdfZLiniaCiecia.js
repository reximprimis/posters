/**
 * PDF z linia ciecia CutContour — wersja probna na JEDNYM plakacie.
 *
 * Osobny skrypt, a nie zmiana w pdfGenerator.js: dopoki wynik nie zostanie
 * sprawdzony na plotterze, sciezka produkcyjna ma zostac nietknieta.
 *
 *   node scripts/pdfZLiniaCiecia.js "Neon Waterfront Night" 50x70
 *   node scripts/pdfZLiniaCiecia.js "Neon Waterfront Night" 50x70 --panel 2
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const config = require('../config');
const { policzGeometrie, rysujLinieCiecia, mmNaPt, NAZWA_SPOTU } = require('../src/pdfCutContour');

const norm = (p) => String(p || '').split('\\').join('/');

const argumenty = process.argv.slice(2);
const tytul = argumenty[0];
const rozmiar = argumenty[1] || '50x70';
const iPanel = argumenty.indexOf('--panel');
const nrPanelu = iPanel >= 0 ? Number(argumenty[iPanel + 1]) || 1 : 1;

if (!tytul) {
  console.error('Podaj tytul plakatu lub zestawu.');
  process.exit(1);
}

/** Rozdzielczosc rastra: 300 dpi na wymiar grafiki z bleedem. */
function pikseleDla(mm) {
  return Math.round((mm / 25.4) * 300);
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const rekord = inv.posters.find((p) => p.title === tytul);
  if (!rekord) {
    console.error('Nie znaleziono w kartotece: ' + tytul);
    process.exit(1);
  }

  // Zestaw drukuje sie PANELAMI — panorama nigdy nie idzie na arkusz.
  let zrodlo = rekord.imagePath;
  if (rekord.kind === 'set') {
    const panel = (rekord.panels || [])[nrPanelu - 1];
    zrodlo = typeof panel === 'string' ? panel : panel && panel.imagePath;
    if (!zrodlo) {
      console.error('Zestaw nie ma panelu nr ' + nrPanelu);
      process.exit(1);
    }
  }

  const abs = path.join(ROOT, norm(zrodlo));
  if (!fs.existsSync(abs)) {
    console.error('Brak pliku: ' + zrodlo);
    process.exit(1);
  }

  const cfg = config.posterSizes[rozmiar];
  if (!cfg) {
    console.error('Nieznany rozmiar: ' + rozmiar + '  (dostepne: ' + Object.keys(config.posterSizes).join(', ') + ')');
    process.exit(1);
  }

  const cutSzerMm = cfg.cm[0] * 10;
  const cutWysMm = cfg.cm[1] * 10;
  const g = policzGeometrie(cutSzerMm, cutWysMm);

  console.log('plakat:  ' + tytul + (rekord.kind === 'set' ? '  (panel ' + nrPanelu + ')' : ''));
  console.log('zrodlo:  ' + zrodlo);
  console.log('');
  const zapas = g.mm.bleedMm / 2;
  console.log('  linia ciecia: ' + g.mm.cut[0] + ' x ' + g.mm.cut[1] + ' mm   (wymiar finalny)');
  console.log('  grafika:      ' + g.mm.grafika[0] + ' x ' + g.mm.grafika[1] + ' mm   (' + zapas + ' mm zapasu z KAZDEJ strony)');
  console.log('  strona PDF:   ' + g.mm.strona[0] + ' x ' + g.mm.strona[1] + ' mm   (+' + g.mm.marginesMm + ' mm marginesu wokol grafiki)');
  console.log('');

  // Raster dokladnie pod obszar grafiki. cover + centre zachowuje proporcje
  // i przycina nadmiar — grafika nie jest znieksztalcana.
  const px = [pikseleDla(g.mm.grafika[0]), pikseleDla(g.mm.grafika[1])];
  console.log('  raster: ' + px[0] + ' x ' + px[1] + ' px  (300 dpi)');
  const bufor = await sharp(abs)
    .resize(px[0], px[1], { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 96, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const nazwa = String(tytul).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') +
    (rekord.kind === 'set' ? '_panel' + nrPanelu : '') + '_' + rozmiar + '_CUT.pdf';
  const wyjscie = path.join(ROOT, '_kopie_kartoteki', nazwa);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [g.pt.stronaSzer, g.pt.stronaWys],
      margin: 0,
      title: tytul,
      author: 'reximprimis.com',
      creator: 'Poster Generator',
    });
    const ws = fs.createWriteStream(wyjscie);
    doc.on('error', reject);
    ws.on('error', reject);
    ws.on('finish', resolve);
    doc.pipe(ws);

    doc.image(bufor, g.pt.grafikaX, g.pt.grafikaY, {
      width: g.pt.grafikaSzer,
      height: g.pt.grafikaWys,
    });

    // Linia PO grafice — jest osobnym obiektem wektorowym, nie czescia obrazu.
    rysujLinieCiecia(doc, {
      x: g.pt.cutX,
      y: g.pt.cutY,
      szer: g.pt.cutSzer,
      wys: g.pt.cutWys,
    });

    doc.end();
  });

  const kb = Math.round(fs.statSync(wyjscie).size / 1024);
  console.log('');
  console.log('zapisane: ' + path.relative(ROOT, wyjscie) + '  (' + kb + ' KB)');
  console.log('spot: ' + NAZWA_SPOTU);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
