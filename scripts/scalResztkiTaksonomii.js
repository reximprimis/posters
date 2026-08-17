/**
 * Scala trzy kategorie, ktore nie mialy odpowiednika w nowej taksonomii:
 *
 *   Japonia                    -> cities-travel (miejsca) + botanical/animals (przyroda)
 *   Podroze i plakaty vintage  -> cities-travel
 *   Grzyby i las               -> botanical
 *
 * Zadna nie miala ani jednego plakatu, ale kazda miala gotowa pule tytulow,
 * macierz stylow i tryb promptu — wiec to scalenie, nie kasowanie.
 *
 * CZEGO CELOWO NIE PRZENOSIMY: trybow promptu. Tryb dziala na CALA kategorie,
 * a te trzy byly waskie. Tryb "Grzyby i las" w botanice zamienilby kazda
 * magnolie w grzyba, a tryb podrozny kazda panorame Berlina w kanion.
 * Docelowe kategorie nie maja dzis wlasnego trybu i dzialaja poprawnie —
 * temat bierze sie z tytulu, a tytuly przenosimy w calosci.
 *
 *   node scripts/scalResztkiTaksonomii.js             — proba
 *   node scripts/scalResztkiTaksonomii.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const zapis = process.argv.includes('--wykonaj');

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wz = (t, f) => new RegExp(t.split('\n').map(esc).join('\\r?\\n'), f);

const dziennik = [];

function patch(plik, zmiany) {
  const abs = path.join(ROOT, plik);
  let s = fs.readFileSync(abs, 'utf8');
  for (const [opis, a, b] of zmiany) {
    const re = wz(a, undefined);
    if (!re.test(s)) {
      console.error('NIE ZNALEZIONO w ' + plik + ' [' + opis + ']:\n---\n' + a.slice(0, 180) + '\n---');
      process.exit(1);
    }
    s = s.replace(re, () => b);
    dziennik.push(plik + '  ' + opis);
  }
  if (zapis) fs.writeFileSync(abs, s, 'utf8');
}

// ------------------------------------------------------------ categoryStyles
patch('src/categoryStyles.js', [
  [
    'lista kategorii: usuniete trzy',
    "  // Dodane 2026-08-03 na podstawie researchu rynku wall-art.\n  // Uwaga: to TEMATY, nie estetyki. Japandi, boho czy wabi-sabi to paleta\n  // i nastroj — mieszkaja w src/aesthetics.js, nie tutaj.\n  'Japonia',\n  'Podróże i plakaty vintage',\n  'Grzyby i las',\n];",
    '  // Uwaga: to TEMATY, nie estetyki. Japandi, boho czy wabi-sabi to paleta\n  // i nastroj — mieszkaja w src/aesthetics.js, nie tutaj.\n];',
  ],
  [
    'opisy: trzy usuniete',
    "  Japonia:\n    'torii gate, Mount Fuji, cherry blossom branch, koi carp, crane in flight, bamboo grove, zen garden raked gravel, stone lantern, misty Japanese mountains, stylised wave — Japanese motifs treated as calm fine art',\n  'Podróże i plakaty vintage':\n    'travel landmarks, national park vistas, canyons, alpine peaks, desert arches, coastal cliffs, retro travel-poster graphic language with bold simplified shapes and flat layered color — no lettering',\n  'Grzyby i las':\n    'mushrooms, toadstools, fern fronds, moss, forest floor detail, woodland undergrowth, tree bark, cottagecore forest mood, quiet damp woodland light',\n};",
    '};',
  ],
  [
    'opis cities-travel poszerzony o podroze i miejsca',
    "  'cities-travel': 'cities, skylines, urbanism, maps, topography, streets, urban architecture',",
    "  'cities-travel':\n    'cities, skylines, urbanism, maps, topography, streets, urban architecture; also travel landmarks and destinations — national park vistas, canyons, alpine peaks, desert arches, coastal cliffs, torii gates, pagodas, zen gardens — in retro travel-poster graphic language, never with lettering',",
  ],
  [
    'opis botanical poszerzony o las i grzyby',
    "  'botanical':",
    "  // Poszerzone o dawna kategorie \"Grzyby i las\": grzyby i runo to botanika,\n  // a nie osobny temat.\n  'botanical':",
  ],
  [
    'style: trzy usuniete',
    "  Japonia: ['Minimalism', 'Line art', 'Illustration', 'Photography'],\n  'Podróże i plakaty vintage': ['Illustration', 'Minimalism', 'Abstract', 'Photography'],\n  'Grzyby i las': ['Photography', 'Illustration', 'Minimalism', 'Line art'],\n};",
    '};',
  ],
  [
    'style cities-travel: unia po scaleniu',
    "  'cities-travel': ['Photography', 'Minimalism', 'Abstract'],",
    "  'cities-travel': ['Photography', 'Minimalism', 'Abstract', 'Illustration', 'Line art'],",
  ],
  [
    'style botanical: unia po scaleniu',
    "  'botanical': ['Photography', 'Minimalism', 'Line art'],",
    "  'botanical': ['Photography', 'Minimalism', 'Line art', 'Illustration'],",
  ],
  [
    'pomieszczenia: trzy usuniete',
    "  Japonia: ['Do salonu', 'Do sypialni', 'Do gabinetu', 'Do biura', 'Do łazienki'],\n  'Podróże i plakaty vintage': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego'],\n  'Grzyby i las': ['Do salonu', 'Do sypialni', 'Do kuchni', 'Do pokoju dziecka', 'Do jadalni'],\n};",
    '};',
  ],
  [
    'pomieszczenia cities-travel: unia',
    "  'cities-travel': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego'],",
    "  'cities-travel': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego', 'Do sypialni', 'Do łazienki'],",
  ],
  [
    'pomieszczenia botanical: unia',
    "  'botanical': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura', 'Do jadalni'],",
    "  'botanical': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura', 'Do jadalni', 'Do kuchni', 'Do pokoju dziecka'],",
  ],
]);

// ------------------------------------------------------- setRoomBackgrounds
patch('src/setRoomBackgrounds.js', [
  [
    'tlo salonu 2: Japonia usunieta',
    "  Japonia: 'jadalnia_komoda',",
    '',
  ],
  [
    'komentarz bez Japonii',
    ' * tego samego jasnego japandi co Japonia.',
    ' * tego samego jasnego japandi co botanika.',
  ],
]);

console.log('SCALENIE:');
dziennik.forEach((x) => console.log('   ' + x));
console.log('');
console.log('zmian: ' + dziennik.length);
if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
}
