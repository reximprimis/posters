/**
 * Postep dorabiania materialow dla ZESTAWOW po zatwierdzeniu do druku.
 *
 * postepZatwierdzania.js liczy pojedyncze plakaty i pomija zestawy — te maja
 * inna budowe: zamiast jednego PNG i dwoch mockupow maja panele z osobnymi
 * PDF-ami i piec wizualizacji. Bez wlasnego licznika zestawy sa niewidoczne
 * dokladnie wtedy, gdy trwa najdluzsza czesc pracy.
 *
 *   node scripts/postepZestawow.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const zestawy = inv.posters.filter((p) => p.kind === 'set' && p.approvedForPrint);

let zPdf = 0;
let paneliRazem = 0;
let pdfRazem = 0;
const bezPdf = [];

for (const z of zestawy) {
  const dir = path.join(ROOT, path.dirname(norm(z.imagePath)));
  if (!fs.existsSync(dir)) continue;
  const pliki = fs.readdirSync(dir);
  const pdf = pliki.filter((f) => f.endsWith('.pdf')).length;
  const paneli = (z.panels || []).length;
  paneliRazem += paneli;
  pdfRazem += pdf;
  // Kazdy panel dostaje szesc rozmiarow — komplet to paneli x 6.
  if (pdf >= paneli * 6) zPdf++;
  else bezPdf.push(z.title + ' (' + pdf + '/' + paneli * 6 + ')');
}

const n = zestawy.length;
const proc = n ? Math.round((zPdf / n) * 100) : 0;
const pelne = Math.round(proc / 4);
console.log('zatwierdzonych zestawow: ' + n);
console.log('  komplet PDF  [' + '#'.repeat(pelne) + '.'.repeat(25 - pelne) + '] ' + zPdf + '/' + n + '  ' + proc + '%');
console.log('  PDF-ow razem: ' + pdfRazem + ' z docelowych ' + paneliRazem * 6);

if (bezPdf.length && bezPdf.length <= 10) {
  console.log('');
  console.log('niekompletne: ' + bezPdf.join(', '));
} else if (bezPdf.length) {
  console.log('');
  console.log('niekompletnych: ' + bezPdf.length);
}
