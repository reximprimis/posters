/**
 * Naprawa sciezek, ktorych migracja katalogow nie przepisala.
 *
 * Mapa przeniesien porownywala sciezki DOKLADNIE, a czesc pol w kartotece
 * zapisana byla z inna wielkoscia liter w segmencie stylu ("Photography"
 * zamiast "photography"). Windows otwiera takie pliki mimo roznicy, wiec blad
 * byl niewidoczny do czasu migracji — po niej pole wskazywalo stara lokalizacje,
 * bo nie pasowalo do zadnego klucza mapy.
 *
 * Skrypt szuka pliku po SAMEJ NAZWIE w katalogu plakatu i podmienia sciezke.
 * Nie tworzy ani nie usuwa zadnych plikow.
 *
 *   node scripts/naprawSciezkiPoMigracji.js            — proba
 *   node scripts/naprawSciezkiPoMigracji.js --wykonaj  — zapis
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').replace(/\\/g, '/');

/** Buduje indeks: nazwa pliku (male litery) -> lista sciezek wzglednych. */
function indeksPlikow() {
  const idx = new Map();
  (function przejdz(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        przejdz(abs);
        continue;
      }
      const klucz = e.name.toLowerCase();
      if (!idx.has(klucz)) idx.set(klucz, []);
      idx.get(klucz).push(norm(path.relative(ROOT, abs)));
    }
  })(path.join(ROOT, 'posters'));
  return idx;
}

(function main() {
  const zapis = process.argv.includes('--wykonaj');
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const idx = indeksPlikow();

  let naprawione = 0;
  let nieznalezione = 0;
  const przyklady = [];

  const napraw = (wartosc) => {
    const rel = norm(wartosc);
    if (!rel) return wartosc;
    if (fs.existsSync(path.join(ROOT, rel))) return wartosc;

    const kandydaci = idx.get(path.basename(rel).toLowerCase()) || [];
    // Jednoznaczne dopasowanie albo nic — przy kilku plikach o tej samej nazwie
    // w roznych kategoriach zgadywanie moglo by podmienic plakat na inny.
    if (kandydaci.length !== 1) {
      nieznalezione++;
      return wartosc;
    }
    naprawione++;
    if (przyklady.length < 5) przyklady.push(rel + '\n      -> ' + kandydaci[0]);
    return kandydaci[0];
  };

  for (const p of inv.posters || []) {
    for (const pole of ['imagePath', 'imagePathThumb', 'imagePathFramed', 'imagePathFramedThumb', 'imagePathLifestyle']) {
      if (p[pole]) p[pole] = napraw(p[pole]);
    }
    for (const grupa of ['pdfPaths', 'pdfPathsFramed']) {
      if (p[grupa] && typeof p[grupa] === 'object') {
        for (const k of Object.keys(p[grupa])) p[grupa][k] = napraw(p[grupa][k]);
      }
    }
    if (Array.isArray(p.pdfs)) p.pdfs = p.pdfs.map(napraw);
    if (p.mockups) {
      for (const k of ['frame', 'interior', 'interior2', 'sheets']) {
        if (p.mockups[k]) p.mockups[k] = napraw(p.mockups[k]);
      }
    }
    for (const panel of p.panels || []) {
      if (panel.imagePath) panel.imagePath = napraw(panel.imagePath);
      if (panel.pdfPaths) {
        for (const k of Object.keys(panel.pdfPaths)) panel.pdfPaths[k] = napraw(panel.pdfPaths[k]);
      }
    }
  }

  console.log('sciezek naprawionych:   ' + naprawione);
  console.log('nadal bez pliku:        ' + nieznalezione + '  (plik naprawde nie istnieje)');
  if (przyklady.length) {
    console.log('');
    console.log('przyklady:');
    przyklady.forEach((x) => console.log('   ' + x));
  }

  if (!zapis) {
    console.log('');
    console.log('To byla proba. Uruchom z --wykonaj, zeby zapisac.');
    return;
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  console.log('');
  console.log('Kartoteka zapisana.');
})();
