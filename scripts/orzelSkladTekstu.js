/**
 * Naklada napisy na warianty plakatu rocznicowego.
 *
 * Tekst sklada sie przez SVG, a NIE generuje modelem obrazu. Powod jest
 * prosty: model gubi polskie znaki i przy nazwie "MYSLAKOWICE" potrafi
 * wypluc litery, ktorych tam nie ma. Skladany SVG daje pewnosc, ze napis
 * jest za kazdym razem identyczny i poprawny — a to jedyna rzecz, ktorej
 * na plakacie rocznicowym nie wolno pomylic.
 *
 *   node scripts/orzelSkladTekstu.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KAT = path.join(__dirname, '..', 'zestawy_robocze', 'orzel');

const GORA = '80 LAT';
const DOL = 'ORZEŁ MYSŁAKOWICE';

/** Kolory dobrane pod zielono-zlota heraldyke wariantow. */
const ZLOTO = '#e3c07a';
const ZLOTO_MOCNE = '#f0d79b';

/** Rozstrzelenie liter — heraldyka lubi powietrze miedzy znakami. */
function svgNapisow(W, H) {
  const margines = Math.round(W * 0.1);
  const szerLinii = W - 2 * margines;

  const rozmiarGora = Math.round(W * 0.135);
  const rozmiarDol = Math.round(W * 0.062);

  const yGora = Math.round(H * 0.115);
  const yLiniaGora = Math.round(H * 0.145);
  const yLiniaDol = Math.round(H * 0.878);
  const yDol = Math.round(H * 0.925);

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <text x="${W / 2}" y="${yGora}" text-anchor="middle"
            font-family="Georgia, 'Times New Roman', serif" font-size="${rozmiarGora}"
            font-weight="bold" letter-spacing="${Math.round(rozmiarGora * 0.12)}"
            fill="${ZLOTO_MOCNE}">${GORA}</text>

      <line x1="${margines + szerLinii * 0.28}" y1="${yLiniaGora}"
            x2="${margines + szerLinii * 0.72}" y2="${yLiniaGora}"
            stroke="${ZLOTO}" stroke-width="${Math.max(2, Math.round(W * 0.0016))}" opacity="0.75"/>

      <line x1="${margines}" y1="${yLiniaDol}" x2="${W - margines}" y2="${yLiniaDol}"
            stroke="${ZLOTO}" stroke-width="${Math.max(2, Math.round(W * 0.0016))}" opacity="0.6"/>
      <line x1="${margines}" y1="${yLiniaDol + Math.round(H * 0.006)}" x2="${W - margines}" y2="${yLiniaDol + Math.round(H * 0.006)}"
            stroke="${ZLOTO}" stroke-width="${Math.max(1, Math.round(W * 0.0008))}" opacity="0.4"/>

      <text x="${W / 2}" y="${yDol}" text-anchor="middle"
            font-family="Georgia, 'Times New Roman', serif" font-size="${rozmiarDol}"
            letter-spacing="${Math.round(rozmiarDol * 0.22)}"
            fill="${ZLOTO}">${DOL}</text>
    </svg>`,
    'utf8'
  );
}

(async () => {
  if (!fs.existsSync(KAT)) {
    console.error('Brak katalogu ' + KAT + ' — najpierw uruchom scripts/orzelWarianty.js');
    process.exit(1);
  }
  const pliki = fs.readdirSync(KAT).filter((f) => /^[ABC]_.*\.png$/.test(f) && !f.includes('_napis'));
  if (!pliki.length) {
    console.error('Brak wariantow do zlozenia.');
    process.exit(1);
  }

  for (const plik of pliki) {
    const wej = path.join(KAT, plik);
    const wyj = path.join(KAT, plik.replace(/\.png$/, '_napis.png'));
    const meta = await sharp(wej).metadata();
    await sharp(wej)
      .composite([{ input: svgNapisow(meta.width, meta.height), top: 0, left: 0 }])
      .png()
      .toFile(wyj);
    console.log('   ' + plik + '  ->  ' + path.basename(wyj) + '   (' + meta.width + 'x' + meta.height + ')');
  }
  console.log('');
  console.log('Napisy: "' + GORA + '" u gory, "' + DOL + '" u dolu.');
})().catch((e) => { console.error(e); process.exit(1); });
