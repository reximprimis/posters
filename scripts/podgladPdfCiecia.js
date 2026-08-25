/**
 * Podglad PDF-a z linia ciecia — skladany z DANYCH WYJETYCH Z PLIKU.
 *
 * To NIE jest render PDF (w systemie nie ma rasteryzatora), tylko rekonstrukcja:
 * obraz pochodzi z osadzonego strumienia, a polozenie strony, grafiki i linii
 * z operatorow tresci. Jesli linia jest w zlym miejscu albo grafika nie siega
 * gdzie trzeba, widac to tutaj tak samo jak w rasteryzatorze.
 *
 * Linia rysowana jest w kolorze zastepczym CMYK (C3 M93) przeliczonym na RGB —
 * dokladnie tak, jak pokaze ja podglad, ktory nie rozumie separacji.
 *
 *   node scripts/podgladPdfCiecia.js plik.pdf
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const sharp = require('sharp');

const PT_NA_MM = 72 / 25.4;

const plik = process.argv[2];
if (!plik) {
  console.error('Podaj sciezke do PDF.');
  process.exit(1);
}
const abs = path.isAbsolute(plik) ? plik : path.join(process.cwd(), plik);
const buf = fs.readFileSync(abs);
const surowy = buf.toString('latin1');

/** Wyciaga pierwszy osadzony obraz JPEG (DCTDecode). */
function wyjmijObraz(bufor, tekst) {
  const i = tekst.search(/\/Subtype\s*\/Image[\s\S]{0,400}?\/DCTDecode/);
  if (i < 0) return null;
  const s = tekst.indexOf('stream', i);
  if (s < 0) return null;
  const start = s + (tekst.slice(s, s + 10).includes('\r\n') ? 8 : 7);
  const koniec = tekst.indexOf('endstream', start);
  return bufor.subarray(start, koniec);
}

/** Tresc strony po rozpakowaniu. */
function trescStrony(bufor, tekst) {
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(tekst))) {
    const s = m.index + m[0].length;
    const e = tekst.indexOf('endstream', s);
    if (e < 0) continue;
    try {
      const t = zlib.inflateSync(bufor.subarray(s, e)).toString('latin1');
      if (t.includes(' re') || t.includes(' Do')) return t;
    } catch (_) { /* strumien obrazu — pomijamy */ }
  }
  return '';
}

(async () => {
  const tresc = trescStrony(buf, surowy);

  const mBox = surowy.match(/\/MediaBox\s*\[([^\]]+)\]/);
  const box = mBox[1].trim().split(/\s+/).map(Number);
  const stronaW = box[2] - box[0];
  const stronaH = box[3] - box[1];

  // Macierz "cm" przed /Do mowi, gdzie i jak duzo miejsca zajmuje grafika.
  const mCm = tresc.match(/([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+cm\s*\n?\s*\/\w+\s+Do/);
  const grafW = mCm ? Math.abs(Number(mCm[1])) : stronaW;
  const grafH = mCm ? Math.abs(Number(mCm[4])) : stronaH;
  const grafX = mCm ? Number(mCm[5]) : 0;
  const grafYdol = mCm ? Number(mCm[6]) - grafH : 0;

  const iBDC = tresc.search(/\/\w+\s*\/OC\s*BDC/);
  const blok = iBDC >= 0 ? tresc.slice(iBDC, tresc.indexOf('EMC', iBDC)) : '';
  const mRe = blok.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+re/);
  const cutX = Number(mRe[1]);
  const cutY = Number(mRe[2]);
  const cutW = Number(mRe[3]);
  const cutH = Number(mRe[4]);

  console.log('strona:  ' + (stronaW / PT_NA_MM).toFixed(1) + ' x ' + (stronaH / PT_NA_MM).toFixed(1) + ' mm');
  console.log('grafika: ' + (grafW / PT_NA_MM).toFixed(1) + ' x ' + (grafH / PT_NA_MM).toFixed(1) +
    ' mm  od (' + (grafX / PT_NA_MM).toFixed(1) + ', ' + (grafYdol / PT_NA_MM).toFixed(1) + ')');
  console.log('ciecie:  ' + (cutW / PT_NA_MM).toFixed(1) + ' x ' + (cutH / PT_NA_MM).toFixed(1) +
    ' mm  od (' + (cutX / PT_NA_MM).toFixed(1) + ', ' + (cutY / PT_NA_MM).toFixed(1) + ')');

  const jpeg = wyjmijObraz(buf, surowy);
  if (!jpeg) { console.error('Nie znalazlem osadzonego obrazu.'); process.exit(1); }

  // Skala podgladu: 1 pt → tyle pikseli.
  const SKALA = 1200 / stronaH;
  const px = (pt) => Math.round(pt * SKALA);

  const obraz = await sharp(jpeg).resize(px(grafW), px(grafH), { fit: 'fill' }).toBuffer();

  // CMYK C3 M93 Y0 K0 → RGB, tak jak pokaze podglad bez obslugi separacji.
  const r = Math.round(255 * (1 - 0.03));
  const g = Math.round(255 * (1 - 0.93));
  const b = 255;
  const kolor = `rgb(${r},${g},${b})`;

  const W = px(stronaW);
  const H = px(stronaH);
  // Uklad PDF liczy od dolu — w obrazie od gory, stad odjecie.
  const cutTop = H - px(cutY + cutH);
  const grafTop = H - px(grafYdol + grafH);

  const ramka = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
       <rect x="${px(cutX)}" y="${cutTop}" width="${px(cutW)}" height="${px(cutH)}"
             fill="none" stroke="${kolor}" stroke-width="2"/>
     </svg>`
  );

  const wynik = abs.replace(/\.pdf$/i, '_podglad.jpg');
  await sharp({ create: { width: W, height: H, channels: 3, background: '#e0e0e0' } })
    .composite([
      { input: obraz, left: px(grafX), top: grafTop },
      { input: ramka, left: 0, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toFile(wynik);

  // Zblizenie lewego gornego rogu ciecia — tam widac zapas grafiki i linie.
  const ZB = 260;
  const rogX = Math.max(0, px(cutX) - 40);
  const rogY = Math.max(0, cutTop - 40);
  const zblizenie = abs.replace(/\.pdf$/i, '_rog.jpg');
  await sharp(wynik)
    .extract({ left: rogX, top: rogY, width: Math.min(ZB, W - rogX), height: Math.min(ZB, H - rogY) })
    .resize(720, 720, { fit: 'fill', kernel: 'nearest' })
    .jpeg({ quality: 92 })
    .toFile(zblizenie);

  console.log('');
  console.log('podglad:   ' + path.basename(wynik));
  console.log('zblizenie: ' + path.basename(zblizenie));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
