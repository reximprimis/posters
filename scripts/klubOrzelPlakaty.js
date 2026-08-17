/**
 * Trzy plakaty dla KS Orzel Myslakowice.
 *
 * ZASADA: herb klubu i wszystkie napisy sa SKLADANE, nigdy generowane.
 * Model obrazu nie odtworzy herbu (za kazdym razem wymysli inny) ani nie
 * napisze poprawnie "MYSLAKOWICE". AI robi wylacznie tlo.
 *
 * Herb pochodzi z assets/klub_orzel_materialy/orzel_logo.png — 500x500
 * z przezroczystoscia, realna grafika 378x450. Sprawdzone: to eksport
 * z wektora, wiec skaluje sie czysto nawet 4x.
 *
 *   node scripts/klubOrzelPlakaty.js --tla    (generuje tla przez API)
 *   node scripts/klubOrzelPlakaty.js          (samo skladanie, bez API)
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const DalleImageGenerator = require('../src/dalleImageGenerator');

const ROOT = path.join(__dirname, '..');
const HERB = path.join(ROOT, 'assets', 'klub_orzel_materialy', 'orzel_logo.png');
const KAT = path.join(ROOT, 'zestawy_robocze', 'klub_orzel');
const generujTla = process.argv.includes('--tla');

const W = 2000;
const H = 3000;

/** Barwy klubowe. */
const ZIELEN = '#0f3320';
const ZIELEN_JASNA = '#1a5233';
const ZLOTO = '#f2c500';
const ZLOTO_PRZYGASZONE = '#d8b23f';

const BEZ_TEKSTU =
  'STRICTLY NO text, no letters, no numbers, no logos, no crests, no emblems, no badges, ' +
  'no banners with writing, no watermark, no signage, no scoreboard, no shirt numbers, no advertising boards. ';

const TLA = [
  {
    id: 'stadion',
    prompt:
      'Empty small-town football stadium at dusk under floodlights, seen from the halfway line. ' +
      'Deep green pitch with mown stripes, simple terrace stand, floodlight towers, misty evening air, ' +
      'warm lamp glow against a deep blue-green sky. ' +
      BEZ_TEKSTU +
      'Cinematic, quiet, nostalgic — the calm of a local ground before a match. ' +
      'Leave the UPPER THIRD calm and uncluttered for a crest, and keep the LOWER SIXTH simple for a caption.',
  },
  {
    id: 'murawa',
    prompt:
      'Close view of a classic football resting on dewy grass at sunrise, shallow depth of field, ' +
      'blades of grass catching low golden light, faint white touchline visible. ' +
      BEZ_TEKSTU +
      'Muted green and gold palette, soft morning haze, editorial sports photography, ' +
      'no plastic CGI look. ' +
      'Leave the UPPER THIRD calm and uncluttered for a crest, and keep the LOWER SIXTH simple for a caption.',
  },
];

/** Tlo plakatu herbowego robimy sami — pelna kontrola, zero kosztu API. */
async function tloHerbowe() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="v" cx="50%" cy="42%" r="72%">
        <stop offset="0%" stop-color="${ZIELEN_JASNA}"/>
        <stop offset="100%" stop-color="${ZIELEN}"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
    <rect x="70" y="70" width="${W - 140}" height="${H - 140}" fill="none"
          stroke="${ZLOTO_PRZYGASZONE}" stroke-width="4" opacity="0.55"/>
    <rect x="92" y="92" width="${W - 184}" height="${H - 184}" fill="none"
          stroke="${ZLOTO_PRZYGASZONE}" stroke-width="1.5" opacity="0.35"/>
  </svg>`;
  return sharp(Buffer.from(svg, 'utf8')).png().toBuffer();
}

/**
 * Napisy. Cambria, bo Georgia ma cyfry tekstowe i "80 LAT" czytalo sie
 * jak "8o LAT".
 */
function napisy({ gora, dol, podpis, kolorGora = ZLOTO, kolorDol = ZLOTO_PRZYGASZONE }) {
  const czesci = [];
  if (gora) {
    czesci.push(`<text x="${W / 2}" y="${Math.round(H * 0.108)}" text-anchor="middle"
      font-family="Cambria, 'Times New Roman', serif" font-size="${Math.round(W * 0.125)}"
      font-weight="bold" letter-spacing="${Math.round(W * 0.014)}" fill="${kolorGora}">${gora}</text>`);
    czesci.push(`<line x1="${W * 0.36}" y1="${Math.round(H * 0.132)}" x2="${W * 0.64}" y2="${Math.round(H * 0.132)}"
      stroke="${kolorGora}" stroke-width="3" opacity="0.7"/>`);
  }
  if (dol) {
    czesci.push(`<line x1="${W * 0.12}" y1="${Math.round(H * 0.888)}" x2="${W * 0.88}" y2="${Math.round(H * 0.888)}"
      stroke="${kolorDol}" stroke-width="3" opacity="0.6"/>`);
    czesci.push(`<text x="${W / 2}" y="${Math.round(H * 0.932)}" text-anchor="middle"
      font-family="Cambria, 'Times New Roman', serif" font-size="${Math.round(W * 0.055)}"
      letter-spacing="${Math.round(W * 0.011)}" fill="${kolorDol}">${dol}</text>`);
  }
  if (podpis) {
    czesci.push(`<text x="${W / 2}" y="${Math.round(H * 0.962)}" text-anchor="middle"
      font-family="Cambria, 'Times New Roman', serif" font-size="${Math.round(W * 0.026)}"
      letter-spacing="${Math.round(W * 0.006)}" fill="${kolorDol}" opacity="0.85">${podpis}</text>`);
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${czesci.join('')}</svg>`,
    'utf8'
  );
}

