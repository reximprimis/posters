/**
 * Audyt biblioteki: czy kartoteka zgadza sie z dyskiem i czy nic nie zablokuje
 * eksportu do sklepu.
 *
 * Sprawdza rzeczy, ktore w interfejsie wygladaja poprawnie, bo panel rysuje
 * kafelek z rekordu — nie z plikow. Plakat bez miniatury albo zestaw bez
 * panelu ma w bibliotece normalny kafelek, a w sklepie pusta galerie.
 *
 *   node scripts/audytBiblioteki.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { toPosterHandle } = require('../src/posterTitle');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const jest = (rel) => rel && fs.existsSync(path.join(ROOT, norm(rel)));

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
// Galerie sa osobnym rodzajem produktu — nie maja wlasnych PDF-ow ani mockupow,
// wiec petla plakatow musi je pomijac, inaczej audyt blokuje eksport na braku,
// ktorego z zalozenia nie bedzie.
const plakaty = inv.posters.filter((p) => p.kind !== 'set' && p.kind !== 'gallery');
const galerie = inv.posters.filter((p) => p.kind === 'gallery');
const zestawy = inv.posters.filter((p) => p.kind === 'set');

const problemy = [];
const dodaj = (waga, opis) => problemy.push({ waga, opis });

// ── 1. Pliki obrazow ────────────────────────────────────────────────────────
for (const p of inv.posters) {
  if (!p.imagePath) dodaj('BLOKUJE', `${p.title}: brak imagePath`);
  else if (!jest(p.imagePath)) dodaj('BLOKUJE', `${p.title}: brak pliku ${p.imagePath}`);
}

// ── 2. Unikalnosc handla ────────────────────────────────────────────────────
// Handle liczy sie z tytulu, wiec dwa produkty o tym samym handlu nadpisuja
// sie nawzajem przy imporcie — jeden znika ze sklepu bez ostrzezenia.
const wgHandla = new Map();
for (const p of inv.posters) {
  const h = toPosterHandle(p.title);
  if (!wgHandla.has(h)) wgHandla.set(h, []);
  wgHandla.get(h).push(p.title);
}
for (const [h, tytuly] of wgHandla) {
  if (tytuly.length > 1) dodaj('BLOKUJE', `handle "${h}" wspolny dla: ${tytuly.join(' | ')}`);
}

// ── 3. Zatwierdzone plakaty: miniatura, PDF, mockupy ────────────────────────
for (const p of plakaty.filter((x) => x.approvedForPrint)) {
  const dir = path.dirname(norm(p.imagePath));
  const pliki = fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)) : [];
  if (!pliki.some((f) => f.includes('_thumb.'))) dodaj('BLOKUJE', `${p.title}: brak miniatury`);
  if (!pliki.some((f) => f.endsWith('.pdf'))) dodaj('BLOKUJE', `${p.title}: brak PDF`);
  const m = p.mockups || {};
  if (!m.frame || !m.interior) dodaj('WAZNE', `${p.title}: brak mockupow w kartotece`);
  else if (!jest(m.frame) || !jest(m.interior)) dodaj('BLOKUJE', `${p.title}: mockupy w kartotece, brak plikow`);
}


// ── 3b. Zestawy scienne: zdjecia produktu, skladniki i pliki do druku ──────
//
// Galeria NIE MA wlasnych PDF-ow do druku i to jest poprawne — sklada sie
// z gotowych plakatow, kazdy juz wydrukowalny. Ale MA TRZY zdjecia produktu —
// master (imagePath, bez ramy — to jest produkt), packshot i salon
// (mockups.frame/interior, wizualizacje efektu) — sprawdzamy wszystkie trzy.
for (const g of galerie.filter((x) => x.approvedForPrint)) {
  if (!jest(g.imagePathThumb)) dodaj('BLOKUJE', `${g.title}: brak miniatury`);
  if (!jest(g.imagePath)) dodaj('BLOKUJE', `${g.title}: brak mastera (imagePath)`);
  const gm = g.mockups || {};
  if (!gm.frame || !gm.interior) dodaj('WAZNE', `${g.title}: brak packshotu lub salonu w kartotece`);
  else if (!jest(gm.frame) || !jest(gm.interior)) dodaj('BLOKUJE', `${g.title}: packshot/salon w kartotece, brak plikow`);
  const katalog = path.dirname(norm(g.imagePath));
  for (const it of g.items || []) {
    const skladnik = inv.posters.find((p) => p.title === it.title && p.kind !== 'set' && p.kind !== 'gallery');
    if (!skladnik) { dodaj('BLOKUJE', `${g.title}: skladnik "${it.title}" zniknal z kartoteki`); continue; }
    if (!skladnik.approvedForPrint) dodaj('BLOKUJE', `${g.title}: skladnik "${it.title}" nie jest zatwierdzony`);
    if (!jest(it.pdf)) dodaj('BLOKUJE', `${g.title}: brak PDF skladnika ${it.size} "${it.title}"`);
  }
  const druk = path.join(ROOT, katalog, 'druk');
  const ilePlikow = fs.existsSync(druk) ? fs.readdirSync(druk).filter((f) => f.endsWith('.pdf')).length : 0;
  if (ilePlikow < (g.items || []).length) {
    dodaj('WAZNE', `${g.title}: w druk/ jest ${ilePlikow} PDF-ow, a pozycji ${(g.items || []).length}`);
  }
}
// ── 4. Zestawy: panele i komplet PDF-ow ─────────────────────────────────────
// Tylko ZATWIERDZONE: pozycja odrzucona po przegladzie nie idzie do sklepu,
// wiec brak jej PDF-ow nie jest przeszkoda w eksporcie. Bez tego filtra jeden
// swiadomie odlozony zestaw blokowal caly eksport.
for (const z of zestawy.filter((x) => x.approvedForPrint)) {
  const paneli = (z.panels || []).length;
  if (paneli !== 2 && paneli !== 3) {
    dodaj('BLOKUJE', `${z.title}: ${paneli} paneli (dozwolone 2 lub 3)`);
    continue;
  }
  for (const panel of z.panels) {
    const rel = typeof panel === 'string' ? panel : panel && panel.imagePath;
    if (!jest(rel)) dodaj('BLOKUJE', `${z.title}: brak pliku panelu ${rel || '?'}`);
  }
  const dir = path.join(ROOT, path.dirname(norm(z.imagePath)));
  const pliki = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const pdf = pliki.filter((f) => f.endsWith('.pdf')).length;
  if (pdf < paneli * 6) dodaj('BLOKUJE', `${z.title}: ${pdf} PDF-ow, oczekiwane ${paneli * 6}`);
}

// ── 5. Pola potrzebne filtrom w sklepie ─────────────────────────────────────
for (const p of inv.posters.filter((x) => x.approvedForPrint)) {
  if (!p.category) dodaj('WAZNE', `${p.title}: brak kategorii`);
  if (!p.colors || !p.colors.length) dodaj('DROBNE', `${p.title}: brak kolorow (filtr koloru go pominie)`);
  if (!p.orientation) dodaj('DROBNE', `${p.title}: brak orientacji`);
}

// ── Raport ──────────────────────────────────────────────────────────────────
console.log('BIBLIOTEKA: ' + inv.posters.length + ' pozycji  (' + plakaty.length + ' plakatow, ' + zestawy.length + ' zestawow)');
console.log('zatwierdzonych: ' + inv.posters.filter((p) => p.approvedForPrint).length);
console.log('');

for (const waga of ['BLOKUJE', 'WAZNE', 'DROBNE']) {
  const lista = problemy.filter((p) => p.waga === waga);
  if (!lista.length) {
    console.log(waga.padEnd(9) + ' — brak');
    continue;
  }
  console.log(waga.padEnd(9) + ' — ' + lista.length);
  for (const p of lista.slice(0, 15)) console.log('   ' + p.opis);
  if (lista.length > 15) console.log('   ... i ' + (lista.length - 15) + ' wiecej');
}

const blokujace = problemy.filter((p) => p.waga === 'BLOKUJE').length;
console.log('');
console.log(blokujace ? 'BIBLIOTEKA NIE JEST GOTOWA DO EKSPORTU' : 'Biblioteka gotowa do eksportu.');
process.exitCode = blokujace ? 1 : 0;
