/**
 * Odtwarza wpisy mockupow w kartotece na podstawie plikow lezacych na dysku.
 *
 * Potrzebne, gdy pipeline wygenerowal pliki, ale wpis przepadl — na przyklad
 * przez wyscig zapisu: kolejka mockupow pracuje kilkadziesiat minut w tle,
 * a rownolegla operacja na kartotece wczytuje ja, zmienia swoje pola i zapisuje
 * calosc, nadpisujac wpisy dodane w miedzyczasie.
 *
 * Wzor dla pojedynczego plakatu: master + ramka + packshot + salon.
 *
 *   node scripts/odtworzMockupy.js            — proba
 *   node scripts/odtworzMockupy.js --wykonaj  — zapis
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const rel = (abs) => norm(path.relative(ROOT, abs));

const zapis = process.argv.includes('--wykonaj');
const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

let uzupelnione = 0;
let juzMialy = 0;
let brakPlikow = 0;
const przyklady = [];

for (const p of inv.posters || []) {
  if (p.kind === 'set') continue; // zestawy maja wlasny komplet wizualizacji
  const ip = norm(p.imagePath);
  if (!ip) continue;

  const dir = path.join(ROOT, path.dirname(ip));
  const base = path.basename(ip, path.extname(ip));
  if (!fs.existsSync(dir)) continue;

  const frameAbs = path.join(dir, base + '_mockup_frame.jpg');
  const interiorAbs = path.join(dir, base + '_mockup_interior.jpg');
  const maFrame = fs.existsSync(frameAbs);
  const maInterior = fs.existsSync(interiorAbs);

  if (!maFrame && !maInterior) { brakPlikow++; continue; }

  const mk = p.mockups || {};
  const trzebaFrame = maFrame && (!mk.frame || !fs.existsSync(path.join(ROOT, norm(mk.frame))));
  const trzebaInterior = maInterior && (!mk.interior || !fs.existsSync(path.join(ROOT, norm(mk.interior))));

  if (!trzebaFrame && !trzebaInterior) { juzMialy++; continue; }

  if (przyklady.length < 6) przyklady.push(p.title);
  uzupelnione++;

  if (zapis) {
    p.mockups = {
      ...mk,
      ...(maFrame ? { frame: rel(frameAbs) } : {}),
      ...(maInterior ? { interior: rel(interiorAbs) } : {}),
      generatedAt: mk.generatedAt || new Date().toISOString(),
    };
  }
}

console.log('plakatow z kompletem wpisow:      ' + juzMialy);
console.log('plakatow BEZ plikow mockupow:     ' + brakPlikow);
console.log('do uzupelnienia (pliki sa):       ' + uzupelnione);
if (przyklady.length) {
  console.log('');
  przyklady.forEach((t) => console.log('   ' + t));
  if (uzupelnione > przyklady.length) console.log('   ... i ' + (uzupelnione - przyklady.length) + ' wiecej');
}

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dopisz --wykonaj.');
  process.exit(0);
}

fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
console.log('');
console.log('Kartoteka zapisana.');
