/**
 * Zasiewa kartotekE rekordami kind:'frame' — po jednym na kazda kombinacje
 * kolor x rozmiar z src/ramkiKatalog.js (30 pozycji). Cena bierze sie
 * WYLACZNIE z ramkiKatalog.js — jedno zrodlo prawdy z gallery-framed.
 *
 * Idempotentny: pomija kombinacje, ktore juz maja rekord (po handle),
 * wiec mozna uruchamiac ponownie po zmianie ramkiKatalog.js bez dubli.
 *
 *   node scripts/zasiejRamki.js             — proba
 *   node scripts/zasiejRamki.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

const { RAMKI } = require('../src/ramkiKatalog');
const { buildFrameProductDescription } = require('../src/frameProductDescription');

const zapis = process.argv.includes('--wykonaj');

const KOLOR_PRZYM = {
  'czarny-mat': 'Czarna Matowa',
  zloty: 'Złota',
  srebrny: 'Srebrna',
  miedziany: 'Miedziana',
  dab: 'Dębowa',
  bialy: 'Biała',
  czarny: 'Czarna',
};
const MATERIAL_PRZYM = { aluminium: 'Aluminiowa', drewno: 'Drewniana' };

function tytul(kolor, material, rozmiar) {
  return `${KOLOR_PRZYM[kolor]} Ramka ${MATERIAL_PRZYM[material]} ${rozmiar} cm`;
}

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const istniejaceHandle = new Set(
  inv.posters.filter((p) => p.kind === 'frame').map((p) => p.handle)
);

const doDodania = [];
for (const rama of RAMKI) {
  for (const rozmiar of Object.keys(rama.ceny)) {
    const handle = rama.handlePrefix + '-' + rozmiar + '-cm';
    if (istniejaceHandle.has(handle)) continue;
    doDodania.push({
      handle,
      title: tytul(rama.kolor, rama.material, rozmiar),
      frameColor: rama.kolor,
      frameMaterial: rama.material,
      size: rozmiar,
      price: rama.ceny[rozmiar],
    });
  }
}

console.log('Rekordow kind:frame juz w kartotece: ' + istniejaceHandle.size);
console.log('Do dodania: ' + doDodania.length);
doDodania.forEach((d) => console.log('   ' + d.handle + '  (' + d.price + ' zl)'));

if (!doDodania.length) {
  console.log('');
  console.log('Nic do zrobienia — katalog ram juz kompletny.');
  process.exit(0);
}

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj.');
  process.exit(0);
}

const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
for (const d of doDodania) {
  if (swieza.posters.some((p) => p.handle === d.handle)) continue; // wyscig zapisow — patrz inne skrypty
  swieza.posters.push({
    id: 'frame_' + d.handle,
    kind: 'frame',
    title: d.title,
    handle: d.handle,
    frameColor: d.frameColor,
    frameMaterial: d.frameMaterial,
    size: d.size,
    price: d.price,
    approvedForPrint: false,
    createdAt: new Date().toISOString(),
    shopDescription: buildFrameProductDescription({
      frameColor: d.frameColor,
      frameMaterial: d.frameMaterial,
      size: d.size,
    }),
  });
}
fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');
console.log('');
console.log('Zapisano ' + doDodania.length + ' nowych rekordow kind:frame.');
