/**
 * Arkusze stykowe niezatwierdzonych plakatow, do przegladu przed drukiem.
 *
 * Kazdy kafelek dostaje numer wypalony w rogu, a konsola wypisuje ta sama
 * liste w tej samej kolejnosci. Bez tego nie da sie wskazac konkretnej
 * sztuki do odrzucenia — przy 80 plakatach "ten trzeci w drugim rzedzie"
 * jest przepisem na pomylke.
 *
 *   node scripts/arkuszPrzegladu.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const WYJSCIE = path.join(ROOT, '_kopie_kartoteki');
const norm = (p) => String(p || '').split('\\').join('/');

const KOL = 5;
const WIERSZ = 4;
const NA_ARKUSZ = KOL * WIERSZ;
const KAFEL_W = 300;
const KAFEL_H = 420;
const ODSTEP = 8;

function etykieta(numer, ostrzezenie) {
  const tlo = ostrzezenie ? '#c0392b' : '#111';
  return Buffer.from(
    `<svg width="${KAFEL_W}" height="46" xmlns="http://www.w3.org/2000/svg">
       <rect x="0" y="0" width="52" height="34" fill="${tlo}"/>
       <text x="26" y="24" font-family="Arial" font-size="21" font-weight="bold"
             fill="#fff" text-anchor="middle">${numer}</text>
     </svg>`
  );
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const lista = inv.posters
    .filter((p) => !p.approvedForPrint)
    .sort((a, b) => String(a.category).localeCompare(String(b.category)) || String(a.title).localeCompare(String(b.title)));

  console.log('niezatwierdzonych: ' + lista.length);
  console.log('');
  lista.forEach((p, i) => {
    console.log(
      String(i + 1).padStart(3) +
        '  ' + String(p.title).slice(0, 30).padEnd(32) +
        String(p.category).padEnd(24) +
        String(p.artStyle || '').padEnd(12) +
        (p.orientation === 'landscape' ? 'poziom ' : '       ') +
        (p.framingWarning ? '⚠ marginesy' : '')
    );
  });

  const arkuszy = Math.ceil(lista.length / NA_ARKUSZ);
  for (let a = 0; a < arkuszy; a++) {
    const partia = lista.slice(a * NA_ARKUSZ, (a + 1) * NA_ARKUSZ);
    const warstwy = [];
    for (let i = 0; i < partia.length; i++) {
      const p = partia[i];
      const abs = path.join(ROOT, norm(p.imagePath));
      if (!fs.existsSync(abs)) continue;
      const kol = i % KOL;
      const wier = Math.floor(i / KOL);
      const left = ODSTEP + kol * (KAFEL_W + ODSTEP);
      const top = ODSTEP + wier * (KAFEL_H + ODSTEP);
      const obraz = await sharp(abs)
        .resize(KAFEL_W, KAFEL_H, { fit: 'contain', background: '#ffffff' })
        .toBuffer();
      warstwy.push({ input: obraz, left, top });
      warstwy.push({ input: etykieta(a * NA_ARKUSZ + i + 1, !!p.framingWarning), left, top });
    }
    const plik = path.join(WYJSCIE, `_przeglad_${a + 1}.jpg`);
    await sharp({
      create: {
        width: ODSTEP + KOL * (KAFEL_W + ODSTEP),
        height: ODSTEP + WIERSZ * (KAFEL_H + ODSTEP),
        channels: 3,
        background: '#ffffff',
      },
    })
      .composite(warstwy)
      .jpeg({ quality: 86 })
      .toFile(plik);
    console.log('');
    console.log('arkusz ' + (a + 1) + '/' + arkuszy + ': ' + path.relative(ROOT, plik));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
