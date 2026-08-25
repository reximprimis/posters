/**
 * Weryfikuje GOTOWY plik PDF pod katem wymagan plottera tnacego.
 *
 * Czyta plik z dysku i szuka w nim faktycznych obiektow, zamiast wierzyc
 * generatorowi. Sprawdza kazdy punkt wymagan osobno, bo blad w jednym
 * (np. kolor procesowy zamiast separacji) daje plik, ktory wyglada poprawnie
 * w podgladzie i nie tnie sie na plotterze.
 *
 *   node scripts/sprawdzLinieCiecia.js plik.pdf
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const plik = process.argv[2];
if (!plik) {
  console.error('Podaj sciezke do PDF.');
  process.exit(1);
}
const abs = path.isAbsolute(plik) ? plik : path.join(process.cwd(), plik);
if (!fs.existsSync(abs)) {
  console.error('Brak pliku: ' + abs);
  process.exit(1);
}

const buf = fs.readFileSync(abs);
const surowy = buf.toString('latin1');

/** Rozpakowuje wszystkie strumienie Flate — operatory rysowania sa w srodku. */
function strumienie(bufor) {
  const tekst = bufor.toString('latin1');
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(tekst))) {
    const start = m.index + m[0].length;
    const koniec = tekst.indexOf('endstream', start);
    if (koniec < 0) continue;
    const kawalek = bufor.subarray(start, koniec);
    try {
      out.push(zlib.inflateSync(kawalek).toString('latin1'));
    } catch (_) {
      out.push(kawalek.toString('latin1'));
    }
  }
  return out;
}

const tresc = strumienie(buf).join('\n');

const PT_NA_MM = 72 / 25.4;
const wyniki = [];
const sprawdz = (opis, ok, szczegol) => wyniki.push({ opis, ok, szczegol: szczegol || '' });

// 1. Separacja o nazwie CutContour — nie kolor procesowy.
const maSeparacje = /\/Separation\s*\/CutContour\s*\/DeviceCMYK/.test(surowy);
sprawdz('spot color /Separation /CutContour /DeviceCMYK', maSeparacje);

// 2. Skladowe CMYK zastepcze: C3 M93 Y0 K0 → 0.03 0.93 0 0
const mC1 = surowy.match(/\/C1\s*\[([^\]]+)\]/);
const c1 = mC1 ? mC1[1].trim().split(/\s+/).map(Number) : null;
const cmykOk = c1 && c1.length === 4 &&
  Math.abs(c1[0] - 0.03) < 0.001 && Math.abs(c1[1] - 0.93) < 0.001 &&
  c1[2] === 0 && c1[3] === 0;
sprawdz('CMYK fallback C3 M93 Y0 K0', !!cmykOk, c1 ? c1.join(' / ') : 'brak /C1');

// 3. Warstwa OCG o nazwie cut. Nazwa MUSI byc tekstem (cut), nie obiektem
// Name (/cut) — inaczej czytniki potrafia nie pokazac warstwy w panelu.
const maOcgTyp = /\/Type\s*\/OCG/.test(surowy);
const nazwaTekst = /\/Type\s*\/OCG[\s\S]{0,60}?\/Name\s*\(cut\)/.test(surowy) ||
  /\/Name\s*\(cut\)[\s\S]{0,60}?\/Type\s*\/OCG/.test(surowy);
const nazwaJakoName = /\/Type\s*\/OCG[\s\S]{0,60}?\/Name\s*\/cut/.test(surowy);
sprawdz('warstwa OCG o nazwie "cut"', maOcgTyp && nazwaTekst,
  nazwaJakoName ? 'nazwa zapisana jako obiekt Name (/cut) zamiast tekstu ((cut))' : '');
sprawdz('warstwa zarejestrowana w katalogu (/OCProperties)', /\/OCProperties/.test(surowy));

// 4. Linia narysowana w kontekscie warstwy i separacji.
const maBDC = /\/\w+\s*\/OC\s*BDC/.test(tresc);
sprawdz('rysowanie wewnatrz warstwy (BDC ... EMC)', maBDC && /EMC/.test(tresc));
sprawdz('przestrzen koloru ustawiona (CS) i krycie 100% (1 SCN)', /\/\w+\s+CS/.test(tresc) && /\b1\s+SCN/.test(tresc));

