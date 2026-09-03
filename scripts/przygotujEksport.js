/**
 * Jedno wejscie do eksportu: naprawa wpisow → audyt → CSV → kontrola galerii.
 *
 * POWOD ISTNIENIA. Serwer podgladu trzyma kartoteke w PAMIECI i zapisuje ja
 * po swojemu, wiec kazdy dlugi skrypt moze stracic to, co dopisal inny.
 * Wlasne skrypty juz tego nie robia (czytaja ponownie tuz przed zapisem), ale
 * serwera nie kontrolujemy — a skutek jest cichy: wpisy mockupow znikaja
 * z kartoteki, PLIKI ZOSTAJA NA DYSKU, audyt nie krzyczy, i dopiero CSV
 * wychodzi z dwoma obrazami zamiast czterech.
 *
 * Zdarzylo sie realnie przy partii rycin: 40 plakatow poszloby do sklepu bez
 * mockupow, gdyby nie przypadkowa kontrola po eksporcie.
 *
 * Dlatego naprawa jest tu PRZED eksportem, a kontrola galerii PO nim —
 * i eksport konczy sie bledem, jesli galerie sa niepelne.
 *
 *   node scripts/przygotujEksport.js
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const uruchom = (skrypt, args = []) => {
  console.log('');
  console.log('── ' + skrypt + ' ' + args.join(' '));
  execFileSync(process.execPath, [path.join(__dirname, skrypt), ...args], { stdio: 'inherit', cwd: ROOT });
};

uruchom('naprawWpisyMockupow.js', ['--wykonaj']);
uruchom('audytBiblioteki.js');
uruchom('exportShopifyCsv.js');

// Kontrola galerii — liczymy UNIKALNE adresy obrazow na produkt prosto z CSV.
// Plakat ma miec cztery: pelnospadowy, z ramka i dwa mockupy.
console.log('');
console.log('── kontrola galerii');
const { toPosterHandle } = require('../src/posterTitle');
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'posters_inventory.json'), 'utf8'));

function parseCsv(s) {
  const w = []; let pole = '', wiersz = [], q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { pole += '"'; i++; } else q = false; } else pole += c; }
    else if (c === '"') q = true;
    else if (c === ',') { wiersz.push(pole); pole = ''; }
    else if (c === '\n') { wiersz.push(pole); w.push(wiersz); wiersz = []; pole = ''; }
    else if (c !== '\r') pole += c;
  }
  if (pole || wiersz.length) { wiersz.push(pole); w.push(wiersz); }
  return w;
}

const w = parseCsv(fs.readFileSync(path.join(ROOT, 'shopify_csv', 'products_export_shopify.csv'), 'utf8'));
const nag = w[0];
const iH = nag.indexOf('Handle');
const iImg = nag.indexOf('Image Src');
const obrazy = new Map();
for (let i = 1; i < w.length; i++) {
  const h = w[i][iH];
  if (!h) continue;
  if (!obrazy.has(h)) obrazy.set(h, new Set());
  if (w[i][iImg]) obrazy.get(h).add(w[i][iImg]);
}

const chude = [];
for (const p of inv.posters) {
  if (!p.approvedForPrint || p.kind === 'set' || p.kind === 'gallery') continue;
  const n = (obrazy.get(toPosterHandle(p.title)) || new Set()).size;
  if (n < 4) chude.push(p.title + '  (' + n + ' obrazow)');
}

// Zestaw scienny ma DWA zdjecia produktu — packshot i salon — nie cztery
// jak plakat (bez wariantu z ramka, bez osobnych mockupow do liczenia).
const chudeGalerie = [];
for (const g of inv.posters) {
  if (!g.approvedForPrint || g.kind !== 'gallery') continue;
  const n = (obrazy.get(toPosterHandle(g.title)) || new Set()).size;
  if (n < 2) chudeGalerie.push(g.title + '  (' + n + ' obrazow)');
}

if (chude.length || chudeGalerie.length) {
  if (chude.length) {
    console.log('NIEPELNE GALERIE PLAKATOW: ' + chude.length);
    chude.slice(0, 15).forEach((t) => console.log('   ' + t));
  }
  if (chudeGalerie.length) {
    console.log('NIEPELNE ZESTAWY SCIENNE (brak packshotu lub salonu): ' + chudeGalerie.length);
    chudeGalerie.slice(0, 15).forEach((t) => console.log('   ' + t));
  }
  console.log('');
  console.log('Uruchom naprawWpisyMockupow.js --wykonaj i wyeksportuj ponownie.');
  process.exit(1);
}
console.log('wszystkie galerie pelne (plakaty: 4 obrazy, zestawy scienne: 2 obrazy)');
