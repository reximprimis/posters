/**
 * Prawdziwe zdjecia ram (nie wektorowe rysunki) do kompozycji packshotow
 * zestawu plakatow i ramek (kind: 'gallery-framed').
 *
 * Kazde zdjecie w frames/assets_frame/ to plaska rama sfotografowana/wygenerowana
 * na wprost, z jasnym (prawie bialym) otworem na wydruk i jasnym tlem dookola.
 * Pliki NIE MAJA kanalu alpha (sprawdzone: PNG colorType 2, bez przezroczystosci)
 * — otwor wycinamy sami z pikseli, nie odczytem alpha.
 *
 * Segmentacja to FLOOD FILL od srodka (otwor) i od brzegow zdjecia (tlo) po
 * jasnych pikselach, nie prosty prog jasnosci na kazdym pikselu z osobna.
 * Powod: biala/jasna rama ma kolor niemal identyczny z tlem (~244-255, ten
 * sam zakres co otwor), wiec prog per-piksel dziurawil samo lico ramy —
 * zostawal tylko cien usoju i najciemniejsze slady slojow drewna. Flood fill
 * dziala inaczej: rama to piksele, do ktorych NIE da sie dojsc z centrum ani
 * z brzegu idac wylacznie po jasnych sasiadach — wiec liczy sie polozenie
 * (zamknietym pierscieniem), nie tylko wlasna jasnosc pixela.
 *
 * Kalibracja skali: nie znamy DPI/rozmiaru fizycznego zdjecia, wiec zakladamy,
 * ze widoczna grubosc lica ramy na zdjeciu odpowiada FRAME_CM (ta sama stala,
 * ktorej dawniej uzywala wersja rysowana wektorowo w galleryFramedVisuals.js)
 * — to jedyny sposob, zeby przeliczyc piksele zdjecia na realne centymetry
 * i poprawnie wstawic oprawiony element do pokoju w prawdziwej skali.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FRAME_CM = 1.3;

const MOCKUP_DIR = path.join(__dirname, '..', 'frames', 'assets_frame');

// Kolor z src/ramkiKatalog.js -> plik zdjecia w frames/assets_frame/.
// Dopisuj tu kolejne kolory w miare jak beda gotowe zdjecia — bez wpisu
// getMockup() rzuci czytelny blad zamiast po cichu uzyc zlego koloru.
const PLIKI = {
  dab: 'oak_wood_frame_mockup.png',
  czarny: 'black_wood_frame_mockup.png',
  bialy: 'white_wood_frame_mockup.png',
  miedziany: 'copper_alu_frame_mockup.png',
};

const cache = new Map();

function jasny(r, g, b) {
  return r > 235 && g > 235 && b > 235 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8;
}

/**
 * Flood fill (BFS, 4-sasiedztwo) po jasnych pikselach zaczynajac od punktow
 * zrodlowych. Zwraca Uint8Array (1 = nalezy do wypelnienia) i bounding box
 * odwiedzonych pikseli.
 */
function floodFillJasne(jasnyMaska, w, h, seeds) {
  const N = w * h;
  const visited = new Uint8Array(N);
  const qx = new Int32Array(N);
  const qy = new Int32Array(N);
  let qh = 0;
  let qt = 0;
  let minX = w, maxX = -1, minY = h, maxY = -1;

  const wrzuc = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const id = y * w + x;
    if (visited[id]) return;
    if (!jasnyMaska[id]) return;
    visited[id] = 1;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    qx[qt] = x; qy[qt] = y; qt++;
  };

  for (const [sx, sy] of seeds) wrzuc(sx, sy);
  while (qh < qt) {
    const x = qx[qh], y = qy[qh]; qh++;
    wrzuc(x + 1, y); wrzuc(x - 1, y); wrzuc(x, y + 1); wrzuc(x, y - 1);
  }
  return { visited, bbox: maxX >= minX ? { minX, maxX, minY, maxY } : null };
}

