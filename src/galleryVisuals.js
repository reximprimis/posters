/**
 * Wizualizacje ZESTAWOW SCIENNYCH (kind: 'gallery') — master, packshot, salon.
 *
 * Rozni sie od posterSetVisuals.js (dyptyk/tryptyk) w jednej istotnej rzeczy:
 * tam panele sa ROWNE, bo pochodza z jednej pocietej panoramy. Tu skladniki
 * sa NIEZALEZNYMI plakatami w ROZNYCH rozmiarach — 50x70 obok 21x30 musi
 * wygladac na scianie tak, jak faktycznie wisi, a nie jak dwa rowne kafle.
 *
 * Dlatego skalujemy po CENTYMETRACH, nie po pikselach zrodel: kazdy element
 * dostaje wspolny mnoznik pikseli-na-centymetr, wiec proporcje miedzy
 * elementami sa fizycznie prawdziwe.
 *
 * TRZY OBRAZY, NIE DWA — i to jest wazne, nie kosmetyka:
 *
 *   MASTER   — same wydruki, BEZ ramy. To jest produkt: klient kupuje
 *              papier, rame dobiera osobno w sklepie, dokladnie jak przy
 *              kazdym pojedynczym plakacie w katalogu. Zdjecie z czarna
 *              rama jako GLOWNE zdjecie sugerowaloby, ze rama jest w cenie —
 *              nieprawda o produkcie.
 *   PACKSHOT — te same wydruki oprawione, na czystym tle. Wizualizacja
 *              efektu, nie zawartosc paczki — ten sam zabieg co przy kazdym
 *              plakacie w katalogu, ktory tez ma zdjecie w ramie i tez jest
 *              sprzedawany bez niej.
 *   SALON    — packshot wklejony w prawdziwe zdjecie wnetrza.
 *
 * Uklad we wszystkich trzech: NAJWIEKSZY element (po wysokosci w cm) po
 * lewej, reszta w kolumnie po prawej, od gory do dolu w kolejnosci z definicji.
 *
 * Skladane lokalnie przez sharp, bez modelu — deterministyczne i darmowe.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FRAME_COLOR = '#1a1a1a';
const FRAME_CM = 1.1;
const GAP_HERO_CM = 2.2;
const GAP_STACK_CM = 1.6;
const MARGIN_CM = 3.5;
// Cien pod arkuszem BEZ ramy — wezszy niz cien pod rama, bo sugeruje lezacy
// papier, a nie uniesiona, cięzka oprawe. Ten sam zabieg co "arkusze"
// (buildSetSheets) przy dyptyku/tryptyku w posterSetVisuals.js.
const SHADOW_BARE_CM = 0.8;

function svgBuffer(svg) {
  return Buffer.from(svg);
}

async function zapisz(buf, outputPath, tloDlaJpeg) {
  await sharp(buf).flatten({ background: tloDlaJpeg }).jpeg({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

/**
 * Uklada jeden element w podanych wymiarach. Z rama (ramuj=true) dostaje
 * czarna oprawe o grubosci frameJednostka; bez ramy zwraca sama grafike
 * w jej docelowym rozmiarze — nic wiecej.
 */
async function ulozElement(absPath, innerW, innerH, frameJednostka, ramuj) {
  const art = await sharp(absPath).resize(innerW, innerH, { fit: 'cover', position: 'centre' }).png().toBuffer();
  if (!ramuj) return { buffer: art, width: innerW, height: innerH };

  const totalW = innerW + frameJednostka * 2;
  const totalH = innerH + frameJednostka * 2;
  const svg = '<svg width="' + totalW + '" height="' + totalH + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="100%" height="100%" fill="' + FRAME_COLOR + '"/></svg>';
  const buf = await sharp(svgBuffer(svg))
    .composite([{ input: art, left: frameJednostka, top: frameJednostka }])
    .png()
    .toBuffer();
  return { buffer: buf, width: totalW, height: totalH };
}

async function cienPod(w, h, padPx, sila) {
  const alpha = sila == null ? 0.28 : sila;
  const svg = '<svg width="' + (w + padPx * 2) + '" height="' + (h + padPx * 2) + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feGaussianBlur stdDeviation="' + Math.round(padPx / 2.4) + '"/></filter></defs>' +
    '<rect x="' + padPx + '" y="' + (padPx + Math.round(padPx / 3)) + '" width="' + w + '" height="' + h + '" ' +
    'fill="rgba(0,0,0,' + alpha + ')" filter="url(#b)"/></svg>';
  return sharp(svgBuffer(svg)).png().toBuffer();
}

/**
 * Sklada uklad hero+kolumna przy zadanym mnozniku pikseli-na-centymetr.
 * @param {Array<{absPath:string, widthCm:number, heightCm:number}>} items
 * @param {number} pxPerCm
 * @param {string|null} background kolor tla albo null dla przezroczystego
 * @param {boolean} [ramuj] domyslnie true — false daje gole arkusze (MASTER)
 * @returns {Promise<{buffer:Buffer, width:number, height:number}>}
 */
