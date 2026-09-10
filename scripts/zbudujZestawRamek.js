/**
 * Buduje ZESTAW PLAKATOW I RAMEK z definicji: master (oprawiony), salon,
 * kopie PDF-ow do druku, LISTA RAM DO ZAPAKOWANIA, manifest produkcyjny
 * i rekord w kartotece.
 *
 * ROZNICA WOBEC zbudujGalerie.js (kind: 'gallery') jest fundamentalna, nie
 * kosmetyczna: tam rama jest wizualizacja, tu jest CZESCIA PRODUKTU — realny
 * SKU ze sklepu (src/ramkiKatalog.js), ktory trzeba fizycznie spakowac.
 * Dlatego:
 *   - MASTER pokazuje oprawione elementy (nie ma wariantu "bez ramy"),
 *   - manifest produkcyjny wymienia TEZ ramy do zapakowania, nie tylko PDF-y,
 *   - opis WOLNO (i trzeba) wspomniec rame — patrz src/galleryFramedDescription.js.
 *
 * PIERWSZY produkt w tej rodzinie zaklada SIATKE rownych elementow (2x2 dla
 * czterech) — patrz src/galleryFramedVisuals.js. Mieszane rozmiary jak
 * w zwyklym zestawie plakatow to inny uklad, do dodania pozniej.
 *
 *   node scripts/zbudujZestawRamek.js definicja.json             — proba
 *   node scripts/zbudujZestawRamek.js definicja.json --wykonaj   — zapis
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const BS = String.fromCharCode(92);
const norm = (p) => String(p || '').split(BS).join('/');
const abs = (p) => path.join(ROOT, norm(p));
const fileExists = (p) => !!p && fs.existsSync(abs(p));

const { cenaOsobno, cenaZestawu, sprawdzDefinicje } = require('../src/galerieRamek');
const { SIZE_PRICES } = require('../src/galerieScienne');
const { cenaRamy, opisRamy, handleRamy } = require('../src/ramkiKatalog');
const { toPosterHandle } = require('../src/posterTitle');
const { buildFramedGridRaw } = require('../src/galleryFramedVisuals');
const { buildFramedMasterAI } = require('../src/galleryFramedPackshotAI');
const { buildFramedInteriorAI } = require('../src/galleryFramedInteriorAI');
const { buildFramedDescription, findForbiddenTerms, NAZWY_MATERIALU, NAZWY_KOLORU } = require('../src/galleryFramedDescription');

const plikDef = process.argv[2];
const zapis = process.argv.includes('--wykonaj');
if (!plikDef) { console.error('Podaj plik definicji.'); process.exit(1); }

const def = JSON.parse(fs.readFileSync(path.resolve(plikDef), 'utf8'));
const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

const bledy = sprawdzDefinicje(def, inv, fileExists);
if (bledy.length) {
  console.log('BLEDY DEFINICJI:');
  bledy.forEach((b) => console.log('   ' + b));
  process.exit(1);
}

const handle = toPosterHandle(def.tytul);
if (inv.posters.some((p) => toPosterHandle(p.title) === handle)) {
  console.log('HANDLE ZAJETY: ' + handle);
  process.exit(1);
}

const pozycje = def.pozycje.map((poz) => {
  const p = inv.posters.find((x) => x.title === poz.tytul && x.kind !== 'set' && x.kind !== 'gallery' && x.kind !== 'gallery-framed');
  return Object.assign({}, poz, { poster: p });
});

const rama = opisRamy(def.kolorRamy);

console.log('ZESTAW PLAKATOW I RAMEK: ' + def.tytul);
console.log('   handle:   ' + handle);
console.log('   rama:     ' + rama.material + ' / ' + rama.kolor);
console.log('   pomieszczenie: ' + (def.pomieszczenie || '-'));
console.log('');
pozycje.forEach((z) => console.log(
  '   ' + z.rozmiar.padEnd(8) + z.tytul.padEnd(30) + z.poster.category.padEnd(16) +
  'wydruk ' + SIZE_PRICES[z.rozmiar] + 'zl + rama ' + cenaRamy(def.kolorRamy, z.rozmiar) + 'zl'
));
console.log('');
console.log('   osobno: ' + cenaOsobno(def.pozycje, def.kolorRamy) + ' zl   ->   zestaw: ' + cenaZestawu(def.pozycje, def.kolorRamy) + ' zl');

const opis = buildFramedDescription({
  opisMotywu: def.opis,
  pieceCount: pozycje.length,
  kolorRamy: def.kolorRamy,
});
// Sprawdzamy WYLACZNIE tekst wpisany recznie w definicji (opisMotywu), nie
// caly gotowy opis. Szablon sam moze legalnie zawierac "matowy"/"matte" —
// to opis WYKONCZENIA RAMY, prawdziwy atrybut produktu. Zakaz tych slow
// istnieje po to, zeby nikt przypadkiem nie napisal, ze PAPIER jest matowy
// (jest satynowy) — a to ryzyko dotyczy tylko tekstu, ktory ktos wpisuje
// recznie, nie naszego wlasnego szablonu.
const naruszenia = findForbiddenTerms(def.opis || '');
if (naruszenia.length) {
  console.log('');
  console.log('OPIS MOTYWU ZAWIERA ZAKAZANE OKRESLENIA: ' + naruszenia.join(', '));
  console.log('Popraw definicje.opis i uruchom ponownie.');
  process.exit(1);
}

if (!zapis) { console.log(''); console.log('To byla proba. Dodaj --wykonaj.'); process.exit(0); }

const katalog = path.join(ROOT, 'posters', '_galerie_ramek', handle);
const katalogDruk = path.join(katalog, 'druk');
fs.mkdirSync(katalogDruk, { recursive: true });

const cm = (r) => r.split('x').map(Number);
const items = pozycje.map((z) => {
  const wym = cm(z.rozmiar);
  return { absPath: abs(z.poster.imagePath), widthCm: wym[0], heightCm: wym[1] };
});

(async () => {
  // Surowa siatka (realne ramy, bez cienia, przezroczyste tlo) — WSPOLNA
  // referencja dla mastera i salonu, oba przez GPT Image 2. Ani lokalnie
  // rysowany cien, ani lokalnie sklejany salon w assets/set_rooms/*.png nie
  // wygladaly jak prawdziwe zdjecie produktowe; patrz naglowki
  // src/galleryFramedPackshotAI.js i src/galleryFramedInteriorAI.js.
  const raw = await buildFramedGridRaw(items, def.kolorRamy);
  const opisRamyEn = (NAZWY_KOLORU.en[def.kolorRamy] || def.kolorRamy) + ' ' + (NAZWY_MATERIALU.en[rama.material] || rama.material) + ' frame';

  const master = path.join(katalog, handle + '_master.jpg');
  await buildFramedMasterAI(raw.buffer, { pieceCount: pozycje.length, opisRamy: opisRamyEn }, master);

  const salon = path.join(katalog, handle + '_salon.jpg');
  await buildFramedInteriorAI(raw.buffer, { pieceCount: pozycje.length, opisRamy: opisRamyEn, roomSlug: def.pomieszczenie }, salon);

  const thumb = path.join(katalog, handle + '_thumb.jpg');
  await sharp(master).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumb);

  // ── PLIKI DO DRUKU + RAMY DO ZAPAKOWANIA ──────────────────────────────
  // Manifest wymienia DWA rodzaje rzeczy do przygotowania: PDF-y (drukujemy
  // sami) i ramy (kupujemy/pobieramy z magazynu jako gotowy SKU). Pomylenie
  // tych dwoch przy pakowaniu wysylki jest realnym ryzykiem operacyjnym,
  // wiec licza sie osobno i sa osobno wypisane.
  const manifest = { tytul: def.tytul, handle: handle, kolorRamy: def.kolorRamy, utworzono: new Date().toISOString(), pozycje: [] };
  const linie = ['ZESTAW PLAKATOW I RAMEK: ' + def.tytul, 'handle: ' + handle, '', 'DO WYDRUKOWANIA:'];
  for (const z of pozycje) {
    const zrodlo = (z.poster.pdfPaths || {})[z.rozmiar];
    const nazwa = z.rozmiar + '_' + path.basename(norm(zrodlo));
    fs.copyFileSync(abs(zrodlo), path.join(katalogDruk, nazwa));
    manifest.pozycje.push({
      tytul: z.tytul, rozmiar: z.rozmiar, pdfZrodlowy: norm(zrodlo), plik: 'druk/' + nazwa,
      ramaHandle: handleRamy(rama.kolor, z.rozmiar),
    });
    linie.push('   ' + z.rozmiar.padEnd(8) + nazwa + '   (' + z.tytul + ')');
  }
  linie.push('', 'RAMY DO ZAPAKOWANIA (' + rama.material + ' / ' + rama.kolor + '):');
  for (const z of pozycje) {
    linie.push('   ' + z.rozmiar.padEnd(8) + handleRamy(rama.kolor, z.rozmiar) + '   (do: ' + z.tytul + ')');
  }
  linie.push('', 'Sztuk w paczce: ' + pozycje.length + ' plakaty + ' + pozycje.length + ' ramy.', 'PDF-y w podkatalogu druk/, ramy pobrac z magazynu wg SKU powyzej.');
  fs.writeFileSync(path.join(katalog, 'produkcja.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(katalog, 'DO_DRUKU.txt'), linie.join('\n') + '\n', 'utf8');

  const rel = (p) => path.relative(ROOT, p).split(BS).join('/');
  const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  swieza.posters.push({
    id: 'gallery-framed_' + handle,
    kind: 'gallery-framed',
    title: def.tytul,
    category: def.kategoria,
    artStyle: pozycje[0].poster.artStyle,
    frameColor: def.kolorRamy,
    frameMaterial: rama.material,
    pieceCount: pozycje.length,
    imagePath: rel(master),
    imagePathThumb: rel(thumb),
    mockups: { interior: rel(salon), generatedAt: new Date().toISOString() },
    items: manifest.pozycje.map((p) => ({ title: p.tytul, size: p.rozmiar, pdf: p.pdfZrodlowy, frameSku: p.ramaHandle })),
    priceSeparate: cenaOsobno(def.pozycje, def.kolorRamy),
    price: cenaZestawu(def.pozycje, def.kolorRamy),
    colors: Array.from(new Set(pozycje.reduce((s, z) => s.concat(z.poster.colors || []), []))),
    roomCollections: def.pomieszczenie ? [def.pomieszczenie] : [],
    orientation: 'portrait',
    createdAt: new Date().toISOString(),
    status: 'ready',
    approvedForPrint: false,
    shopDescription: opis,
  });
  fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');

  console.log('');
  console.log('katalog:   posters/_galerie_ramek/' + handle);
  console.log('master:    ' + path.basename(master));
  console.log('salon:     ' + path.basename(salon));
  console.log('do druku:  ' + pozycje.length + ' PDF-ow w druk/');
  console.log('do zapakowania: ' + pozycje.length + ' ram (' + rama.material + ' / ' + rama.kolor + ') — patrz DO_DRUKU.txt');
  console.log('rekord dodany, NIEZATWIERDZONY — obejrzyj master i salon, potem zatwierdz.');
})().catch((e) => { console.error(e); process.exit(1); });
