/**
 * Wylicza dominujace kolory plakatow i zapisuje je w kartotece.
 *
 * Kolor jest osia filtrowania w calej branzy, a u nas metapole "Kolor"
 * w CSV nie bylo wypelnione ani razu. Recznie otagowac 152 plakaty byloby
 * i drogo, i niespojnie — a dane siedza w samym obrazie.
 *
 * NIE liczymy sredniej barwy. Srednia kolorowego plakatu to zawsze bloto:
 * czerwien i zielen usredniaja sie do brudnego brazu, ktorego na plakacie
 * nie ma ani jednego piksela. Zamiast tego kazdy piksel wpada do kubelka
 * handlowego (nearestColorKey) i liczymy UDZIALY kubelkow.
 *
 * Biel i czern sa traktowane osobno: prawie kazdy plakat ma jasne tlo, wiec
 * gdyby liczyly sie normalnie, polowa katalogu bylaby "biala". Wchodza do
 * wyniku dopiero, gdy naprawde dominuja.
 *
 *   node scripts/ustawKolory.js             — proba
 *   node scripts/ustawKolory.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { nearestColorKey } = require('../src/taxonomy');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const zapis = process.argv.includes('--wykonaj');

/** Do ilu pikseli zmniejszamy plakat przed liczeniem — 64x64 w zupelnosci starcza. */
const PROBKA = 64;
/** Kubelek musi zajac tyle obrazu, zeby trafic do wyniku. */
const PROG_UDZIALU = 0.12;
/** Neutralne musza dominowac wyrazniej, bo tlo ma prawie kazdy plakat. */
const PROG_NEUTRALNY = 0.4;
/** Ile kolorow maksymalnie przypisujemy jednemu plakatowi. */
const MAX_KOLOROW = 3;

/**
 * Bez lezy tu obok bieli i szarosci, mimo ze technicznie jest barwa. Powod
 * jest handlowy: na plakacie bez prawie zawsze jest tlem, nie tematem.
 * Bez tego progu wychodzil na 104 ze 160 plakatow — filtr, ktory zwraca
 * dwie trzecie katalogu, nie filtruje niczego.
 */
const NEUTRALNE = new Set(['white', 'black', 'grey', 'beige']);

/**
 * @param {string} abs sciezka do pliku
 * @returns {Promise<string[]>} klucze kolorow, od najmocniejszego
 */
async function policzKolory(abs) {
  const { data, info } = await sharp(abs)
    .resize(PROBKA, PROBKA, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const kanaly = info.channels;
  const liczniki = new Map();
  let pikseli = 0;
  for (let i = 0; i < data.length; i += kanaly) {
    const k = nearestColorKey(data[i], data[i + 1], data[i + 2]);
    liczniki.set(k, (liczniki.get(k) || 0) + 1);
    pikseli++;
  }

  const posort = [...liczniki.entries()]
    .map(([k, n]) => ({ k, udzial: n / pikseli }))
    .sort((a, b) => b.udzial - a.udzial);

  const wynik = [];
  for (const { k, udzial } of posort) {
    const prog = NEUTRALNE.has(k) ? PROG_NEUTRALNY : PROG_UDZIALU;
    if (udzial >= prog) wynik.push(k);
    if (wynik.length >= MAX_KOLOROW) break;
  }
  // Plakat bez zadnego wyraznego koloru (np. same delikatne pastele) i tak
  // musi dostac cos do filtra — bierzemy najmocniejszy kubelek.
  if (!wynik.length && posort.length) wynik.push(posort[0].k);
  return wynik;
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const zmiany = [];
  const rozklad = {};
  let bezPliku = 0;

  for (const p of inv.posters) {
    if (p.kind === 'set') continue;
    const abs = path.join(ROOT, norm(p.imagePath));
    if (!fs.existsSync(abs)) {
      bezPliku++;
      continue;
    }
    const kolory = await policzKolory(abs);
    kolory.forEach((k) => (rozklad[k] = (rozklad[k] || 0) + 1));
    zmiany.push({ rekord: p, kolory });
  }

  console.log('ROZKLAD KOLOROW W BIBLIOTECE:');
  for (const [k, n] of Object.entries(rozklad).sort((a, b) => b[1] - a[1])) {
    console.log('   ' + String(n).padStart(4) + '  ' + k);
  }
  console.log('');
  console.log('PRZYKLADY:');
  for (const z of zmiany.slice(0, 12)) {
    console.log('   ' + z.rekord.title.slice(0, 34).padEnd(36) + z.kolory.join(', '));
  }
  console.log('');
  console.log('plakatow: ' + zmiany.length + (bezPliku ? ',  bez pliku: ' + bezPliku : ''));

  if (!zapis) {
    console.log('');
    console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
    return;
  }

  for (const z of zmiany) z.rekord.colors = z.kolory;
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  console.log('');
  console.log('Zapisane.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
