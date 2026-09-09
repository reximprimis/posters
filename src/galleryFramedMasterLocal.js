/**
 * Master (packshot na czystym tle) dla ZESTAWU PLAKATOW I RAMEK — LOKALNIE,
 * bez AI. Zastepuje src/galleryFramedPackshotAI.js dla mastera (nie dla
 * salonu — tam AI zostaje, bo potrzebne jest tlo/kontekst pomieszczenia,
 * ktorego nie da sie sensownie zrobic lokalnie).
 *
 * Powod istnienia: GPT Image 2 dostawal surowa siatke (real frame photos,
 * przezroczyste tlo) jako referencje i mial "sfotografowac" ja z realistycznym
 * cieniem — ale nawet z prawdziwym zdjeciem jako referencja model POTRAFI
 * zmienic kolor/odcien ramy przy "fotografowaniu" (zlota rama wyszla
 * cieplejsza i bardziej matowa niz naprawde — sprawdzone przez uzytkownika
 * na Garden Birds Specimen Grid). Dla klienta kupujacego konkretny kolor
 * ramy to nie jest kosmetyka, to rozjazd miedzy zdjeciem produktowym a tym,
 * co przyjedzie w paczce.
 *
 * Ten modul NIE DOTYKA pikseli ramy w ogole — tylko dokleja cien i biale
 * tlo do juz gotowej, przezroczystej siatki. Kolor jest wiec Z DEFINICJI
 * identyczny z prawdziwym zdjeciem (src/frameMockups.js), zero ryzyka.
 *
 * Cien: PIERWSZA proba (patrz historia src/galleryFramedVisuals.js) rysowala
 * recznie rozmyty PROSTOKAT pod kazda ramka — wygladalo plasko, bo ksztalt
 * cienia nie mial nic wspolnego z prawdziwym ksztaltem ramki. Tu zamiast
 * tego bierzemy PRAWDZIWA MASKE ALFA calej zlozonej siatki (a wiec dokladny
 * kontur kazdej ramki z osobna, we wlasciwym miejscu), rozmywamy ja mocno,
 * przesuwamy lekko w dol i przycmniewamy — miekki, realistyczny cien
 * kontaktowy, ktory naturalnie ma ksztalt ramek, bo z nich dosownie
 * pochodzi.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SHADOW_BLUR = 22;
const SHADOW_OPACITY = 0.38;
const SHADOW_OFFSET_X_RATIO = 0.006;
const SHADOW_OFFSET_Y_RATIO = 0.014;
const SHADOW_RGB = 25;

/**
 * @param {Buffer} rawBuffer  Siatka bez cienia, real frame photos, przezroczyste tlo (PNG) — z buildFramedGridRaw().
 * @param {{ width: number, height: number }} dims  Wymiary rawBuffer w pikselach.
 * @param {string} outputPath
 */
async function buildFramedMasterLocal(rawBuffer, dims, outputPath) {
  const { width: W, height: H } = dims;
  if (!W || !H) throw new Error('buildFramedMasterLocal: brak width/height');

  const maskBuf = await sharp(rawBuffer)
    .ensureAlpha()
    .extractChannel('alpha')
    .blur(SHADOW_BLUR)
    .raw()
    .toBuffer();

  const scaled = Buffer.alloc(maskBuf.length);
  for (let i = 0; i < maskBuf.length; i++) scaled[i] = Math.round(maskBuf[i] * SHADOW_OPACITY);

  const blackRGB = Buffer.alloc(W * H * 3, SHADOW_RGB);
  const shadowLayer = await sharp(blackRGB, { raw: { width: W, height: H, channels: 3 } })
    .joinChannel(scaled, { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toBuffer();

  const offsetX = Math.round(W * SHADOW_OFFSET_X_RATIO);
  const offsetY = Math.round(H * SHADOW_OFFSET_Y_RATIO);

  if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
    .composite([
      { input: shadowLayer, left: offsetX, top: offsetY },
      { input: rawBuffer, left: 0, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = { buildFramedMasterLocal };
