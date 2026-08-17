/**
 * Przenosi DANE na nowa taksonomie: katalogi, kartoteke i sidecary .meta.json.
 *
 * Kolejnosc ma znaczenie i jest scisla:
 *   1. przenosimy katalogi na dysku (posters/ i shopify_thumbs/),
 *   2. przepisujemy sciezki w kartotece,
 *   3. przepisujemy sidecary,
 *   4. tlumaczymy pomieszczenia na angielskie klucze.
 *
 * UWAGA NA CDN: shopify_thumbs/ jest serwowany przez jsDelivr z tego repo,
 * wiec zmiana nazwy katalogu UNIEWAZNIA dotychczasowe adresy zdjec. To jest
 * zamierzone — CSV wygenerowany po migracji bedzie mial nowe adresy — ale
 * oznacza, ze produkty juz stojace w sklepie strace zdjecia, dopoki nie
 * zaimportujesz nowego CSV.
 *
 * "Japonia" rozpada sie po tytule (patrz JAPONIA_ROZPISKA w taxonomy.js),
 * wiec jej plakaty trafiaja do roznych katalogow docelowych.
 *
 *   node scripts/migrujTaksonomieDane.js             — proba
 *   node scripts/migrujTaksonomieDane.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { legacyCategoryToKey, categorySlug, normalizeRooms, CATEGORIES } = require('../src/taxonomy');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const zapis = process.argv.includes('--wykonaj');

/**
 * Miejsca, w ktorych kolejny segment sciezki jest nazwa kategorii.
 * Zestawy maja wlasny podkatalog _zestawy i siedza o poziom glebiej.
 */
const KORZENIE = ['posters', 'shopify_thumbs'];
const KORZENIE_WSZYSTKIE = [
  'posters', 'shopify_thumbs',
  'posters/_zestawy', 'shopify_thumbs/_zestawy',
];

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

// --- 1. Jakie katalogi kategorii istnieja i dokad ida ----------------------
const mapaKatalogow = new Map(); // stary segment -> nowy slug

for (const korzen of KORZENIE_WSZYSTKIE) {
  const abs = path.join(ROOT, korzen);
  if (!fs.existsSync(abs)) continue;
  for (const wpis of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!wpis.isDirectory()) continue;
    if (wpis.name.startsWith('_')) continue; // _archiwum_meta itp.
    const klucz = legacyCategoryToKey(wpis.name);
    if (!klucz) continue;
    // "Japonia" nie ma jednego celu — jej pliki przenosimy per plakat nizej.
    if (wpis.name === 'Japonia') continue;
    mapaKatalogow.set(wpis.name, categorySlug(klucz));
  }
}

console.log('KATALOGI DO PRZENIESIENIA:');
for (const [stary, nowy] of mapaKatalogow) console.log('   ' + stary.padEnd(26) + ' -> ' + nowy);
if (!mapaKatalogow.size) console.log('   brak (juz po migracji?)');

// --- 2. Plakaty: nowa kategoria per rekord --------------------------------
const plakaty = inv.posters.filter((p) => p.kind !== 'set');
const zmianyKategorii = [];
let bezMapowania = 0;

for (const p of plakaty) {
  const nowa = legacyCategoryToKey(p.category, p.title);
  if (!nowa) {
    bezMapowania++;
    console.warn('   ! bez mapowania: ' + p.category + '  /  ' + p.title);
    continue;
  }
  if (nowa !== p.category) zmianyKategorii.push({ p, stara: p.category, nowa });
}

const jap = zmianyKategorii.filter((z) => z.stara === 'Japonia');
console.log('');
console.log('KATEGORIE W KARTOTECE: ' + zmianyKategorii.length + ' rekordow do zmiany'
  + (bezMapowania ? ',  BEZ MAPOWANIA: ' + bezMapowania : ''));
if (jap.length) {
  console.log('   "Japonia" rozdzielona po tytule:');
  jap.forEach((z) => console.log('      ' + z.p.title.padEnd(28) + ' -> ' + z.nowa));
}

