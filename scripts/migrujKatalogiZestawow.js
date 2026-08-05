/**
 * Przenosi zestawy do wlasnych katalogow — tak samo jak plakaty.
 *
 *   posters/_zestawy/Kategoria/styl/Tytul.png
 *   -> posters/_zestawy/Kategoria/styl/Tytul/Tytul.png
 *
 * Zestaw to kilkanascie plikow (panorama, panele, piec wizualizacji, a po
 * zatwierdzeniu 12-18 PDF-ow), wiec bez tego katalog stylu zapycha sie po
 * kilku zestawach.
 *
 *   node scripts/migrujKatalogiZestawow.js            — proba
 *   node scripts/migrujKatalogiZestawow.js --wykonaj  — przeniesienie
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').replace(/\\/g, '/');

const zapis = process.argv.includes('--wykonaj');
const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const zestawy = (inv.posters || []).filter((p) => p.kind === 'set');

let przeniesione = 0;
let pominiete = 0;

for (const z of zestawy) {
  const panorama = norm(z.imagePath);
  const dir = path.dirname(panorama);
  const base = path.basename(panorama, path.extname(panorama));

  // Juz w swoim katalogu?
  if (path.basename(dir) === base) {
    pominiete++;
    continue;
  }

  const nowyDir = path.join(dir, base).replace(/\\/g, '/');
  const absStary = path.join(ROOT, dir);
  const absNowy = path.join(ROOT, nowyDir);

  // Wszystkie pliki zestawu zaczynaja sie od jego nazwy bazowej.
  const pliki = fs.readdirSync(absStary, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.startsWith(base))
    .map((e) => e.name);

  console.log(z.title);
  console.log('  ' + dir.replace('posters/_zestawy/', '') + '  ->  ' + base + '/   (' + pliki.length + ' plikow)');

  if (!zapis) continue;

  fs.mkdirSync(absNowy, { recursive: true });
  const mapa = {};
  for (const nazwa of pliki) {
    const zZ = path.join(absStary, nazwa);
    const doD = path.join(absNowy, nazwa);
    fs.renameSync(zZ, doD);
    mapa[norm(path.join(dir, nazwa))] = norm(path.join(nowyDir, nazwa));
  }

  // Przepisanie sciezek w rekordzie
  const podmien = (v) => {
    const k = norm(v);
    return mapa[k] || v;
  };
  z.imagePath = podmien(z.imagePath);
  if (z.imagePathThumb) z.imagePathThumb = podmien(z.imagePathThumb);
  if (z.mockups) {
    for (const k of ['frame', 'interior', 'interior2', 'sheets']) {
      if (z.mockups[k]) z.mockups[k] = podmien(z.mockups[k]);
    }
  }
  for (const panel of z.panels || []) {
    if (panel.imagePath) panel.imagePath = podmien(panel.imagePath);
    if (panel.pdfPaths) {
      for (const k of Object.keys(panel.pdfPaths)) panel.pdfPaths[k] = podmien(panel.pdfPaths[k]);
    }
  }
  przeniesione++;
}

console.log('');
console.log('zestawow do przeniesienia: ' + (zestawy.length - pominiete));
console.log('juz w swoich katalogach:   ' + pominiete);

if (!zapis) {
  console.log('');
  console.log('To byla proba. Uruchom z --wykonaj, zeby przeniesc.');
  process.exit(0);
}

fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
console.log('przeniesionych: ' + przeniesione + ', kartoteka zapisana.');
