/**
 * Wizualizacje ZESTAWU PLAKATOW I RAMEK (kind: 'gallery-framed') — master
 * i salon. Rama jest CZESCIA PRODUKTU, wiec — inaczej niz w src/galleryVisuals.js
 * (kind: 'gallery') — MASTER pokazuje oprawione elementy. Nie ma osobnego
 * "bez ramy": tego wariantu produkt nie ma.
 *
 * PIERWSZY produkt w tej rodzinie to siatka 2x2 z CZTERECH elementow tego
 * samego rozmiaru (patrz galerie-ramek/*.json) — prostszy uklad niz
 * hero+kolumna w galleryVisuals.js, bo nie ma hierarchii wielkosci do
 * odwzorowania. Kolejne produkty moga miec inny uklad; ta funkcja zaklada
 * SIATKE rownych elementow, nie mieszane rozmiary.
 *
 * Kolor ramy bierzemy z prawdziwego katalogu (src/ramkiKatalog.js) — nie
 * jest to dekoracja, tylko materia, ktora fizycznie jedzie w paczce.
 *
 * Sama rama to PRAWDZIWE zdjecie (src/frameMockups.js), nie rysunek wektorowy —
 * pierwsza wersja rysowala plaski kolorowy prostokat i wygladalo to sztucznie,
 * nie do zaakceptowania jako packshot produktu. Sklad (siatka, cien, wstawienie
 * do pokoju) nadal robi lokalnie sharp — tylko sama "rama" pochodzi teraz ze
 * zdjecia zamiast z SVG.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { FRAME_CM, getMockup } = require('./frameMockups');

const GAP_CM = 2.0;
const MARGIN_CM = 3.5;
const SHADOW_CM = 0.9;

function svgBuffer(svg) {
  return Buffer.from(svg);
}

async function zapisz(buf, outputPath, tloDlaJpeg) {
  await sharp(buf).flatten({ background: tloDlaJpeg }).jpeg({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

/**
 * Wstawia wydruk w otwor prawdziwego zdjecia ramy, skalujac cale zdjecie tak,
 * zeby otwor mial zadany rozmiar w pikselach (innerW x innerH). Zdjecie ma
 * wlasne proporcje otworu, wiec przy niedopasowanym stosunku szerokosc/wysokosc
 * skalujemy po srednioej z obu osi i docinamy tresc "cover" fitem — tak samo
 * robi kazdy generator mockupow, ktoremu podajesz wlasna grafike do gotowej ramki.
 */
