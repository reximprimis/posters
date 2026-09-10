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
 * nie do zaakceptowania jako packshot produktu.
 *
 * Tu sklada sie WYLACZNIE "surowa" siatka — realne ramy, realny wydruk,
 * przezroczyste tlo, BEZ CIENIA. Zaden lokalny cien nie jest juz rysowany:
 * wersja z recznie rysowanym, rozmytym prostokatem pod kazda ramka wygladala
 * plasko ("cienie sa problemem... zrob realistycznie jakby fotograf to
 * zrobil"). Ta surowa siatka jedzie jako referencja do GPT Image 2
 * (src/galleryFramedPackshotAI.js dla mastera, src/galleryFramedInteriorAI.js
 * dla salonu) — model dorabia prawdziwe, fizycznie poprawne cienie i
 * oswietlenie, wiernie zachowujac ramki i uklad z tej referencji.
 */

'use strict';

const sharp = require('sharp');
const { getMockup } = require('./frameMockups');

const GAP_CM = 2.0;
const MARGIN_CM = 3.5;

/**
 * Wstawia wydruk w otwor prawdziwego zdjecia ramy, skalujac cale zdjecie tak,
 * zeby otwor mial zadany rozmiar w pikselach (innerW x innerH). Zdjecie ma
 * wlasne proporcje otworu, wiec przy niedopasowanym stosunku szerokosc/wysokosc
 * skalujemy po srednioej z obu osi i docinamy tresc "cover" fitem — tak samo
 * robi kazdy generator mockupow, ktoremu podajesz wlasna grafike do gotowej ramki.
 */
/**
 * Skaluje wycietą ramke (RGBA, przezroczysty otwor) na docelowy rozmiar.
 * RGB i alfa sa skalowane OSOBNO, z alfa przez 'nearest' (bez interpolacji) —
 * inaczej standardowy resize() bez premultiplikacji alfa przecieka bialym
 * kolorem otworu (post-flatten) w piksele brzegowe ramy przy skalowaniu,
 * dajac widoczna jasna linie miedzy rama a wklejona sztuka (zauwazone przez
 * uzytkownika na ciemnych plakatach — na jasnym tle bylo niewidoczne, wiec
 * przeszlo niezauwazone wczesniej). RGB moze sie skalowac normalnie (lanczos)
 * bez ryzyka, bo to juz nie miesza sie z alfa.
 */
async function skalujRamkeRGBA(cutoutBuffer, totalW, totalH) {
  const [rgb, alpha] = await Promise.all([
    sharp(cutoutBuffer).removeAlpha().resize(totalW, totalH).raw().toBuffer({ resolveWithObject: true }),
    sharp(cutoutBuffer).extractChannel('alpha').resize(totalW, totalH, { kernel: 'nearest' }).raw().toBuffer(),
  ]);
  return sharp(rgb.data, { raw: { width: totalW, height: totalH, channels: rgb.info.channels } })
    .joinChannel(alpha, { raw: { width: totalW, height: totalH, channels: 1 } })
    .png()
    .toBuffer();
}

async function oprawObraz(absPath, innerW, innerH, kolorRamy) {
  const mock = await getMockup(kolorRamy);
  const skala = ((innerW / mock.innerW) + (innerH / mock.innerH)) / 2;
  const totalW = Math.round(mock.width * skala);
  const totalH = Math.round(mock.height * skala);
  const openLeft = Math.round(mock.innerLeft * skala);
  const openTop = Math.round(mock.innerTop * skala);
  const openW = Math.round(mock.innerW * skala);
  const openH = Math.round(mock.innerH * skala);

  // BLEED: art jest wklejana kilka pikseli WIEKSZA niz nominalny otwor (i o
  // tyle samo przesunieta do tylu), zamiast dokladnie pasowac krawedz w
  // krawedz. Powod: otwor i rama-po-skalowaniu licza sie DWOMA NIEZALEZNYMI
  // operacjami resize (art przez sharp .resize(openW,openH), rama przez
  // skalujRamkeRGBA na cala plansze) z osobnym zaokraglaniem w kazdej —
  // przy pewnych skalach zostawia to 1px w pelni PRZEZROCZYSTA szczeline na
  // styku (rama juz nieopaque, art jeszcze sie nie zaczyna), przez ktora
  // przeswieca biale plotno pod spodem. Zauwazone przez uzytkownika jako
  // jasna linia na stylu ramy przy ciemnym motywie (na jasnym bylo
  // niewidoczne). Rama i tak rysuje sie NA WIERZCHU, wiec dodatkowy bleed
  // artu nigdzie nie wystaje — po prostu gwarantuje, ze pod kazdym pikselem
  // ramy (i tuz pod jej wewnetrzna krawedzia) zawsze jest tresc artu, nie
  // przezroczystosc.
  const BLEED_PX = 4;
  const [art, ramaSkalowana] = await Promise.all([
    sharp(absPath).resize(openW + BLEED_PX * 2, openH + BLEED_PX * 2, { fit: 'cover', position: 'centre' }).png().toBuffer(),
    skalujRamkeRGBA(mock.cutoutBuffer, totalW, totalH),
  ]);

  const buf = await sharp({ create: { width: totalW, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: art, left: openLeft - BLEED_PX, top: openTop - BLEED_PX },
      { input: ramaSkalowana, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  return { buffer: buf, width: totalW, height: totalH };
}

/**
 * Sklada surowa siatke 2 kolumny x N wierszy przy zadanym mnozniku
 * pikseli-na-cm: realne ramy, realny wydruk, przezroczyste tlo, bez cienia.
 * Wszystkie elementy MUSZA byc tego samego rozmiaru — to zalozenie upraszcza
 * uklad do rownej kraty, bez logiki hero+kolumna.
 */
async function skladajSiatke(items, kolorRamy, pxPerCm) {
  const w = items[0].widthCm, h = items[0].heightCm;
  if (items.some((it) => it.widthCm !== w || it.heightCm !== h)) {
    throw new Error('skladajSiatke: wszystkie elementy musza miec ten sam rozmiar');
  }
  const kolumny = items.length >= 4 ? 2 : items.length;
  const wiersze = Math.ceil(items.length / kolumny);

  const gap = Math.round(GAP_CM * pxPerCm);
  const margines = Math.round(MARGIN_CM * pxPerCm);

  const kafle = [];
  for (const it of items) {
    kafle.push(await oprawObraz(
      it.absPath, Math.round(w * pxPerCm), Math.round(h * pxPerCm), kolorRamy
    ));
  }
  const kw = kafle[0].width, kh = kafle[0].height;

  const rzadW = kolumny * kw + (kolumny - 1) * gap;
  const rzadH = wiersze * kh + (wiersze - 1) * gap;
  const canvasW = rzadW + margines * 2;
  const canvasH = rzadH + margines * 2;

  const podklad = await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();

  const layers = [];
  for (let i = 0; i < kafle.length; i++) {
    const kol = i % kolumny, wrs = Math.floor(i / kolumny);
    const x = margines + kol * (kw + gap);
    const y = margines + wrs * (kh + gap);
    layers.push({ input: kafle[i].buffer, left: x, top: y });
  }

  const buf = await sharp(podklad).composite(layers).png().toBuffer();
  return { buffer: buf, width: canvasW, height: canvasH };
}

/**
 * Surowa siatka gotowa jako referencja dla GPT Image 2 (master i salon) —
 * patrz src/galleryFramedPackshotAI.js i src/galleryFramedInteriorAI.js.
 */
async function buildFramedGridRaw(items, kolorRamy) {
  return skladajSiatke(items, kolorRamy, 26);
}

module.exports = { buildFramedGridRaw };
