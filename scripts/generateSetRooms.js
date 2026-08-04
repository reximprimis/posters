/**
 * Generuje tla wnetrz dla zestawow. Uruchamiane RECZNIE, raz na tlo —
 * gotowe pliki leza w assets/set_rooms/ i sa reuzywane za darmo.
 *
 *   node scripts/generateSetRooms.js            — brakujace tla
 *   node scripts/generateSetRooms.js salon_sofa — konkretne, nadpisujac
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ quiet: true });

const sharp = require('sharp');
const ImageGen = require('../src/dalleImageGenerator');
const { ROOMS, buildRoomPrompt } = require('../src/setRoomBackgrounds');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'set_rooms');
const SIZE = { w: 1536, h: 1024 };

/**
 * Odcina jednolite pasy dodane przez resizeToPrintCanvas.
 *
 * Zabezpieczenie, nie glowny mechanizm: zmienne IMAGE_TARGET_* powinny wystarczyc,
 * ale przy pierwszym tle zabraklo ich i obraz przyszedl wciśniety w plotno plakatu
 * 2000x3000 z beżowymi pasami. Taniej odciac niz generowac drugi raz.
 */
async function trimPadding(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const rowVar = (y) => {
    let mn = 255;
    let mx = 0;
    for (let x = 0; x < info.width; x += 7) {
      const v = data[(y * info.width + x) * ch];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    return mx - mn;
  };
  let top = 0;
  while (top < info.height && rowVar(top) < 12) top++;
  let bot = info.height - 1;
  while (bot > top && rowVar(bot) < 12) bot--;

  const h = bot - top + 1;
  if (top === 0 && h === info.height) return { trimmed: false, width: info.width, height: info.height };

  const tmp = file + '.tmp.png';
  await sharp(file).extract({ left: 0, top, width: info.width, height: h }).png().toFile(tmp);
  fs.renameSync(tmp, file);
  return { trimmed: true, width: info.width, height: h };
}

async function generateRoom(scene) {
  const out = path.join(OUT_DIR, `${scene.id}.png`);

  const prev = {
    size: process.env.IMAGE_GENERATION_SIZE,
    tw: process.env.IMAGE_TARGET_WIDTH,
    th: process.env.IMAGE_TARGET_HEIGHT,
    safe: process.env.ENABLE_SAFE_FRAMING,
    up: process.env.POSTER_UPSCALE_ON_SAVE,
  };

  // IMAGE_TARGET_* sa konieczne: bez nich zapis przeskalowuje obraz do plotna
  // plakatu 2:3 i dokleja pasy. Przywracane w finally, bo to zmienne globalne.
  process.env.IMAGE_GENERATION_SIZE = `${SIZE.w}x${SIZE.h}`;
  process.env.IMAGE_TARGET_WIDTH = String(SIZE.w);
  process.env.IMAGE_TARGET_HEIGHT = String(SIZE.h);
  process.env.ENABLE_SAFE_FRAMING = '0';
  process.env.POSTER_UPSCALE_ON_SAVE = '0';

  try {
    const t0 = Date.now();
    await new ImageGen().generateImage(scene.label, 'Wnetrza', 'Photography', out, {
      customPrompt: buildRoomPrompt(scene),
    });
    const trim = await trimPadding(out);
    const sek = Math.round((Date.now() - t0) / 1000);
    console.log(
      `  OK  ${scene.id.padEnd(18)} ${trim.width}x${trim.height}` +
        `${trim.trimmed ? ' (odciete pasy)' : ''}  ${sek} s`
    );
  } finally {
    for (const [k, v] of [
      ['IMAGE_GENERATION_SIZE', prev.size],
      ['IMAGE_TARGET_WIDTH', prev.tw],
      ['IMAGE_TARGET_HEIGHT', prev.th],
      ['ENABLE_SAFE_FRAMING', prev.safe],
      ['POSTER_UPSCALE_ON_SAVE', prev.up],
    ]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2).filter(Boolean);

  const doGenerate = ROOMS.filter((s) => {
    if (only.length) return only.includes(s.id);
    return !fs.existsSync(path.join(OUT_DIR, `${s.id}.png`));
  });

  if (!doGenerate.length) {
    console.log('Wszystkie tla juz istnieja. Podaj id, zeby wygenerowac ponownie.');
    return;
  }

  console.log(`Generuje ${doGenerate.length} tlo/tla (~2 min kazde, platne):`);
  for (const scene of doGenerate) {
    console.log(`  ... ${scene.id} — ${scene.label}`);
    await generateRoom(scene);
  }
  console.log('Gotowe. Sprawdz kadry i dostroj `zone` w src/setRoomBackgrounds.js.');
})().catch((e) => {
  console.error('BLAD:', e.message);
  process.exit(1);
});