// --- 3. Pomieszczenia -----------------------------------------------------
let zPokojami = 0;
for (const p of inv.posters) {
  if (!Array.isArray(p.roomCollections) || !p.roomCollections.length) continue;
  const nowe = normalizeRooms(p.roomCollections);
  if (nowe.join('|') !== p.roomCollections.join('|')) zPokojami++;
}
console.log('');
console.log('POMIESZCZENIA: ' + zPokojami + ' rekordow do przetlumaczenia (mojibake sklejany po drodze)');

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby wykonac.');
  process.exit(0);
}

// ======================= WYKONANIE =======================================

// 3a. Katalogi. Przenosimy zawartosc, a nie sam katalog, bo cel moze juz
//     istniec (np. dwie stare kategorie ida w jedna nowa).
function przeniesZawartosc(zrodlo, cel) {
  fs.mkdirSync(cel, { recursive: true });
  for (const wpis of fs.readdirSync(zrodlo, { withFileTypes: true })) {
    const zA = path.join(zrodlo, wpis.name);
    const cA = path.join(cel, wpis.name);
    if (wpis.isDirectory()) {
      przeniesZawartosc(zA, cA);
      try { fs.rmdirSync(zA); } catch (_) {}
    } else if (!fs.existsSync(cA)) {
      fs.renameSync(zA, cA);
    }
  }
}

let przeniesionych = 0;
for (const korzen of KORZENIE_WSZYSTKIE) {
  for (const [stary, nowy] of mapaKatalogow) {
    const zrodlo = path.join(ROOT, korzen, stary);
    if (!fs.existsSync(zrodlo)) continue;
    przeniesZawartosc(zrodlo, path.join(ROOT, korzen, nowy));
    try { fs.rmdirSync(zrodlo); } catch (_) {}
    przeniesionych++;
  }
}

/**
 * Podmienia segment kategorii w sciezce.
 *
 * UWAGA: zestawy leza o jeden poziom glebiej — posters/_zestawy/<Kategoria>/...
 * — wiec kategoria jest tam DRUGIM segmentem, nie pierwszym. Bez tego warunku
 * podmiana trafialaby w "_zestawy" i rozwalala sciezki wszystkich zestawow.
 */
function przepiszSciezkeNaSlug(sciezka, nowySlug) {
  const s = norm(sciezka);
  if (!s) return sciezka;
  for (const korzen of KORZENIE) {
    const reZestaw = new RegExp('^(' + korzen + '/_zestawy/)([^/]+)/');
    if (reZestaw.test(s)) return s.replace(reZestaw, (_, pre) => pre + nowySlug + '/');
    const re = new RegExp('^(' + korzen + '/)([^/]+)/');
    if (re.test(s)) return s.replace(re, (_, pre) => pre + nowySlug + '/');
  }
  return s;
}

// 3b. "Japonia" — pliki ida per plakat, bo kazdy trafia gdzie indziej.
//     Musi sie wykonac PRZED przepisaniem sciezek w kartotece, bo korzysta
//     ze starych sciezek, zeby znalezc zrodlo.
let japPrzeniesionych = 0;
for (const z of jap) {
  const stara = norm(z.p.imagePath);
  const nowaSciezka = przepiszSciezkeNaSlug(stara, categorySlug(z.nowa));
  const zrodloKat = path.join(ROOT, path.dirname(stara));
  const celKat = path.join(ROOT, path.dirname(nowaSciezka));
  if (fs.existsSync(zrodloKat) && zrodloKat !== celKat) {
    przeniesZawartosc(zrodloKat, celKat);
    try { fs.rmdirSync(zrodloKat); } catch (_) {}
    japPrzeniesionych++;
  }
  // Miniatury tego plakatu w shopify_thumbs — ten sam ruch, inny korzen.
  const thumb = norm(z.p.imagePathThumb);
  if (thumb) {
    const zT = path.join(ROOT, path.dirname(thumb));
    const cT = path.join(ROOT, path.dirname(przepiszSciezkeNaSlug(thumb, categorySlug(z.nowa))));
    if (fs.existsSync(zT) && zT !== cT) przeniesZawartosc(zT, cT);
  }
}

