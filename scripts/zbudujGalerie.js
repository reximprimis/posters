/**
 * Buduje ZESTAW SCIENNY z definicji: podglad sciany, kopie PDF-ow do druku,
 * manifest produkcyjny i rekord w kartotece.
 *
 * PODGLAD RYSUJEMY W SKALI RZECZYWISTEJ. Plakat 50x70 obok 21x30 musi na
 * obrazku miec te sama proporcje co na scianie — inaczej klient zamawia
 * kompozycje, ktorej nie dostanie. Wysokosci licza sie z centymetrow,
 * a nie z pikseli plikow zrodlowych.
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

if (!zapis) { console.log(''); console.log('To byla proba. Dodaj --wykonaj.'); process.exit(0); }

const katalog = path.join(ROOT, 'posters', '_galerie', handle);
const katalogDruk = path.join(katalog, 'druk');
fs.mkdirSync(katalogDruk, { recursive: true });

const cm = (r) => r.split('x').map(Number);
const najwiekszy = pozycje.reduce((a, b) => (cm(a.rozmiar)[1] > cm(b.rozmiar)[1] ? a : b));
const PIX_NA_CM = 900 / cm(najwiekszy.rozmiar)[1];
const ODSTEP = Math.round(3 * PIX_NA_CM);
const MARGINES = Math.round(6 * PIX_NA_CM);

const TLA = {
  green: '#5d6b57', beige: '#d9cfc0', white: '#f2f0ec',
  grey: '#9a9a95', blue: '#5a6b7a', terracotta: '#b0705a',
};

(async () => {
  const kafle = [];
  for (const z of pozycje) {
    const wym = cm(z.rozmiar);
    kafle.push({
      z,
      w: Math.round(wym[0] * PIX_NA_CM),
      h: Math.round(wym[1] * PIX_NA_CM),
      src: abs(z.poster.imagePath),
    });
  }

  // Uklad: hero po lewej, mniejsze w kolumnie po prawej. Prosty, ale czytelny
  // i dokladnie taki, jaki klient powiesi — duzy plakat plus dwa mniejsze obok.
  const hero = kafle.find((k) => k.z === najwiekszy);
  const reszta = kafle.filter((k) => k !== hero);
  const wysReszty = reszta.reduce((s, k) => s + k.h, 0) + Math.max(0, reszta.length - 1) * ODSTEP;
  const szerCalosci = MARGINES * 2 + hero.w + (reszta.length ? ODSTEP + Math.max.apply(null, reszta.map((k) => k.w)) : 0);
  const wysCalosci = MARGINES * 2 + Math.max(hero.h, wysReszty);

  const warstwy = [];
  warstwy.push({
    input: await sharp(hero.src).resize(hero.w, hero.h, { fit: 'fill' }).toBuffer(),
    left: MARGINES,
    top: Math.round((wysCalosci - hero.h) / 2),
  });
  let y = Math.round((wysCalosci - wysReszty) / 2);
  for (const k of reszta) {
    warstwy.push({
      input: await sharp(k.src).resize(k.w, k.h, { fit: 'fill' }).toBuffer(),
      left: MARGINES + hero.w + ODSTEP,
      top: y,
    });
    y += k.h + ODSTEP;
  }

  // Tlo w kolorze sciany z definicji — to ono sprzedaje pomysl "zielona sciana".
  const tlo = TLA[def.sciana] || '#e8e4dd';
  const podglad = path.join(katalog, handle + '_podglad.jpg');
  await sharp({ create: { width: szerCalosci, height: wysCalosci, channels: 3, background: tlo } })
    .composite(warstwy).jpeg({ quality: 90 }).toFile(podglad);

  const thumb = path.join(katalog, handle + '_thumb.jpg');
  await sharp(podglad).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumb);

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
    imagePath: rel(podglad),
    imagePathThumb: rel(thumb),
    items: manifest.pozycje.map((p) => ({ title: p.tytul, size: p.rozmiar, pdf: p.pdfZrodlowy })),
    priceSeparate: cenaOsobno(def.pozycje),
    price: cenaZestawu(def.pozycje),
    colors: Array.from(new Set(pozycje.reduce((s, z) => s.concat(z.poster.colors || []), []))),
    roomCollections: def.pomieszczenie ? [def.pomieszczenie] : [],
    orientation: 'portrait',
    createdAt: new Date().toISOString(),
    status: 'ready',
    approvedForPrint: false,
    shopDescription: def.opis || '',
  });
  fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');

  console.log('');
  console.log('katalog:  posters/_galerie/' + handle);
  console.log('podglad:  ' + path.basename(podglad) + '  (' + szerCalosci + 'x' + wysCalosci + ')');
  console.log('do druku: ' + pozycje.length + ' PDF-ow w druk/');
  console.log('rekord dodany, NIEZATWIERDZONY — obejrzyj podglad i zatwierdz.');
})().catch((e) => { console.error(e); process.exit(1); });
