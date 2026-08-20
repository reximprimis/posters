/**
 * Usuwa wskazane zestawy: rekord z kartoteki, katalog z plikami i kopie
 * w shopify_thumbs.
 *
 * Zestaw nie da sie usunac przez /api/posters/remove tak jak plakat: jego
 * imagePath wskazuje panorame, a pliki galerii (kaskada, arkusze, packshot,
 * salony, panele z PDF-ami) leza obok pod nazwami pochodzacymi od tytulu.
 * Kasowanie po samym imagePath zostawialoby wiekszosc smieci.
 *
 *   node scripts/usunZestawy.js "Tytul A" "Tytul B"
 *   node scripts/usunZestawy.js --wykonaj "Tytul A" "Tytul B"
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const THUMBS = path.join(ROOT, 'shopify_thumbs');
const norm = (p) => String(p || '').split('\\').join('/');

const argumenty = process.argv.slice(2);
const zapis = argumenty.includes('--wykonaj');
const tytuly = argumenty.filter((a) => a !== '--wykonaj');

if (!tytuly.length) {
  console.error('Podaj tytuly zestawow do usuniecia.');
  process.exit(1);
}

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const plan = [];

for (const tytul of tytuly) {
  const rekord = inv.posters.find((p) => p.kind === 'set' && p.title === tytul);
  if (!rekord) {
    // Zestaw moze istniec na dysku bez rekordu, gdy przebieg zostal przerwany
    // miedzy zapisem plikow a zapisem kartoteki.
    console.log('bez rekordu w kartotece: ' + tytul + ' — sprawdzam sam katalog');
    plan.push({ tytul, rekord: null, katalog: null });
    continue;
  }
  plan.push({
    tytul,
    rekord,
    katalog: path.join(ROOT, path.dirname(norm(rekord.imagePath))),
  });
}

// Katalogi bez rekordu trzeba znalezc po nazwie — szukamy w drzewie zestawow.
function znajdzKatalog(tytul) {
  const baza = path.join(ROOT, 'posters', '_zestawy');
  const szukana = tytul.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const stack = [baza];
  while (stack.length) {
    const cur = stack.pop();
    if (!fs.existsSync(cur)) continue;
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const abs = path.join(cur, e.name);
      if (e.name === szukana) return abs;
      stack.push(abs);
    }
  }
  return null;
}

for (const p of plan) {
  if (!p.katalog) p.katalog = znajdzKatalog(p.tytul);
}

console.log('');
for (const p of plan) {
  const pliki = p.katalog && fs.existsSync(p.katalog) ? fs.readdirSync(p.katalog).length : 0;
  console.log('  ' + p.tytul.padEnd(28) + 'rekord:' + (p.rekord ? 'tak' : 'nie ') +
    '  katalog:' + (p.katalog ? path.relative(ROOT, p.katalog) : 'BRAK') + '  plikow:' + pliki);
}

// Kopie w shopify_thumbs sa PLASKIE i nazwane od tytulu — zostawione
// wskazywalyby na produkt, ktorego juz nie ma.
const wThumbs = [];
if (fs.existsSync(THUMBS)) {
  const stack = [THUMBS];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) { stack.push(abs); continue; }
      for (const p of plan) {
        const szukana = p.tytul.replace(/[^A-Za-z0-9]+/g, '_');
        if (e.name.startsWith(szukana)) wThumbs.push(abs);
      }
    }
  }
}
console.log('');
console.log('plikow w shopify_thumbs do usuniecia: ' + wThumbs.length);

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby usunac.');
  process.exit(0);
}

const doUsuniecia = new Set(plan.filter((p) => p.rekord).map((p) => p.rekord.id));
const przed = inv.posters.length;
inv.posters = inv.posters.filter((p) => !doUsuniecia.has(p.id));
fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
console.log('');
console.log('rekordow usunietych: ' + (przed - inv.posters.length));

for (const p of plan) {
  if (p.katalog && fs.existsSync(p.katalog)) {
    fs.rmSync(p.katalog, { recursive: true, force: true });
    console.log('   katalog usuniety: ' + path.relative(ROOT, p.katalog));
  }
}
for (const f of wThumbs) {
  try { fs.unlinkSync(f); } catch (_) {}
}
console.log('   plikow z shopify_thumbs: ' + wThumbs.length);
