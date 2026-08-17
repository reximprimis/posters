/**
 * Dopisuje do kartoteki mockupy, ktore leza juz na dysku.
 *
 * Rozjazd bierze sie stad, ze zadanie generujace mockupy trzymalo cala
 * kartoteke w pamieci przez cala kolejke i zapisywalo ja dopiero na koncu.
 * Kazdy inny zapis w miedzyczasie — albo restart serwera — zostawial pliki
 * bez wpisu w rekordzie. Efekt: plakat ma gotowy packshot i wizualizacje
 * w salonie, ale eksport ich nie widzi i produkt idzie do sklepu z dwoma
 * zdjeciami zamiast czterech.
 *
 * Skrypt niczego nie generuje — tylko odnajduje istniejace pliki i wiaze je
 * z rekordami. Zero kosztu API.
 *
 *   node scripts/odzyskajMockupyZDysku.js             — proba
 *   node scripts/odzyskajMockupyZDysku.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const zapis = process.argv.includes('--wykonaj');

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const doNaprawy = [];
let juzMa = 0;
let brakPlikow = 0;

for (const p of inv.posters) {
  if (p.kind === 'set') continue;
  const rel = norm(p.imagePath);
  if (!rel) continue;
  const katalog = path.join(ROOT, path.dirname(rel));
  if (!fs.existsSync(katalog)) continue;

  const pliki = fs.readdirSync(katalog);
  const frame = pliki.find((f) => f.includes('_mockup_frame'));
  const interior = pliki.find((f) => f.includes('_mockup_interior'));

  if (!frame || !interior) { brakPlikow++; continue; }
  if (p.mockups && p.mockups.frame && p.mockups.interior) { juzMa++; continue; }

  doNaprawy.push({
    rekord: p,
    mockups: {
      frame: path.join(path.dirname(rel), frame).split('\\').join('/'),
      interior: path.join(path.dirname(rel), interior).split('\\').join('/'),
      // Data z pliku, nie z chwili naprawy — inaczej zgubilibysmy informacje,
      // kiedy mockup naprawde powstal.
      generatedAt: fs.statSync(path.join(katalog, frame)).mtime.toISOString(),
    },
  });
}

console.log('DO ODZYSKANIA: ' + doNaprawy.length);
doNaprawy.slice(0, 15).forEach((x) => console.log('   ' + x.rekord.title));
if (doNaprawy.length > 15) console.log('   … i ' + (doNaprawy.length - 15) + ' wiecej');
console.log('');
console.log('juz maja wpis: ' + juzMa + ',  bez plikow na dysku: ' + brakPlikow);

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
  process.exit(0);
}

// Czytamy plik jeszcze raz tuz przed zapisem — kolejka mockupow moze pracowac
// rownolegle i nie chcemy jej nadpisac.
const swieze = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
let zapisanych = 0;
for (const x of doNaprawy) {
  const rek = swieze.posters.find((p) => p && p.id === x.rekord.id);
  if (!rek || (rek.mockups && rek.mockups.frame)) continue;
  rek.mockups = x.mockups;
  zapisanych++;
}
fs.writeFileSync(INVENTORY, JSON.stringify(swieze, null, 2), 'utf8');
console.log('');
console.log('Odzyskane: ' + zapisanych);