async function skladajUklad(items, pxPerCm, background, ramuj) {
  const oprawiony = ramuj !== false;
  const hero = items.reduce((a, b) => (b.heightCm > a.heightCm ? b : a));
  const reszta = items.filter((it) => it !== hero);
  const frameJednostka = oprawiony ? Math.round(FRAME_CM * pxPerCm) : 0;
  const gapHero = Math.round(GAP_HERO_CM * pxPerCm);
  const gapStack = Math.round(GAP_STACK_CM * pxPerCm);
  const margines = Math.round(MARGIN_CM * pxPerCm);
  const padCien = oprawiony ? Math.round(frameJednostka * 2.2) : Math.round(SHADOW_BARE_CM * pxPerCm);
  const silaCienia = oprawiony ? 0.28 : 0.16;

  const heroFrame = await ulozElement(
    hero.absPath, Math.round(hero.widthCm * pxPerCm), Math.round(hero.heightCm * pxPerCm), frameJednostka, oprawiony
  );
  const kolumna = [];
  for (const it of reszta) {
    kolumna.push(await ulozElement(
      it.absPath, Math.round(it.widthCm * pxPerCm), Math.round(it.heightCm * pxPerCm), frameJednostka, oprawiony
    ));
  }

  const kolumnaW = kolumna.length ? Math.max.apply(null, kolumna.map((k) => k.width)) : 0;
  const kolumnaH = kolumna.reduce((s, k) => s + k.height, 0) + gapStack * Math.max(0, kolumna.length - 1);

  const rzadW = heroFrame.width + (kolumna.length ? gapHero + kolumnaW : 0);
  const rzadH = Math.max(heroFrame.height, kolumnaH);

  const canvasW = rzadW + margines * 2 + padCien * 2;
  const canvasH = rzadH + margines * 2 + padCien * 2;

  const podklad = background === null
    ? await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()
    : await sharp(svgBuffer('<svg width="' + canvasW + '" height="' + canvasH + '" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="' + background + '"/></svg>')).png().toBuffer();

  const layers = [];
  const heroX = margines + padCien;
  const heroY = margines + padCien + Math.round((rzadH - heroFrame.height) / 2);
  layers.push({ input: await cienPod(heroFrame.width, heroFrame.height, padCien, silaCienia), left: heroX - padCien, top: heroY - padCien });
  layers.push({ input: heroFrame.buffer, left: heroX, top: heroY });

  let y = margines + padCien + Math.round((rzadH - kolumnaH) / 2);
  const kolX = heroX + heroFrame.width + gapHero;
  for (const k of kolumna) {
    layers.push({ input: await cienPod(k.width, k.height, padCien, silaCienia), left: kolX - padCien, top: y - padCien });
    layers.push({ input: k.buffer, left: kolX, top: y });
    y += k.height + gapStack;
  }

  const buf = await sharp(podklad).composite(layers).png().toBuffer();
  return { buffer: buf, width: canvasW, height: canvasH };
}

/**
 * Master: same wydruki, BEZ ramy, na czystym tle. To jest GLOWNE zdjecie
 * produktu — pokazuje dokladnie to, co przyjedzie w paczce.
 */
async function buildGalleryMaster(items, outputPath) {
  const wynik = await skladajUklad(items, 26, null, false);
  return zapisz(wynik.buffer, outputPath, '#f4f2ee');
}

/**
 * Packshot: oprawione elementy na czystym, neutralnym tle. Wizualizacja
 * efektu w ramie — nie zawartosc paczki, patrz komentarz na gorze pliku.
 */
async function buildGalleryPackshot(items, outputPath) {
  const wynik = await skladajUklad(items, 26, null, true);
  return zapisz(wynik.buffer, outputPath, '#f4f2ee');
}

/**
 * Salon: kompozycja wklejona w strefe sciany prawdziwego zdjecia wnetrza.
 * Tlo pochodzi z assets/set_rooms/ — ten sam zasob, ktory uzywaja dyptyki
 * i tryptyki, wiec zestaw scienny wisi w tym samym, sprawdzonym pokoju.
 * Pokazuje oprawiony wariant — tak jak "efekt na scianie" przy kazdym
 * innym produkcie w katalogu.
 *
 * Skala liczona ANALITYCZNIE z centymetrow ukladu i wymiarow strefy w cm,
 * a nie przez docinanie gotowego obrazu — inaczej ramki wychodzilyby
 * rozmyte przy duzym pomniejszeniu.
 */
async function buildGalleryInterior(items, outputPath, opts) {
  opts = opts || {};
  const rooms = require('./setRoomBackgrounds');
  const scene = opts.roomId ? rooms.getRoom(opts.roomId) : rooms.getPrimaryRoom();
  const roomFile = path.join(__dirname, '..', 'assets', 'set_rooms', scene.id + '.png');
  if (!fs.existsSync(roomFile)) throw new Error('Brak assetu pokoju: ' + roomFile);

  const meta = await sharp(roomFile).metadata();
  const zoneWpx = Math.round(scene.zone.w * meta.width);
  const zoneHpx = Math.round(scene.zone.h * meta.height);

  const hero = items.reduce((a, b) => (b.heightCm > a.heightCm ? b : a));
  const reszta = items.filter((it) => it !== hero);
  const kolumnaWcm = reszta.length ? Math.max.apply(null, reszta.map((it) => it.widthCm)) : 0;
  const kolumnaHcm = reszta.reduce((s, it) => s + it.heightCm, 0) + GAP_STACK_CM * Math.max(0, reszta.length - 1);
  const ukladWcm = hero.widthCm + FRAME_CM * 2 + (reszta.length ? GAP_HERO_CM + kolumnaWcm + FRAME_CM * 2 : 0);
  const ukladHcm = Math.max(hero.heightCm + FRAME_CM * 2, kolumnaHcm + FRAME_CM * 2 * reszta.length);
  const calkowiteWcm = ukladWcm + MARGIN_CM * 2 + FRAME_CM * 4.4;
  const calkowiteHcm = ukladHcm + MARGIN_CM * 2 + FRAME_CM * 4.4;

  const pxPerCm = Math.min(zoneWpx / calkowiteWcm, zoneHpx / calkowiteHcm);
  const wynik = await skladajUklad(items, pxPerCm, null, true);

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

module.exports = { buildGalleryMaster, buildGalleryPackshot, buildGalleryInterior };