async function analizujRamke(absPath) {
  const { data, info } = await sharp(absPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const N = w * h;

  const jasnyMaska = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const p = i * ch;
    jasnyMaska[i] = jasny(data[p], data[p + 1], data[p + 2]) ? 1 : 0;
  }

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  if (!jasnyMaska[cy * w + cx]) {
    throw new Error('analizujRamke: srodek zdjecia nie jest jasny (nie znajde otworu na wydruk): ' + absPath);
  }

  // Otwor: wszystko jasne, do czego da sie dojsc z centrum bez przejscia przez rame.
  const otwor = floodFillJasne(jasnyMaska, w, h, [[cx, cy]]);
  if (!otwor.bbox) throw new Error('analizujRamke: nie znalazlem otworu: ' + absPath);

  // Tlo: wszystko jasne, do czego da sie dojsc z brzegow zdjecia.
  const seedyBrzeg = [];
  for (let x = 0; x < w; x += 4) { seedyBrzeg.push([x, 0]); seedyBrzeg.push([x, h - 1]); }
  for (let y = 0; y < h; y += 4) { seedyBrzeg.push([0, y]); seedyBrzeg.push([w - 1, y]); }
  const tlo = floodFillJasne(jasnyMaska, w, h, seedyBrzeg);

  const innerLeft = otwor.bbox.minX;
  const innerTop = otwor.bbox.minY;
  const innerW = otwor.bbox.maxX - otwor.bbox.minX;
  const innerH = otwor.bbox.maxY - otwor.bbox.minY;

  // Grubosc lica: odleglosc od krawedzi otworu do najblizszego piksela
  // nalezacego do tla, mierzona z kazdej z czterech stron i usredniona.
  // Tlo.bbox to najmniejszy prostokat obejmujacy odwiedzone tlo — jego
  // krawedzie sa w przyblizeniu zewnetrzna krawedzia ramy.
  const zewLeft = tlo.bbox ? tlo.bbox.minX : 0;
  const zewRight = tlo.bbox ? tlo.bbox.maxX : w - 1;
  const zewTop = tlo.bbox ? tlo.bbox.minY : 0;
  const zewBottom = tlo.bbox ? tlo.bbox.maxY : h - 1;
  const borderPx = (
    (innerLeft - zewLeft) + (zewRight - (innerLeft + innerW)) +
    (innerTop - zewTop) + (zewBottom - (innerTop + innerH))
  ) / 4;

  // Maska wycinajaca: przezroczyste tam, gdzie flood fill dotarl (otwor LUB
  // tlo) — nieprzezroczyste na ramie, niezaleznie od jej wlasnego koloru.
  const alphaBuf = Buffer.alloc(N);
  for (let i = 0; i < N; i++) {
    alphaBuf[i] = (otwor.visited[i] || tlo.visited[i]) ? 0 : 255;
  }
  const cutoutBuffer = await sharp(absPath)
    .joinChannel(alphaBuf, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();

  return {
    cutoutBuffer,
    width: w,
    height: h,
    innerLeft,
    innerTop,
    innerW,
    innerH,
    pxPerCm: borderPx / FRAME_CM,
  };
}

async function getMockup(kolorRamy) {
  if (cache.has(kolorRamy)) return cache.get(kolorRamy);
  const plik = PLIKI[kolorRamy];
  if (!plik) {
    throw new Error(
      'getMockup: brak prawdziwego zdjecia ramy dla koloru "' + kolorRamy + '" — dopisz je do PLIKI w src/frameMockups.js i wrzuc plik do ' + MOCKUP_DIR
    );
  }
  const absPath = path.join(MOCKUP_DIR, plik);
  if (!fs.existsSync(absPath)) {
    throw new Error('getMockup: plik nie istnieje: ' + absPath);
  }
  const wynik = await analizujRamke(absPath);
  cache.set(kolorRamy, wynik);
  return wynik;
}

module.exports = { FRAME_CM, getMockup };