async function oprawObraz(absPath, innerW, innerH, kolorRamy) {
  const mock = await getMockup(kolorRamy);
  const skala = ((innerW / mock.innerW) + (innerH / mock.innerH)) / 2;
  const totalW = Math.round(mock.width * skala);
  const totalH = Math.round(mock.height * skala);
  const openLeft = Math.round(mock.innerLeft * skala);
  const openTop = Math.round(mock.innerTop * skala);
  const openW = Math.round(mock.innerW * skala);
  const openH = Math.round(mock.innerH * skala);

  const [art, ramaSkalowana] = await Promise.all([
    sharp(absPath).resize(openW, openH, { fit: 'cover', position: 'centre' }).png().toBuffer(),
    sharp(mock.cutoutBuffer).resize(totalW, totalH).toBuffer(),
  ]);

  const buf = await sharp({ create: { width: totalW, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: art, left: openLeft, top: openTop },
      { input: ramaSkalowana, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  return { buffer: buf, width: totalW, height: totalH };
}

async function cienPod(w, h, padPx) {
  const svg = '<svg width="' + (w + padPx * 2) + '" height="' + (h + padPx * 2) + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feGaussianBlur stdDeviation="' + Math.round(padPx / 2.4) + '"/></filter></defs>' +
    '<rect x="' + padPx + '" y="' + (padPx + Math.round(padPx / 3)) + '" width="' + w + '" height="' + h + '" ' +
    'fill="rgba(0,0,0,0.28)" filter="url(#b)"/></svg>';
  return sharp(svgBuffer(svg)).png().toBuffer();
}

/**
 * Sklada siatke 2 kolumny x N wierszy przy zadanym mnozniku pikseli-na-cm.
 * Wszystkie elementy MUSZA byc tego samego rozmiaru — to zalozenie
 * upraszcza uklad do rownej kraty, bez logiki hero+kolumna.
 */
async function skladajSiatke(items, kolorRamy, pxPerCm, background) {
  const w = items[0].widthCm, h = items[0].heightCm;
  if (items.some((it) => it.widthCm !== w || it.heightCm !== h)) {
    throw new Error('skladajSiatke: wszystkie elementy musza miec ten sam rozmiar');
  }
  const kolumny = items.length >= 4 ? 2 : items.length;
  const wiersze = Math.ceil(items.length / kolumny);

  const gap = Math.round(GAP_CM * pxPerCm);
  const margines = Math.round(MARGIN_CM * pxPerCm);
  const padCien = Math.round(SHADOW_CM * pxPerCm * 3);

  const kafle = [];
  for (const it of items) {
    kafle.push(await oprawObraz(
      it.absPath, Math.round(w * pxPerCm), Math.round(h * pxPerCm), kolorRamy
    ));
  }
  const kw = kafle[0].width, kh = kafle[0].height;

  const rzadW = kolumny * kw + (kolumny - 1) * gap;
  const rzadH = wiersze * kh + (wiersze - 1) * gap;
  const canvasW = rzadW + margines * 2 + padCien * 2;
  const canvasH = rzadH + margines * 2 + padCien * 2;

  const podklad = background === null
    ? await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()
    : await sharp(svgBuffer('<svg width="' + canvasW + '" height="' + canvasH + '" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="' + background + '"/></svg>')).png().toBuffer();

  const layers = [];
  for (let i = 0; i < kafle.length; i++) {
    const kol = i % kolumny, wrs = Math.floor(i / kolumny);
    const x = margines + padCien + kol * (kw + gap);
    const y = margines + padCien + wrs * (kh + gap);
    layers.push({ input: await cienPod(kw, kh, padCien), left: x - padCien, top: y - padCien });
    layers.push({ input: kafle[i].buffer, left: x, top: y });
  }

  const buf = await sharp(podklad).composite(layers).png().toBuffer();
  return { buffer: buf, width: canvasW, height: canvasH };
}

/**
 * Master: siatka oprawionych elementow na czystym tle. TO jest produkt —
 * przyjedzie dokladnie tak oprawiony.
 */
async function buildFramedMaster(items, kolorRamy, outputPath) {
  const wynik = await skladajSiatke(items, kolorRamy, 26, null);
  return zapisz(wynik.buffer, outputPath, '#f4f2ee');
}

/**
 * Salon: siatka wklejona w strefe sciany prawdziwego zdjecia wnetrza —
 * ten sam zasob co pozostale produkty wielo-elementowe.
 */
async function buildFramedInterior(items, kolorRamy, outputPath, opts) {
  opts = opts || {};
  const rooms = require('./setRoomBackgrounds');
  const scene = opts.roomId ? rooms.getRoom(opts.roomId) : rooms.getPrimaryRoom();
  const roomFile = path.join(__dirname, '..', 'assets', 'set_rooms', scene.id + '.png');
  if (!fs.existsSync(roomFile)) throw new Error('Brak assetu pokoju: ' + roomFile);

  const meta = await sharp(roomFile).metadata();
  const zoneWpx = Math.round(scene.zone.w * meta.width);
  const zoneHpx = Math.round(scene.zone.h * meta.height);

  const w = items[0].widthCm, h = items[0].heightCm;
  const kolumny = items.length >= 4 ? 2 : items.length;
  const wiersze = Math.ceil(items.length / kolumny);
  const ukladWcm = kolumny * (w + FRAME_CM * 2) + (kolumny - 1) * GAP_CM;
  const ukladHcm = wiersze * (h + FRAME_CM * 2) + (wiersze - 1) * GAP_CM;
  const calkowiteWcm = ukladWcm + MARGIN_CM * 2 + SHADOW_CM * 6;
  const calkowiteHcm = ukladHcm + MARGIN_CM * 2 + SHADOW_CM * 6;

  const pxPerCm = Math.min(zoneWpx / calkowiteWcm, zoneHpx / calkowiteHcm);
  const wynik = await skladajSiatke(items, kolorRamy, pxPerCm, null);

  const zoneX = Math.round(scene.zone.x * meta.width);
  const zoneY = Math.round(scene.zone.y * meta.height);
  const left = Math.round(zoneX + (zoneWpx - wynik.width) / 2);
  const top = zoneY;

  const base = await sharp(roomFile).png().toBuffer();
  const buf = await sharp(base)
    .composite([{ input: wynik.buffer, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();

  await sharp(buf).jpeg({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

module.exports = { buildFramedMaster, buildFramedInterior };
