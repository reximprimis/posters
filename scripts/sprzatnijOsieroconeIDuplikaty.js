/**
 * Higiena kartoteki — dwie rzeczy, ktorych usunPlakaty.js nie zalatwi:
 *
 *   1. rekordy bez pliku na dysku (zostaly po wczesniejszych czystkach),
 *   2. duplikaty: dwa rekordy wskazujace na identyczna zawartosc obrazu.
 *
 * Duplikatow nie da sie usunac po tytule, bo obie kopie maja ten sam tytul —
 * dlatego wybor idzie po indeksie w kartotece: zostaje pierwszy, leci drugi.
 * Plik drugiego rekordu kasujemy tylko wtedy, gdy nie wskazuje na niego
 * zaden inny rekord.
 *
 *   node scripts/sprzatnijOsieroconeIDuplikaty.js             — proba
 *   node scripts/sprzatnijOsieroconeIDuplikaty.js --wykonaj   — usuniecie
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const zapis = process.argv.includes('--wykonaj');

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

const doUsuniecia = new Set(); // indeksy w inv.posters
const plikiDoUsuniecia = new Set();

// --- 1. Osierocone rekordy ------------------------------------------------
console.log('OSIEROCONE (rekord bez pliku):');
let osierocone = 0;
inv.posters.forEach((p, i) => {
  if (p.kind === 'set') return;
  const ip = norm(p.imagePath);
  if (!ip || fs.existsSync(path.join(ROOT, ip))) return;
  console.log('   ' + p.title + '   (' + p.category + ')');
  doUsuniecia.add(i);
  osierocone++;
});
if (!osierocone) console.log('   brak');

// --- 2. Duplikaty ---------------------------------------------------------
console.log('');
console.log('DUPLIKATY (identyczna zawartosc obrazu):');
const wgSumy = new Map();
inv.posters.forEach((p, i) => {
  if (p.kind === 'set' || doUsuniecia.has(i)) return;
  const abs = path.join(ROOT, norm(p.imagePath));
  if (!fs.existsSync(abs)) return;
  const suma = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
  if (!wgSumy.has(suma)) wgSumy.set(suma, []);
  wgSumy.get(suma).push(i);
});

let duplikaty = 0;
for (const [, indeksy] of wgSumy) {
  if (indeksy.length < 2) continue;
  const [zostaje, ...leca] = indeksy;
  console.log('   zostaje: ' + inv.posters[zostaje].title + '  (' + norm(inv.posters[zostaje].imagePath) + ')');
  for (const i of leca) {
    console.log('   LECI:    ' + inv.posters[i].title + '  (' + norm(inv.posters[i].imagePath) + ')');
    doUsuniecia.add(i);
    duplikaty++;
  }
}
if (!duplikaty) console.log('   brak');

// --- Pliki duplikatow -----------------------------------------------------
// Kasujemy katalog plakatu tylko wtedy, gdy jest jego wlasnym katalogiem
// i zaden zostajacy rekord z niego nie korzysta.
const sciezkiZostajacych = new Set(
  inv.posters.filter((_, i) => !doUsuniecia.has(i)).map((p) => norm(p.imagePath))
);

for (const i of doUsuniecia) {
  const ip = norm(inv.posters[i].imagePath);
  if (!ip || !fs.existsSync(path.join(ROOT, ip))) continue;
  if (sciezkiZostajacych.has(ip)) continue; // ten sam plik trzyma inny rekord

  const dir = path.dirname(ip);
  const base = path.basename(ip, path.extname(ip));
  if (path.basename(dir) === base) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      plikiDoUsuniecia.add(path.join(dir, f).split('\\').join('/'));
    }
  } else {
    plikiDoUsuniecia.add(ip);
  }
}

console.log('');
console.log('rekordow do usuniecia: ' + doUsuniecia.size +
  ',  plikow do usuniecia: ' + plikiDoUsuniecia.size);

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby usunac.');
  process.exit(0);
}

for (const f of plikiDoUsuniecia) {
  const abs = path.join(ROOT, f);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}
// Puste katalogi po plakacie zabieramy razem z nim.
for (const f of plikiDoUsuniecia) {
  const dir = path.join(ROOT, path.dirname(f));
  if (fs.existsSync(dir) && !fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

inv.posters = inv.posters.filter((_, i) => !doUsuniecia.has(i));
fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
console.log('');
console.log('Usuniete. W kartotece zostalo: ' + inv.posters.length);
