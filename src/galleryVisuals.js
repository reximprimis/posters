/**
 * Wizualizacje ZESTAWOW SCIENNYCH (kind: 'gallery') — packshot i salon.
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
 * Uklad: NAJWIEKSZY element (po wysokosci w cm) po lewej, reszta w kolumnie
 * po prawej, od gory do dolu w kolejnosci z definicji. To samo, co pierwszy
 * podglad kompozycji — tu tylko dochodzi oprawa i tlo.
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

function svgBuffer(svg) {
  return Buffer.from(svg);
}

async function zapisz(buf, outputPath, tloDlaJpeg) {
  await sharp(buf).flatten({ background: tloDlaJpeg }).jpeg({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

/**
 * Oprawia jeden element w ramke o zadanych wymiarach w PIKSELACH.
 * Grafika wypelnia wnetrze od krawedzi do krawedzi (full bleed, jak przy
 * pojedynczych plakatach w tej samej estetyce).
 */
async function oprawObraz(absPath, innerW, innerH, frameJednostka) {
  const art = await sharp(absPath).resize(innerW, innerH, { fit: 'cover', position: 'centre' }).png().toBuffer();
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

async function cienPod(w, h, padPx) {
  const svg = '<svg width="' + (w + padPx * 2) + '" height="' + (h + padPx * 2) + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feGaussianBlur stdDeviation="' + Math.round(padPx / 2.4) + '"/></filter></defs>' +
    '<rect x="' + padPx + '" y="' + (padPx + Math.round(padPx / 3)) + '" width="' + w + '" height="' + h + '" ' +
    'fill="rgba(0,0,0,0.28)" filter="url(#b)"/></svg>';
  return sharp(svgBuffer(svg)).png().toBuffer();
}

/**
 * Sklada uklad hero+kolumna przy zadanym mnozniku pikseli-na-centymetr.
 * @param {Array<{absPath:string, widthCm:number, heightCm:number}>} items
 * @param {number} pxPerCm
 * @param {string|null} background kolor tla albo null dla przezroczystego
 * @returns {Promise<{buffer:Buffer, width:number, height:number}>}
 */
async function skladajUklad(items, pxPerCm, background) {
  const hero = items.reduce((a, b) => (b.heightCm > a.heightCm ? b : a));
  const reszta = items.filter((it) => it !== hero);
  const frameJednostka = Math.round(FRAME_CM * pxPerCm);
  const gapHero = Math.round(GAP_HERO_CM * pxPerCm);
  const gapStack = Math.round(GAP_STACK_CM * pxPerCm);
  const margines = Math.round(MARGIN_CM * pxPerCm);

  const heroFrame = await oprawObraz(
    hero.absPath, Math.round(hero.widthCm * pxPerCm), Math.round(hero.heightCm * pxPerCm), frameJednostka
  );
  const kolumna = [];
  for (const it of reszta) {
    kolumna.push(await oprawObraz(
      it.absPath, Math.round(it.widthCm * pxPerCm), Math.round(it.heightCm * pxPerCm), frameJednostka
    ));
  }

  const kolumnaW = kolumna.length ? Math.max.apply(null, kolumna.map((k) => k.width)) : 0;
  const kolumnaH = kolumna.reduce((s, k) => s + k.height, 0) + gapStack * Math.max(0, kolumna.length - 1);

  const rzadW = heroFrame.width + (kolumna.length ? gapHero + kolumnaW : 0);
  const rzadH = Math.max(heroFrame.height, kolumnaH);
  const padCien = Math.round(frameJednostka * 2.2);

  const canvasW = rzadW + margines * 2 + padCien * 2;
  const canvasH = rzadH + margines * 2 + padCien * 2;

  const podklad = background === null
    ? await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()
    : await sharp(svgBuffer('<svg width="' + canvasW + '" height="' + canvasH + '" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="' + background + '"/></svg>')).png().toBuffer();

  const layers = [];
  const heroX = margines + padCien;
  const heroY = margines + padCien + Math.round((rzadH - heroFrame.height) / 2);
  layers.push({ input: await cienPod(heroFrame.width, heroFrame.height, padCien), left: heroX - padCien, top: heroY - padCien });
  layers.push({ input: heroFrame.buffer, left: heroX, top: heroY });

  let y = margines + padCien + Math.round((rzadH - kolumnaH) / 2);
  const kolX = heroX + heroFrame.width + gapHero;
  for (const k of kolumna) {
    layers.push({ input: await cienPod(k.width, k.height, padCien), left: kolX - padCien, top: y - padCien });
    layers.push({ input: k.buffer, left: kolX, top: y });
    y += k.height + gapStack;
  }

  const buf = await sharp(podklad).composite(layers).png().toBuffer();
  return { buffer: buf, width: canvasW, height: canvasH };
}

/**
 * Packshot: oprawione elementy na czystym, neutralnym tle. Skala stala —
 * nie ma zony do wypelnienia, wiec bierzemy px/cm, ktory daje ostry,
 * duzy obraz niezaleznie od liczby elementow.
 */
async function buildGalleryPackshot(items, outputPath) {
  const wynik = await skladajUklad(items, 26, null);
  return zapisz(wynik.buffer, outputPath, '#f4f2ee');
}

/**
 * Salon: kompozycja wklejona w strefe sciany prawdziwego zdjecia wnetrza.
 * Tlo pochodzi z assets/set_rooms/ — ten sam zasob, ktory uzywaja dyptyki
 * i tryptyki, wiec zestaw scienny wisi w tym samym, sprawdzonym pokoju.
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
  const wynik = await skladajUklad(items, pxPerCm, null);

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

module.exports = { buildGalleryPackshot, buildGalleryInterior };
