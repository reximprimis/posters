/**
 * Zdjecia hero na strone glowna: sciana z galeria NASZYCH plakatow.
 *
 * DLACZEGO PLAKATY WKLEJAMY, A NIE GENERUJEMY: model poproszony o "sciane
 * z plakatami" wymysla grafiki, ktorych nie mamy w sklepie. Klient klika
 * w hero, szuka tego plakatu i go nie znajduje. Tu tlem jest wnetrze
 * z PUSTA sciana, a nasze plakaty wchodza w nie lokalnie przez sharp —
 * dokladnie tak jak przy wizualizacjach zestawow.
 *
 * Sciana musi byc sfotografowana FRONTALNIE. Kazdy zbieg perspektywiczny
 * zdradza montaz, bo wklejamy proste prostokaty.
 *
 *   node scripts/heroSciany.js tlo        — generuje tla (platne, 2 wywolania)
 *   node scripts/heroSciany.js sklej      — wkleja plakaty w gotowe tla
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const WYJSCIE = path.join(ROOT, '_kopie_kartoteki', 'hero');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');

/** Format hero na desktop — jak obecne zdjecie w Sanity (3504x2336, 3:2). */
const SZER = 3504;
const WYS = 2336;

const SCENY = [
  {
    id: 'cieple',
    // Uklad ram: wspolrzedne w ULAMKACH kadru, zeby dalo sie je poprawic
    // bez przeliczania pikseli. Srodek galerii lezy na wysokosci wzroku
    // osoby siedzacej, nie w polowie kadru — inaczej wyglada jak w muzeum.
    prompt: [
      'Photorealistic interior photograph of a warm evening living room, shot straight-on.',
      '',
      'CAMERA: perfectly frontal to the back wall, lens axis perpendicular to the wall,',
      'no perspective convergence, no tilt, no wide-angle distortion.',
      '',
      'ROOM: a low linen sofa with cushions and a throw along the bottom of the frame,',
      'a side table on the right with a ceramic table lamp switched ON, casting a warm',
      'orange pool of light up the wall; a small stack of books and a glass of red wine',
      'on the table; a dark wooden floor with a woven rug.',
      '',
      'LIGHT: warm tungsten glow from the lamp is the only light source, deep amber',
      'falloff across the wall, soft shadows, cosy evening mood, unlit corners.',
      '',
      'CRITICAL — THE WALL ABOVE THE SOFA IS COMPLETELY EMPTY:',
      'no pictures, no posters, no frames, no canvases, no mirrors, no shelves,',
      'no wall art, no hooks, no nails, no decals, no text of any kind.',
      'A plain warm plaster wall in soft clay beige with subtle even texture.',
      'Leave generous empty wall space above the sofa across the full width.',
      '',
      'STYLE: natural interior photography, soft realistic shadows, no HDR.',
    ].join('\n'),
    // Ramy wyrownane do WSPOLNEJ OSI POZIOMEJ (cy), nie do gornej krawedzi.
    // Przy roznych rozmiarach wyrownanie do gory daje pilokszalt, a galeria
    // scienna wiesza sie na wspolnej linii wzroku.
    //
    // cy = 0.27: sofa zaczyna sie na 52% wysokosci kadru, wiec dolna krawedz
    // najwiekszej ramy (0.27 + 0.34/2 = 0.44) zostawia nad oparciem odstep.
    ramy: [
      { x: 0.07, cy: 0.27, w: 0.115, kolor: '#1a1a1a' },
      { x: 0.20, cy: 0.27, w: 0.145, kolor: '#1a1a1a' },
      { x: 0.365, cy: 0.27, w: 0.115, kolor: '#3b2f26' },
      { x: 0.50, cy: 0.27, w: 0.09, kolor: '#1a1a1a' },
    ],
  },
  {
    id: 'jasne',
    prompt: [
      'Photorealistic interior photograph of a bright airy living room, shot straight-on.',
      '',
      'CAMERA: perfectly frontal to the back wall, lens axis perpendicular to the wall,',
      'no perspective convergence, no tilt, no wide-angle distortion.',
      '',
      'ROOM: a pale bouclé armchair on the left with a folded throw, a slim floor lamp',
      'with a white shade switched on beside it, a low oak bench on the right with a',
      'stoneware vase of dried grasses; light oak floor, natural linen curtain edge.',
      '',
      'LIGHT: bright soft daylight from the left plus the cool white lamp, airy and clean,',
      'gentle shadows, Scandinavian morning mood.',
      '',
      'CRITICAL — THE WALL BEHIND THE ARMCHAIR IS COMPLETELY EMPTY:',
      'no pictures, no posters, no frames, no canvases, no mirrors, no shelves,',
      'no wall art, no hooks, no nails, no decals, no text of any kind.',
      'A plain wall in warm off-white with subtle even texture.',
      'Leave generous empty wall space across the full width.',
      '',
      'STYLE: natural interior photography, soft realistic shadows, no HDR.',
    ].join('\n'),
    // Uklad regularny: trzy rowne kadry na wspolnej osi, rowny odstep.
    ramy: [
      { x: 0.30, cy: 0.30, w: 0.135, kolor: '#2b2b2b' },
      { x: 0.455, cy: 0.30, w: 0.135, kolor: '#2b2b2b' },
      { x: 0.61, cy: 0.30, w: 0.135, kolor: '#2b2b2b' },
    ],
  },
];

