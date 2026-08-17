/**
 * Usuwa plakaty z kartoteki RAZEM z ich plikami.
 *
 * Nie rusza sklepu — produkty w Shopify trzeba usunac osobno, po stronie sklepu.
 * Nie rusza tez shopify_thumbs/: te pliki serwuje CDN i dopoki produkt istnieje
 * w sklepie, jego zdjecia musza dzialac.
 *
 *   node scripts/usunPlakaty.js "Tytul 1" "Tytul 2"            — proba
 *   node scripts/usunPlakaty.js "Tytul 1" "Tytul 2" --wykonaj  — usuniecie
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');

const zapis = process.argv.includes('--wykonaj');
const tytuly = process.argv.slice(2).filter((a) => a !== '--wykonaj');

if (!tytuly.length) {
  console.error('Podaj tytuly plakatow do usuniecia.');
  process.exit(1);
}

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const doUsuniecia = [];
const nieznalezione = [];

for (const t of tytuly) {
  const rek = inv.posters.find((p) => (p.title || '').trim() === t.trim());
  if (!rek) nieznalezione.push(t);
  else doUsuniecia.push(rek);
}

if (nieznalezione.length) {
  console.log('NIE ZNALEZIONO w kartotece:');
  nieznalezione.forEach((t) => console.log('   ' + t));
  console.log('');
}

let bajty = 0;
const plikiRazem = [];

for (const rek of doUsuniecia) {
  // Katalog plakatu — po migracji kazdy ma wlasny, wiec usuwamy calosc.
  const ip = norm(rek.imagePath);
  const dir = path.dirname(ip);
  const base = path.basename(ip, path.extname(ip));
  const wlasnyKatalog = path.basename(dir) === base;

  const pliki = [];
  if (wlasnyKatalog && fs.existsSync(path.join(ROOT, dir))) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      pliki.push(path.join(dir, f).split('\\').join('/'));
    }
  } else {
    // Stary uklad: zbieramy po nazwie bazowej.
    const abs = path.join(ROOT, dir);
    if (fs.existsSync(abs)) {
      for (const f of fs.readdirSync(abs)) {
        if (f.startsWith(base)) pliki.push(path.join(dir, f).split('\\').join('/'));
      }
    }
  }

  for (const f of pliki) {
    const a = path.join(ROOT, f);
    if (fs.existsSync(a)) bajty += fs.statSync(a).size;
  }

  console.log(rek.title + '   (' + pliki.length + ' plikow)');
  plikiRazem.push({ rek, pliki, katalog: wlasnyKatalog ? dir : null });
}

console.log('');
console.log('plakatow: ' + doUsuniecia.length + ',  plikow: ' +
  plikiRazem.reduce((a, x) => a + x.pliki.length, 0) +
  ',  ' + (bajty / 1024 / 1024).toFixed(0) + ' MB');
console.log('');
console.log('shopify_thumbs NIE jest ruszany — dopoki produkt istnieje w sklepie,');
console.log('jego zdjecia musza dzialac. Produkty usun po stronie Shopify.');

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dopisz --wykonaj, zeby usunac.');
  process.exit(0);
}

let usunietePliki = 0;
for (const { rek, pliki, katalog } of plikiRazem) {
  for (const f of pliki) {
    try {
      fs.unlinkSync(path.join(ROOT, f));
      usunietePliki++;
    } catch (e) {
      console.warn('  nie udalo sie: ' + f);
    }
  }
  if (katalog) {
    try {
      const abs = path.join(ROOT, katalog);
      if (fs.existsSync(abs) && fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
    } catch (e) {
      /* zostaje */
    }
  }
  const i = inv.posters.indexOf(rek);
  if (i >= 0) inv.posters.splice(i, 1);
}

fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
console.log('');
console.log('Usunieto plikow: ' + usunietePliki);
console.log('Rekordow w kartotece: ' + inv.posters.length);