// Blok warstwy ciecia. Wszystkie dalsze pomiary robimy WYLACZNIE w nim:
// w calej tresci strony sa operatory ustawione przez PDFKit dla innych
// elementow (np. grubosc 7 pt), ktore dawaly falszywe alarmy.
const iBDC = tresc.search(/\/\w+\s*\/OC\s*BDC/);
const iEMC = iBDC >= 0 ? tresc.indexOf('EMC', iBDC) : -1;
const blokCiecia = iBDC >= 0 && iEMC > iBDC ? tresc.slice(iBDC, iEMC) : '';

// 5. Prostokat wektorowy: operator re + S. Zadnego f ani B (te wypelniaja).
const mRe = (blokCiecia || tresc).match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+re\s*\n?\s*S\b/);
sprawdz('prostokat wektorowy: "re" + "S" (obrys, bez wypelnienia)', !!mRe);
const zrodloRe = blokCiecia || tresc;
const poRe = zrodloRe.slice(zrodloRe.indexOf(' re'), zrodloRe.indexOf(' re') + 40);
sprawdz('brak wypelnienia (nie ma "f" ani "B" po prostokacie)', !/\b[fB]\b/.test(poRe));

// 6. Grubosc linii 0,1 mm.
const mW = blokCiecia.match(/([\d.]+)\s+w\b/);
const gruboscPt = mW ? Number(mW[1]) : null;
const gruboscMm = gruboscPt != null ? gruboscPt / PT_NA_MM : null;
sprawdz('grubosc linii 0,1 mm', gruboscMm != null && Math.abs(gruboscMm - 0.1) < 0.005,
  gruboscMm != null ? gruboscMm.toFixed(4) + ' mm (' + gruboscPt + ' pt)' : 'brak operatora w');

// 7. Wymiary: strona, prostokat ciecia i ich wzajemne polozenie.
const mBox = surowy.match(/\/MediaBox\s*\[([^\]]+)\]/);
const box = mBox ? mBox[1].trim().split(/\s+/).map(Number) : null;
const stronaMm = box ? [(box[2] - box[0]) / PT_NA_MM, (box[3] - box[1]) / PT_NA_MM] : null;
sprawdz('strona ma wymiar', !!stronaMm, stronaMm ? stronaMm.map((v) => v.toFixed(2)).join(' x ') + ' mm' : '');

let cutMm = null;
if (mRe) {
  cutMm = [Number(mRe[3]) / PT_NA_MM, Number(mRe[4]) / PT_NA_MM];
}
sprawdz('linia ciecia ma wymiar', !!cutMm, cutMm ? cutMm.map((v) => v.toFixed(2)).join(' x ') + ' mm' : '');

if (stronaMm && cutMm) {
  const zapasX = (stronaMm[0] - cutMm[0]) / 2;
  const zapasY = (stronaMm[1] - cutMm[1]) / 2;
  sprawdz('zapas wokol linii ciecia',
    zapasX > 0 && zapasY > 0,
    'poziomo ' + zapasX.toFixed(2) + ' mm, pionowo ' + zapasY.toFixed(2) + ' mm');
}

// 8. Obraz osadzony i NIE zawiera linii — linia jest po nim w tresci strony.
sprawdz('grafika osadzona jako obraz', /\/Subtype\s*\/Image/.test(surowy));

console.log('PLIK: ' + path.basename(abs) + '  (' + Math.round(buf.length / 1024) + ' KB)');
console.log('');
let bledy = 0;
for (const w of wyniki) {
  if (!w.ok) bledy++;
  console.log('  ' + (w.ok ? 'OK   ' : 'BLAD ') + w.opis + (w.szczegol ? '   → ' + w.szczegol : ''));
}
console.log('');
console.log(bledy ? bledy + ' punktow niespelnionych' : 'Wszystkie wymagania spelnione.');
process.exitCode = bledy ? 1 : 0;
