/**
 * Migracja struktury katalogow: kazdy plakat dostaje WLASNY katalog.
 *
 *   posters/Kategoria/styl/Tytul_30x40.pdf
 *   -> posters/Kategoria/styl/Tytul/Tytul_30x40.pdf
 *
 * Nazwy plikow ZOSTAJA pelne (decyzja uzytkownika): katalog daje porzadek,
 * a nazwa nadal identyfikuje plik po wyslaniu do drukarni czy wypakowaniu
 * z archiwum.
 *
 * shopify_thumbs/ NIE JEST RUSZANY. Sklep linkuje zdjecia przez jsDelivr
 * wprost z tego katalogu w repo — zmiana sciezek unieruchomilaby ponad
 * 2000 zdjec w zywym sklepie do czasu ponownego importu CSV.
 *
 *   node scripts/migrujKatalogiPlakatow.js            — proba, nic nie zmienia
 *   node scripts/migrujKatalogiPlakatow.js --wykonaj  — faktyczne przeniesienie
 *   node scripts/migrujKatalogiPlakatow.js --cofnij   — przywrocenie z mapy
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTERS = path.join(ROOT, 'posters');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const MAPA = path.join(ROOT, 'migracja_katalogow_mapa.json');

const rel = (abs) => path.relative(ROOT, abs).replace(/\\/g, '/');

/** Sciezki w kartotece bywaja z backslashem i z ukosnikiem — porownujemy jedna forma. */
function norm(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Zbiera bazowe nazwy plakatow z KARTOTEKI, nie z nazw plikow na dysku.
 * Kartoteka jest zrodlem prawdy o tym, co jest plakatem — katalog moze
 * zawierac pliki poboczne, ktorych nie chcemy nikomu przypisac.
 */
function zbierzBazy(inv) {
  const wg = new Map(); // katalog -> [{ base, rekord }]
  for (const p of inv.posters || []) {
    const ip = norm(p.imagePath);
    if (!ip.startsWith('posters/')) continue;
    // Zestawy leza w katalogach z podkreslnikiem i maja wlasna strukture panelow.
    if (p.kind === 'set') continue;
    const dir = path.dirname(ip);
    const base = path.basename(ip, path.extname(ip));
    if (!wg.has(dir)) wg.set(dir, []);
    wg.get(dir).push({ base, rekord: p });
  }
  return wg;
}

function planuj(inv) {
  const wg = zbierzBazy(inv);
  const ruchy = [];
  const problemy = [];

  for (const [dirRel, wpisy] of wg) {
    const dirAbs = path.join(ROOT, dirRel);
    if (!fs.existsSync(dirAbs)) {
      problemy.push(`brak katalogu: ${dirRel}`);
      continue;
    }
    const pliki = fs.readdirSync(dirAbs, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);

    // NAJDLUZSZA pasujaca baza wygrywa. Inaczej przy plakatach "Sunset"
    // i "Sunset_Beach" pliki tego drugiego trafilyby do katalogu pierwszego.
    const bazy = wpisy.map((w) => w.base).sort((a, b) => b.length - a.length);

    for (const nazwa of pliki) {
      const baza = bazy.find((b) => nazwa === b + path.extname(nazwa) || nazwa.startsWith(b + '_'));
      if (!baza) {
        problemy.push(`plik bez plakatu: ${dirRel}/${nazwa}`);
        continue;
      }
      ruchy.push({
        z: path.join(dirRel, nazwa).replace(/\\/g, '/'),
        do: path.join(dirRel, baza, nazwa).replace(/\\/g, '/'),
      });
    }
  }
  return { ruchy, problemy };
}

/** Przepisuje kazda sciezke w rekordach wedlug mapy przeniesien. */
function przepiszKartoteke(inv, mapa) {
  let zmian = 0;
  const podmien = (v) => {
    const k = norm(v);
    if (mapa[k]) {
      zmian++;
      return mapa[k];
    }
    return v;
  };

  for (const p of inv.posters || []) {
    if (p.kind === 'set') continue;
    if (p.imagePath) p.imagePath = podmien(p.imagePath);
    for (const pole of ['imagePathThumb', 'imagePathFramed', 'imagePathFramedThumb', 'imagePathLifestyle']) {
      if (p[pole]) p[pole] = podmien(p[pole]);
    }
    if (p.pdfPaths && typeof p.pdfPaths === 'object') {
      for (const k of Object.keys(p.pdfPaths)) p.pdfPaths[k] = podmien(p.pdfPaths[k]);
    }
    if (p.pdfPathsFramed && typeof p.pdfPathsFramed === 'object') {
      for (const k of Object.keys(p.pdfPathsFramed)) p.pdfPathsFramed[k] = podmien(p.pdfPathsFramed[k]);
    }
    if (Array.isArray(p.pdfs)) p.pdfs = p.pdfs.map(podmien);
    if (p.mockups && typeof p.mockups === 'object') {
      for (const k of ['frame', 'interior', 'interior2', 'sheets']) {
        if (p.mockups[k]) p.mockups[k] = podmien(p.mockups[k]);
      }
    }
  }
  return zmian;
}

function wykonaj(ruchy) {
  const mapa = {};
  let przeniesione = 0;
  for (const r of ruchy) {
    const zAbs = path.join(ROOT, r.z);
    const doAbs = path.join(ROOT, r.do);
    if (!fs.existsSync(zAbs)) continue;
    fs.mkdirSync(path.dirname(doAbs), { recursive: true });
    fs.renameSync(zAbs, doAbs);
    mapa[r.z] = r.do;
    przeniesione++;
  }
  return { mapa, przeniesione };
}

function cofnij() {
  if (!fs.existsSync(MAPA)) {
    console.error('Brak pliku mapy — nie ma czego cofac.');
    process.exit(1);
  }
  const { mapa } = JSON.parse(fs.readFileSync(MAPA, 'utf8'));
  let ile = 0;
  for (const [z, doo] of Object.entries(mapa)) {
    const doAbs = path.join(ROOT, doo);
    const zAbs = path.join(ROOT, z);
    if (!fs.existsSync(doAbs)) continue;
    fs.mkdirSync(path.dirname(zAbs), { recursive: true });
    fs.renameSync(doAbs, zAbs);
    ile++;
  }
  console.log(`Cofnieto ${ile} plikow. Kartoteke przywroc z gita lub uruchom migracje ponownie.`);
}

(function main() {
  const tryb = process.argv.includes('--wykonaj') ? 'wykonaj'
    : process.argv.includes('--cofnij') ? 'cofnij'
    : 'proba';

  if (tryb === 'cofnij') return cofnij();

  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const { ruchy, problemy } = planuj(inv);

  const katalogi = new Set(ruchy.map((r) => path.dirname(r.do)));
  console.log(`Plakatow do rozdzielenia: ${katalogi.size}`);
  console.log(`Plikow do przeniesienia:  ${ruchy.length}`);
  console.log(`shopify_thumbs:           NIE RUSZANY (linkuje go sklep)`);

  if (problemy.length) {
    console.log('');
    console.log(`Pliki bez dopasowania (${problemy.length}) — zostana na miejscu:`);
    problemy.slice(0, 10).forEach((p) => console.log('  ' + p));
    if (problemy.length > 10) console.log(`  ... i ${problemy.length - 10} wiecej`);
  }

  if (tryb === 'proba') {
    console.log('');
    console.log('PRZYKLADY:');
    ruchy.slice(0, 4).forEach((r) => console.log(`  ${r.z}\n    -> ${r.do}`));
    console.log('');
    console.log('To byla proba. Uruchom z --wykonaj, zeby przeniesc.');
    return;
  }

  const { mapa, przeniesione } = wykonaj(ruchy);
  const zmian = przepiszKartoteke(inv, mapa);
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  fs.writeFileSync(MAPA, JSON.stringify({ utworzono: new Date().toISOString(), mapa }, null, 2), 'utf8');

  console.log('');
  console.log(`Przeniesiono plikow:        ${przeniesione}`);
  console.log(`Sciezek w kartotece:        ${zmian}`);
  console.log(`Mapa do cofniecia:          ${rel(MAPA)}`);
})();
