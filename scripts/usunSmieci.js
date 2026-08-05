/**
 * Usuwa pliki, ktore na pewno sa smieciami:
 *
 *  1. pozostalosci po przerwanym generowaniu (nazwa z "tmpmulti" / "_tmp"),
 *  2. osierocone pliki .meta.json — takie, obok ktorych NIE MA plakatu
 *     znanego kartotece.
 *
 * Celowo NIE rusza niczego innego. Przy sprzataniu tego katalogu trzy kolejne
 * proby klasyfikacji okazaly sie bledne: "smieci" bywaly plikami zatwierdzonych
 * produktow, a 98 ze 103 plikow .meta.json nalezy do zywych plakatow.
 *
 *   node scripts/usunSmieci.js            — proba
 *   node scripts/usunSmieci.js --wykonaj  — usuniecie
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').replace(/\\/g, '/');

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

/** Wszystkie sciezki, ktore kartoteka gdziekolwiek wymienia. */
const znane = new Set();
const znanePng = new Set();
for (const p of inv.posters || []) {
  const d = (v) => { if (v) znane.add(norm(v).toLowerCase()); };
  d(p.imagePath);
  znanePng.add(norm(p.imagePath).toLowerCase());
  ['imagePathThumb', 'imagePathFramed', 'imagePathFramedThumb', 'imagePathLifestyle'].forEach((k) => d(p[k]));
  Object.values(p.pdfPaths || {}).forEach(d);
  Object.values(p.pdfPathsFramed || {}).forEach(d);
  (p.pdfs || []).forEach(d);
  if (p.mockups) ['frame', 'interior', 'interior2', 'sheets'].forEach((k) => d(p.mockups[k]));
  (p.panels || []).forEach((pan) => { d(pan.imagePath); Object.values(pan.pdfPaths || {}).forEach(d); });
}

const doUsuniecia = [];

(function przejdz(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, e.name);
    if (e.isDirectory()) { przejdz(absPath); continue; }

    const rel = norm(path.relative(ROOT, absPath));
    // Cokolwiek kartoteka wymienia — zostaje, bez dyskusji.
    if (znane.has(rel.toLowerCase())) continue;

    const rozmiar = fs.statSync(absPath).size;

    if (/tmpmulti|_tmp[._]/i.test(e.name)) {
      doUsuniecia.push({ rel, rozmiar, powod: 'plik tymczasowy' });
      continue;
    }

    if (/\.meta\.json$/i.test(e.name)) {
      const baza = e.name.replace(/\.meta\.json$/i, '');
      const relDir = norm(path.dirname(rel));
      // Plakat moze lezec obok (stary uklad) albo we wlasnym katalogu (nowy).
      const obok = (relDir + '/' + baza + '.png').toLowerCase();
      const wKatalogu = (relDir + '/' + baza + '/' + baza + '.png').toLowerCase();
      if (!znanePng.has(obok) && !znanePng.has(wKatalogu)) {
        doUsuniecia.push({ rel, rozmiar, powod: 'metadane bez plakatu' });
      }
    }
  }
})(path.join(ROOT, 'posters'));

const suma = doUsuniecia.reduce((a, x) => a + x.rozmiar, 0);
console.log('DO USUNIECIA: ' + doUsuniecia.length + ' plikow, ' + (suma / 1024 / 1024).toFixed(1) + ' MB');
console.log('');
doUsuniecia.forEach((x) =>
  console.log('  ' + String((x.rozmiar / 1024 / 1024).toFixed(1) + ' MB').padStart(9) + '  ' +
    x.powod.padEnd(22) + x.rel.replace('posters/', ''))
);

if (!process.argv.includes('--wykonaj')) {
  console.log('');
  console.log('To byla proba. Uruchom z --wykonaj, zeby usunac.');
  process.exit(0);
}

// Metadane sa ARCHIWIZOWANE, nie kasowane. Wazą kilka kilobajtow, a zawieraja
// prompt uzyty do wygenerowania plakatu — bywa wart odtworzenia, nawet gdy
// samej grafiki juz nie ma. Katalog zaczyna sie od podkreslenia, wiec skaner
// biblioteki go pomija.
const ARCHIWUM = path.join(ROOT, 'posters', '_archiwum_meta');

let usuniete = 0;
let zarchiwizowane = 0;

for (const x of doUsuniecia) {
  const zrodlo = path.join(ROOT, x.rel);
  try {
    if (x.powod === 'metadane bez plakatu') {
      const cel = path.join(ARCHIWUM, x.rel.replace(/^posters\//, ''));
      fs.mkdirSync(path.dirname(cel), { recursive: true });
      fs.renameSync(zrodlo, cel);
      zarchiwizowane++;
    } else {
      fs.unlinkSync(zrodlo);
      usuniete++;
    }
  } catch (err) {
    console.warn('  nie udalo sie: ' + x.rel + ' — ' + err.message);
  }
}

console.log('');
console.log('Usunieto (pliki tymczasowe):     ' + usuniete);
console.log('Zarchiwizowano (metadane):       ' + zarchiwizowane + '  -> posters/_archiwum_meta/');