// 3c. Sciezki w kartotece. Podmieniamy pierwszy segment po korzeniu.
const POLA_SCIEZEK = [
  'imagePath', 'imagePathThumb', 'imagePathFramed', 'imagePathFramedThumb', 'imagePathLifestyle',
];


function przepiszRekord(p, nowySlug) {
  for (const pole of POLA_SCIEZEK) {
    if (p[pole]) p[pole] = przepiszSciezkeNaSlug(p[pole], nowySlug);
  }
  for (const mapa of ['pdfPaths', 'pdfPathsFramed']) {
    if (p[mapa] && typeof p[mapa] === 'object') {
      for (const k of Object.keys(p[mapa])) {
        if (typeof p[mapa][k] === 'string') p[mapa][k] = przepiszSciezkeNaSlug(p[mapa][k], nowySlug);
      }
    }
  }
  // Zestawy trzymaja sciezki takze w panelach — bez tego dyptyk zgubilby
  // swoje polowki, a kartoteka wygladalaby na poprawna.
  if (Array.isArray(p.panels)) {
    for (const panel of p.panels) {
      if (typeof panel.imagePath === 'string') panel.imagePath = przepiszSciezkeNaSlug(panel.imagePath, nowySlug);
      if (panel.pdfPaths && typeof panel.pdfPaths === 'object') {
        for (const k of Object.keys(panel.pdfPaths)) {
          if (typeof panel.pdfPaths[k] === 'string') {
            panel.pdfPaths[k] = przepiszSciezkeNaSlug(panel.pdfPaths[k], nowySlug);
          }
        }
      }
    }
  }
  if (p.mockups && typeof p.mockups === 'object') {
    for (const k of ['frame', 'interior', 'interior2', 'stack', 'sheets']) {
      if (typeof p.mockups[k] === 'string') p.mockups[k] = przepiszSciezkeNaSlug(p.mockups[k], nowySlug);
    }
  }
}

for (const p of inv.posters) {
  const nowa = legacyCategoryToKey(p.category, p.title);
  if (!nowa) continue;
  przepiszRekord(p, categorySlug(nowa));
  p.category = nowa;
  if (Array.isArray(p.roomCollections)) p.rooms = normalizeRooms(p.roomCollections);
}

// 3d. Sidecary .meta.json. Trzymaja wlasna kopie kategorii i sciezek, wiec
//     bez tego kroku rozjechalyby sie z kartoteka. Ida juz po przeniesieniu
//     katalogow, wiec szukamy ich w nowych lokalizacjach.
let sidecarow = 0;
function przejdz(katalog) {
  if (!fs.existsSync(katalog)) return;
  for (const wpis of fs.readdirSync(katalog, { withFileTypes: true })) {
    const abs = path.join(katalog, wpis.name);
    if (wpis.isDirectory()) { przejdz(abs); continue; }
    if (!wpis.name.endsWith('.meta.json')) continue;
    let dane;
    try { dane = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (_) { continue; }
    const nowa = legacyCategoryToKey(dane.category, dane.title);
    if (!nowa) continue;
    let zmienione = false;
    if (dane.category !== nowa) { dane.category = nowa; zmienione = true; }
    for (const pole of ['imagePath', 'imagePathRel', 'inventoryPath']) {
      if (typeof dane[pole] === 'string') {
        const nowaS = przepiszSciezkeNaSlug(dane[pole], categorySlug(nowa));
        if (nowaS !== dane[pole]) { dane[pole] = nowaS; zmienione = true; }
      }
    }
    if (zmienione) {
      fs.writeFileSync(abs, JSON.stringify(dane, null, 2), 'utf8');
      sidecarow++;
    }
  }
}
przejdz(path.join(ROOT, 'posters'));

fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');

console.log('');
console.log('Przeniesionych katalogow: ' + przeniesionych
  + (japPrzeniesionych ? ',  plakatow z "Japonii": ' + japPrzeniesionych : ''));
console.log('Poprawionych sidecarow .meta.json: ' + sidecarow);
console.log('Kartoteka zapisana.');
