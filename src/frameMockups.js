/**
 * Prawdziwe zdjecia ram (nie wektorowe rysunki) do kompozycji packshotow
 * zestawu plakatow i ramek (kind: 'gallery-framed').
 *
 * Kazde zdjecie w frames/assets_frame/ to plaska rama sfotografowana/wygenerowana
 * na wprost, z jasnym (prawie bialym, czasem lekko zaszumionym/w szachownice)
 * otworem na wydruk i jasnym tlem dookola.
 *
 * SEGMENTACJA JEST GEOMETRYCZNA, NIE KOLOROWA — i to jest kluczowe. Pierwsza
 * proba (prog jasnosci / flood fill po kolorze) dzialala dobrze dla ciemnych
 * i kolorowych ram, ale dla BIALEJ ramy byla cichym niewypalem: kolor ramy
 * jest wizualnie nieodrozniny od otworu i tla (~243-250 wszedzie), wiec
 * maska klasyfikowala PRAWIE CALA powierzchnie ramy jako "jasna" = "otwor/tlo"
 * i zostawiala tylko cienkie linie sloju jako widoczna ramke. Na podgladzie
 * (biale na bialym, plus checkerboard nieodroznialny od jasnej tresci w
 * miniaturze) wygladalo to poprawnie — wykryto to dopiero przy kompozycji
 * na czerwonym tle w pelnej rozdzielczosci.
 *
 * Zamiast tego: srodek obrazu ZAWSZE jest w otworze, a brzegi obrazu ZAWSZE
 * sa tlem — to geometryczny fakt o KOMPOZYCJI zdjecia, nie o kolorze ramy.
 * Skanujemy 1D wzdluz poziomej i pionowej osi przechodzacej przez srodek,
 * szukajac krawedzi otworu (pierwsze przejscie jasny->nie-jasny od srodka)
 * i krawedzi zewnetrznej ramy (kolejne przejscie z powrotem do jasnego).
 * Maska to potem czysta geometria: kazdy piksel W PIERScieniu miedzy
 * prostokatem zewnetrznym a prostokatem otworu jest RAMA (nieprzezroczysty),
 * niezaleznie od tego, jaki ma kolor. Dziala identycznie dla bialej,
 * czarnej czy zlotej ramy, bo nie polega na kontrascie koloru w ogole —
 * jedyne zalozenie to plaskie, prostokatne, wyśrodkowane zdjecie ramy
 * (a takie sa wszystkie pliki w tym katalogu).
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
  zloty: 'gold_alu_frame_mockup.png',
  srebrny: 'silver_alu_frame_mockup.png',
  'czarny-mat': 'black_mat_alu_frame_mockup.png',
};

const cache = new Map();

function jasny(r, g, b) {
  return r > 225 && g > 225 && b > 225 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
}

function mediana(liczby) {
  const s = [...liczby].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function analizujRamke(absPath) {
  const { data, info } = await sharp(absPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels; // zawsze 4 dzieki ensureAlpha
  const px = (x, y) => {
    const i = (y * w + x) * ch;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const swiatlo = (x, y) => jasny(...px(x, y));

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  if (!swiatlo(cx, cy)) {
    throw new Error('analizujRamke: srodek zdjecia nie jest jasny (nie znajde otworu na wydruk): ' + absPath);
  }

  // Niektore zdjecia maja delikatny szum/teksture (szachownica, zarysowania)
  // nawet w otworze i tle — pojedyncza linia skanu moze trafic na jeden
  // przypadkowy ciemny piksel i zatrzymac sie za wczesnie. Skanujemy WIELE
  // rownoleglych linii (co 40px w promieniu 120px od srodka) i bierzemy
  // MEDIANE znalezionych krawedzi — odporne na pojedyncze wybryki na
  // jednej linii, o ile wiekszosc linii jest czysta w tym miejscu.
  const OFFSETY = [-120, -80, -40, 0, 40, 80, 120];

  const skanPoziomo = (yBase, odSrodkaWLewo) => {
    let x = cx;
    if (odSrodkaWLewo) { while (x > 0 && swiatlo(x, yBase)) x--; return x + 1; }
    while (x < w - 1 && swiatlo(x, yBase)) x++; return x - 1;
  };
  const skanPionowo = (xBase, odSrodkaWGore) => {
    let y = cy;
    if (odSrodkaWGore) { while (y > 0 && swiatlo(xBase, y)) y--; return y + 1; }
    while (y < h - 1 && swiatlo(xBase, y)) y++; return y - 1;
  };

  const innerLeft = mediana(OFFSETY.map((dy) => skanPoziomo(cy + dy, true)).filter((v) => v > 0));
  const innerRight = mediana(OFFSETY.map((dy) => skanPoziomo(cy + dy, false)).filter((v) => v < w - 1));
  const innerTop = mediana(OFFSETY.map((dx) => skanPionowo(cx + dx, true)).filter((v) => v > 0));
  const innerBottom = mediana(OFFSETY.map((dx) => skanPionowo(cx + dx, false)).filter((v) => v < h - 1));

  // Krawedz zewnetrzna ramy: dalej na zewnatrz od krawedzi otworu, az
  // wrocimy na jasne tlo — ta sama technika (wiele linii + mediana).
  const skanDalejPoziomo = (yBase, odX, wLewo) => {
    let x = odX;
    if (wLewo) { while (x > 0 && !jasny(...px(x, yBase))) x--; return x; }
    while (x < w - 1 && !jasny(...px(x, yBase))) x++; return x;
  };
  const skanDalejPionowo = (xBase, odY, wGore) => {
    let y = odY;
    if (wGore) { while (y > 0 && !jasny(...px(xBase, y))) y--; return y; }
    while (y < h - 1 && !jasny(...px(xBase, y))) y++; return y;
  };

  // innerLeft/Right/Top/Bottom sa ostatnimi JASNYMI pikselami tuz przed
  // rama (patrz skanPoziomo/skanPionowo) — skan "dalej" musi wystartowac
  // JUZ W RAMIE (o 1px dalej), inaczej warunek "!jasny" jest falszywy od
  // razu i petla nigdy sie nie wykonuje.
  const outerLeft = mediana(OFFSETY.map((dy) => skanDalejPoziomo(cy + dy, innerLeft - 1, true)));
  const outerRight = mediana(OFFSETY.map((dy) => skanDalejPoziomo(cy + dy, innerRight + 1, false)));
  const outerTop = mediana(OFFSETY.map((dx) => skanDalejPionowo(cx + dx, innerTop - 1, true)));
  const outerBottom = mediana(OFFSETY.map((dx) => skanDalejPionowo(cx + dx, innerBottom + 1, false)));

  const innerW = innerRight - innerLeft;
  const innerH = innerBottom - innerTop;
  const borderPx = ((innerLeft - outerLeft) + (outerRight - innerRight) + (innerTop - outerTop) + (outerBottom - innerBottom)) / 4;

  // Maska GEOMETRYCZNA: opaque w pierscieniu miedzy prostokatem zewnetrznym
  // (outerLeft..outerRight, outerTop..outerBottom) a prostokatem otworu
  // (innerLeft..innerRight, innerTop..innerBottom); wszystko poza tym
  // pierscieniem (otwor w srodku, tlo na zewnatrz) jest przezroczyste.
  // Zero zaleznosci od koloru ramy — dziala tak samo dla bialej i czarnej.
  const alphaBuf = Buffer.alloc(w * h);
  for (let y = outerTop; y <= outerBottom; y++) {
    const wOtworze = y >= innerTop && y <= innerBottom;
    for (let x = outerLeft; x <= outerRight; x++) {
      if (wOtworze && x >= innerLeft && x <= innerRight) continue;
      alphaBuf[y * w + x] = 255;
    }
  }

  const cutoutBuffer = await sharp(absPath)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
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
