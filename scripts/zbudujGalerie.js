/**
 * Buduje ZESTAW SCIENNY z definicji: master, packshot, salon, kopie PDF-ow
 * do druku, manifest produkcyjny i rekord w kartotece.
 *
 * TRZY ZDJECIA PRODUKTU, jak przy kazdym innym produkcie w katalogu:
 *   master   — same wydruki, BEZ ramy. To GLOWNE zdjecie: pokazuje dokladnie
 *              to, co przyjedzie w paczce. Rama jest osobnym produktem,
 *              dobieranym przez klienta w sklepie — dokladnie jak przy kazdym
 *              pojedynczym plakacie.
 *   packshot — te same wydruki oprawione, na czystym tle. Wizualizacja
 *              efektu, NIE zawartosc paczki.
 *   salon    — ta sama kompozycja wklejona w prawdziwe zdjecie wnetrza
 *              (assets/set_rooms/), ten sam zasob co dyptyki i tryptyki.
 * Wszystkie trzy licza sie z centymetrow, wiec 50x70 obok 21x30 ma na
 * obrazku te sama proporcje co na scianie — logika w src/galleryVisuals.js.
 *
 * Galeria NICZEGO NIE GENERUJE do druku. Kazdy plakat skladowy ma juz komplet
 * PDF-ow we wszystkich rozmiarach — kopiujemy wlasciwy do podkatalogu druk/,
 * zeby przy zamowieniu nie trzeba bylo niczego szukac.
 *
 *   node scripts/zbudujGalerie.js definicja.json             — proba
 *   node scripts/zbudujGalerie.js definicja.json --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const BS = String.fromCharCode(92);
const norm = (p) => String(p || '').split(BS).join('/');
const abs = (p) => path.join(ROOT, norm(p));
const fileExists = (p) => !!p && fs.existsSync(abs(p));

const { cenaOsobno, cenaZestawu, sprawdzDefinicje } = require('../src/galerieScienne');
const { toPosterHandle } = require('../src/posterTitle');
const { buildGalleryMaster, buildGalleryPackshot, buildGalleryInterior } = require('../src/galleryVisuals');
const { buildGalleryDescription, findForbiddenTerms } = require('../src/galleryDescription');

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
  const p = inv.posters.find((x) => x.title === poz.tytul && x.kind !== 'set');
  return Object.assign({}, poz, { poster: p });
});

console.log('ZESTAW SCIENNY: ' + def.tytul);
console.log('   handle:   ' + handle);
console.log('   sciana:   ' + (def.sciana || '-') + ',  pomieszczenie: ' + (def.pomieszczenie || '-'));
console.log('');
pozycje.forEach((z) => console.log('   ' + z.rozmiar.padEnd(8) + z.tytul.padEnd(30) + z.poster.category));
console.log('');
console.log('   osobno: ' + cenaOsobno(def.pozycje) + ' zl   ->   zestaw: ' + cenaZestawu(def.pozycje) + ' zl');

// Opis budujemy TERAZ, nie na eksporcie — tak samo jak dyptyk/tryptyk
// (scripts/generateSet.js: buildSetDescription w momencie tworzenia rekordu).
// Jedno zrodlo prawdy: cena, sztuki i rozmiary trafiaja do tekstu raz i nie
// licza sie osobno przy kazdym eksporcie CSV.
const opis = buildGalleryDescription({
  opisMotywu: def.opis,
  pieceCount: pozycje.length,
  sizes: pozycje.map((p) => p.rozmiar),
});
const naruszenia = findForbiddenTerms(opis);
if (naruszenia.length) {
  console.log('');
  console.log('OPIS ZAWIERA ZAKAZANE OKRESLENIA: ' + naruszenia.join(', '));
  console.log('Popraw definicje.opis i uruchom ponownie.');
  process.exit(1);
}

if (!zapis) { console.log(''); console.log('To byla proba. Dodaj --wykonaj.'); process.exit(0); }

const katalog = path.join(ROOT, 'posters', '_galerie', handle);
const katalogDruk = path.join(katalog, 'druk');
fs.mkdirSync(katalogDruk, { recursive: true });

const cm = (r) => r.split('x').map(Number);
const items = pozycje.map((z) => {
  const wym = cm(z.rozmiar);
  return { absPath: abs(z.poster.imagePath), widthCm: wym[0], heightCm: wym[1] };
});

(async () => {
  const master = path.join(katalog, handle + '_master.jpg');
  await buildGalleryMaster(items, master);

  const packshot = path.join(katalog, handle + '_packshot.jpg');
  await buildGalleryPackshot(items, packshot);

  const salon = path.join(katalog, handle + '_salon.jpg');
  await buildGalleryInterior(items, salon, { roomId: def.pokojId || undefined });

  // Miniatura z MASTERA, nie z packshotu — to on jest zdjeciem produktu.
  const thumb = path.join(katalog, handle + '_thumb.jpg');
  await sharp(master).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumb);

  const manifest = { tytul: def.tytul, handle: handle, utworzono: new Date().toISOString(), pozycje: [] };
  const linie = ['ZESTAW SCIENNY: ' + def.tytul, 'handle: ' + handle, '', 'DO WYDRUKOWANIA:'];
  for (const z of pozycje) {
    const zrodlo = (z.poster.pdfPaths || {})[z.rozmiar];
    const nazwa = z.rozmiar + '_' + path.basename(norm(zrodlo));
    fs.copyFileSync(abs(zrodlo), path.join(katalogDruk, nazwa));
    manifest.pozycje.push({ tytul: z.tytul, rozmiar: z.rozmiar, pdfZrodlowy: norm(zrodlo), plik: 'druk/' + nazwa });
    linie.push('   ' + z.rozmiar.padEnd(8) + nazwa + '   (' + z.tytul + ')');
  }
  linie.push('', 'Sztuk w paczce: ' + pozycje.length, 'Pliki lezą w podkatalogu druk/.');
  fs.writeFileSync(path.join(katalog, 'produkcja.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(katalog, 'DO_DRUKU.txt'), linie.join('\n') + '\n', 'utf8');

  const rel = (p) => path.relative(ROOT, p).split(BS).join('/');
  // Kartoteke czytamy ponownie tuz przed zapisem — serwer podgladu trzyma ja
  // w pamieci, a ten skrypt sklada obrazy przez kilkanascie sekund.
  const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  swieza.posters.push({
    id: 'gallery_' + handle,
    kind: 'gallery',
    title: def.tytul,
    category: def.kategoria,
    artStyle: pozycje[0].poster.artStyle,
    wallColor: def.sciana || '',
    pieceCount: pozycje.length,
    // imagePath = MASTER (bez ramy) — to jest produkt. Packshot i salon sa
    // wizualizacjami efektu, trzymanymi w mockups tak jak przy kazdym innym
    // produkcie w katalogu.
    imagePath: rel(master),
    imagePathThumb: rel(thumb),
    mockups: { frame: rel(packshot), interior: rel(salon), generatedAt: new Date().toISOString() },
    items: manifest.pozycje.map((p) => ({ title: p.tytul, size: p.rozmiar, pdf: p.pdfZrodlowy })),
    priceSeparate: cenaOsobno(def.pozycje),
    price: cenaZestawu(def.pozycje),
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
  console.log('katalog:   posters/_galerie/' + handle);
  console.log('master:    ' + path.basename(master));
  console.log('packshot:  ' + path.basename(packshot));
  console.log('salon:     ' + path.basename(salon));
  console.log('do druku:  ' + pozycje.length + ' PDF-ow w druk/');
  console.log('rekord dodany, NIEZATWIERDZONY — obejrzyj master, packshot i salon, potem zatwierdz.');
})().catch((e) => { console.error(e); process.exit(1); });
