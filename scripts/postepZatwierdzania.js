/**
 * Postep generowania materialow po zatwierdzeniu do druku.
 *
 * Pipeline zatwierdzania chodzi w tle serwera preview i nie raportuje nic
 * do konsoli. Bez tego podgladu jedyna alternatywa jest restart serwera
 * "zeby sprawdzic" — czyli zabicie trwajacej pracy.
 *
 *   node scripts/postepZatwierdzania.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const zatwierdzone = inv.posters.filter((p) => p.approvedForPrint && p.kind !== 'set');

let zPdf = 0;
let zMockupami = 0;
let zMiniatura = 0;
const bezMockupow = [];

for (const p of zatwierdzone) {
  const dir = path.join(ROOT, path.dirname(norm(p.imagePath)));
  const baza = path.basename(norm(p.imagePath), '.png');
  if (!fs.existsSync(dir)) continue;
  const pliki = fs.readdirSync(dir);
  if (pliki.some((f) => f.endsWith('.pdf'))) zPdf++;
  if (pliki.some((f) => f.includes('_thumb.'))) zMiniatura++;
  const maMockupy =
    fs.existsSync(path.join(dir, baza + '_mockup_frame.jpg')) &&
    fs.existsSync(path.join(dir, baza + '_mockup_interior.jpg'));
  if (maMockupy) zMockupami++;
  else bezMockupow.push(p.title);
}

const n = zatwierdzone.length;
const pasek = (ile) => {
  const proc = Math.round((ile / n) * 100);
  const pelne = Math.round(proc / 4);
  return '[' + '#'.repeat(pelne) + '.'.repeat(25 - pelne) + '] ' + String(ile).padStart(3) + '/' + n + '  ' + proc + '%';
};

console.log('zatwierdzonych plakatow: ' + n);
console.log('  miniatury  ' + pasek(zMiniatura));
console.log('  PDF        ' + pasek(zPdf));
console.log('  mockupy    ' + pasek(zMockupami));

if (bezMockupow.length && bezMockupow.length <= 12) {
  console.log('');
  console.log('bez mockupow: ' + bezMockupow.join(', '));
} else if (bezMockupow.length) {
  console.log('');
  console.log('bez mockupow: ' + bezMockupow.length + ' szt.');
}