/** Plakaty do sciany. Dobierane RECZNIE — hero ma byc spojne kolorystycznie. */
const DOBOR = {
  cieple: ['Terracotta Arch on Cream', 'Maple Leaves Autumn', 'Whiskey Amber Glow',
    'Single Arch on Sand', 'Cut Paper Leaves'],
  jasne: ['Magnolia Over Still Water', 'Soft Botanical Branch', 'Lake Reflection Calm'],
};

function sciezkaPlakatu(inv, tytul) {
  const p = inv.posters.find((x) => x.title === tytul);
  if (!p) return null;
  const abs = path.join(ROOT, norm(p.imagePath));
  return fs.existsSync(abs) ? abs : null;
}

/** Plakat w ramce z cienkim passe-partout — tak wisi na scianie. */
async function wRamce(sciezka, szerPx, kolorRamy) {
  const rama = Math.max(3, Math.round(szerPx * 0.022));
  const passe = Math.round(szerPx * 0.055);
  const wnetrzeW = szerPx - 2 * rama - 2 * passe;
  const wnetrzeH = Math.round(wnetrzeW * 1.5);
  const calaW = szerPx;
  const calaH = wnetrzeH + 2 * rama + 2 * passe;

  const grafika = await sharp(sciezka)
    .resize(wnetrzeW, wnetrzeH, { fit: 'cover', position: 'centre' })
    .toBuffer();

  const tlo = Buffer.from(
    `<svg width="${calaW}" height="${calaH}" xmlns="http://www.w3.org/2000/svg">
       <rect width="100%" height="100%" fill="${kolorRamy}"/>
       <rect x="${rama}" y="${rama}" width="${calaW - 2 * rama}" height="${calaH - 2 * rama}" fill="#f7f4ef"/>
     </svg>`
  );

  return sharp(tlo)
    .composite([{ input: grafika, left: rama + passe, top: rama + passe }])
    .png()
    .toBuffer();
}

async function generujTla() {
  require('dotenv').config({ quiet: true });
  const ImageGen = require('../src/dalleImageGenerator');
  const gen = new ImageGen();
  if (!fs.existsSync(WYJSCIE)) fs.mkdirSync(WYJSCIE, { recursive: true });

  for (const s of SCENY) {
    const plik = path.join(WYJSCIE, 'tlo_' + s.id + '.png');
    console.log('generuje tlo: ' + s.id);
    process.env.IMAGE_GENERATION_SIZE = '1536x1024';
    process.env.IMAGE_TARGET_WIDTH = String(SZER);
    process.env.IMAGE_TARGET_HEIGHT = String(WYS);
    process.env.ENABLE_SAFE_FRAMING = '0';
    process.env.POSTER_UPSCALE_ON_SAVE = '0';
    await gen.generateImage('hero', '', '', plik, { customPrompt: s.prompt });
    console.log('   zapisane: ' + path.relative(ROOT, plik));
  }
}

async function sklej() {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  for (const s of SCENY) {
    const tlo = path.join(WYJSCIE, 'tlo_' + s.id + '.png');
    if (!fs.existsSync(tlo)) { console.log('brak tla: ' + s.id + ' — najpierw "tlo"'); continue; }

    const podklad = await sharp(tlo).resize(SZER, WYS, { fit: 'cover', position: 'centre' }).toBuffer();
    const warstwy = [];
    const tytuly = DOBOR[s.id] || [];

    for (let i = 0; i < s.ramy.length; i++) {
      const r = s.ramy[i];
      const tytul = tytuly[i % tytuly.length];
      const sciezka = sciezkaPlakatu(inv, tytul);
      if (!sciezka) { console.log('   pomijam (brak): ' + tytul); continue; }
      const szerPx = Math.round(SZER * r.w);
      const obraz = await wRamce(sciezka, szerPx, r.kolor);
      const meta = await sharp(obraz).metadata();
      // cy to SRODEK ramy — dzieki temu rozne rozmiary wisza na jednej linii.
      const top = Math.round(WYS * r.cy - meta.height / 2);
      warstwy.push({ input: obraz, left: Math.round(SZER * r.x), top });
      console.log('   ' + tytul.slice(0, 28).padEnd(30) + szerPx + 'x' + meta.height + ' px  y ' +
        (top / WYS).toFixed(2) + '-' + ((top + meta.height) / WYS).toFixed(2));
    }

    const wynik = path.join(WYJSCIE, 'hero_' + s.id + '.jpg');
    await sharp(podklad).composite(warstwy).jpeg({ quality: 92 }).toFile(wynik);
    console.log('gotowe: ' + path.relative(ROOT, wynik) + '  (' + warstwy.length + ' ram)');
  }
}

const tryb = process.argv[2] || 'sklej';
(tryb === 'tlo' ? generujTla() : sklej()).catch((e) => {
  console.error(e);
  process.exit(1);
});