/** Przyciemnienie tla pod herbem i napisami, zeby tekst byl czytelny na zdjeciu. */
function przyciemnienie() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#04140b" stop-opacity="0.86"/>
        <stop offset="34%" stop-color="#04140b" stop-opacity="0.30"/>
        <stop offset="66%" stop-color="#04140b" stop-opacity="0.34"/>
        <stop offset="100%" stop-color="#04140b" stop-opacity="0.88"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`;
  return Buffer.from(svg, 'utf8');
}

async function herbNaSzerokosc(px) {
  return sharp(HERB).trim({ threshold: 1 }).resize({ width: px, kernel: 'lanczos3' }).png().toBuffer();
}

(async () => {
  if (!fs.existsSync(HERB)) {
    console.error('Brak herbu: ' + HERB);
    process.exit(1);
  }
  fs.mkdirSync(KAT, { recursive: true });

  if (generujTla) {
    const gen = new DalleImageGenerator();
    for (const t of TLA) {
      const cel = path.join(KAT, '_tlo_' + t.id + '.png');
      if (fs.existsSync(cel)) { console.log('tlo juz jest: ' + t.id); continue; }
      console.log('generuje tlo: ' + t.id + '…');
      await gen.generateImage('Klub Orzel', 'club-orzel', 'Photography', cel, {
        customPrompt: t.prompt,
        orientation: 'portrait',
      });
    }
  }

  const plakaty = [];

  // 1. HERBOWY — bez AI, sam sklad.
  {
    const tlo = await tloHerbowe();
    const herb = await herbNaSzerokosc(Math.round(W * 0.58));
    const hm = await sharp(herb).metadata();
    const buf = await sharp(tlo)
      .composite([
        { input: herb, left: Math.round((W - hm.width) / 2), top: Math.round(H * 0.24) },
        // Bez napisu na dole: herb ma juz wstege "ORZEŁ MYSŁAKOWICE", wiec
        // powtarzanie nazwy pod spodem daje ja na plakacie dwa razy.
        { input: napisy({ gora: '80 LAT' }), left: 0, top: 0 },
      ])
      .png().toBuffer();
    const p = path.join(KAT, '1_herbowy.png');
    await sharp(buf).toFile(p);
    plakaty.push(p);
    console.log('  -> ' + p);
  }

  // 2 i 3 — tlo ze zdjecia + przyciemnienie + herb + napisy.
  for (const [i, t] of TLA.entries()) {
    const tloPlik = path.join(KAT, '_tlo_' + t.id + '.png');
    if (!fs.existsSync(tloPlik)) { console.log('  (pomijam ' + t.id + ' — brak tla, uruchom z --tla)'); continue; }
    const tlo = await sharp(tloPlik).resize(W, H, { fit: 'cover', position: 'centre' }).png().toBuffer();
    const herb = await herbNaSzerokosc(Math.round(W * (t.id === 'stadion' ? 0.42 : 0.36)));
    const hm = await sharp(herb).metadata();
    const buf = await sharp(tlo)
      .composite([
        { input: przyciemnienie(), left: 0, top: 0 },
        { input: herb, left: Math.round((W - hm.width) / 2), top: Math.round(H * 0.30) },
        {
          input: napisy({
            gora: '80 LAT',
            // Tu nazwa u dolu MA sens: herb jest mniejszy i lezy na zdjeciu,
            // wiec wstega w nim bywa nieczytelna z odleglosci.
            dol: t.id === 'stadion' ? 'NASZE BOISKO, NASZE BARWY' : 'OD POKOLEŃ NA MURAWIE',
            kolorGora: ZLOTO,
            kolorDol: ZLOTO,
          }),
          left: 0, top: 0,
        },
      ])
      .png().toBuffer();
    const p = path.join(KAT, (i + 2) + '_' + t.id + '.png');
    await sharp(buf).toFile(p);
    plakaty.push(p);
    console.log('  -> ' + p);
  }

  // arkusz porownawczy
  if (plakaty.length) {
    const S = 420, HH = Math.round(S * 1.5), b = [];
    for (const p of plakaty) b.push(await sharp(p).resize(S, HH, { fit: 'contain', background: '#ffffff' }).toBuffer());
    await sharp({ create: { width: S * b.length, height: HH, channels: 3, background: '#ffffff' } })
      .composite(b.map((x, i) => ({ input: x, left: i * S, top: 0 })))
      .jpeg({ quality: 92 }).toFile(path.join(KAT, '_porownanie.jpg'));
    console.log('');
    console.log('arkusz: zestawy_robocze/klub_orzel/_porownanie.jpg');
  }
})().catch((e) => { console.error(e); process.exit(1); });
