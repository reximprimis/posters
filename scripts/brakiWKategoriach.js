/**
 * Pokazuje, ile plakatow ma kazda kategoria i ile brakuje do progu.
 *
 * Kategoria z jedna czy dwiema pozycjami wyglada w sklepie gorzej niz brak
 * kategorii: klient wchodzi z menu i widzi pustke, co czyta sie jako sklep
 * bez towaru. Prog ustawiamy na tyle, ile potrzeba, zeby siatka produktow
 * wypelnila pierwszy ekran.
 *
 * Pokazujemy tez, ile WOLNYCH tytulow zostalo w puli — bo to one wyznaczaja
 * sufit produkcyjny kategorii. Kategoria bez wolnych tytulow wymaga najpierw
 * dopisania puli, a nie uruchomienia generatora.
 *
 *   node scripts/brakiWKategoriach.js [prog]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const PROG = Number(process.argv[2]) || 8;

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const { CATEGORIES } = require('../src/taxonomy');
const pools = require('../src/categoryTitlePools');
const PULE = pools.CATEGORY_TITLE_POOLS || pools;

const zatwierdzone = inv.posters.filter((p) => p.approvedForPrint && p.kind !== 'set');
const uzyte = new Set(inv.posters.map((p) => String(p.title).trim().toLowerCase()));

// Do sklepu ida tylko zatwierdzone, ale swiezo wygenerowane tez sie licza —
// bez tej kolumny raport po duzym przebiegu pokazuje te same liczby co przed
// nim i wyglada, jakby nic nie powstalo.
const oczekujace = inv.posters.filter((p) => !p.approvedForPrint && p.kind !== 'set');
const wgOczekujacych = {};
for (const p of oczekujace) wgOczekujacych[p.category] = (wgOczekujacych[p.category] || 0) + 1;

const wg = {};
for (const p of zatwierdzone) wg[p.category] = (wg[p.category] || 0) + 1;

const wiersze = [];
for (const kat of CATEGORIES) {
  const klucz = kat.key || kat;
  const ile = wg[klucz] || 0;
  const pula = PULE[klucz] || [];
  const wolne = pula.filter((t) => !uzyte.has(String(t).trim().toLowerCase())).length;
  const czeka = wgOczekujacych[klucz] || 0;
  wiersze.push({ klucz, nazwa: kat.name || '', ile, czeka, wolne, pula: pula.length, brak: Math.max(0, PROG - ile - czeka) });
}

wiersze.sort((a, b) => a.ile - b.ile);

console.log('prog: ' + PROG + ' plakatow na kategorie');
console.log('');
console.log('  MA  CZEKA  BRAK  WOLNYCH  KATEGORIA');
for (const w of wiersze) {
  const znacznik = w.brak > 0 ? (w.wolne < w.brak ? '  ← pula za mala' : '') : '';
  console.log(
    '  ' + String(w.ile).padStart(2) +
    '  ' + String(w.czeka || '-').padStart(5) +
    '  ' + String(w.brak || '-').padStart(4) +
    '  ' + String(w.wolne).padStart(7) +
    '  ' + w.klucz.padEnd(26) + znacznik
  );
}

const doUzupelnienia = wiersze.filter((w) => w.brak > 0);
const razemBrak = doUzupelnienia.reduce((s, w) => s + w.brak, 0);
const bezPuli = doUzupelnienia.filter((w) => w.wolne < w.brak);

console.log('');
console.log('kategorii ponizej progu: ' + doUzupelnienia.length);
console.log('plakatow do wygenerowania: ' + razemBrak);
if (bezPuli.length) {
  console.log('');
  console.log('KATEGORIE Z ZA MALA PULA TYTULOW (najpierw dopisac tytuly):');
  for (const w of bezPuli) {
    console.log('   ' + w.klucz.padEnd(26) + 'brakuje ' + w.brak + ', wolnych tytulow ' + w.wolne + ' z ' + w.pula);
  }
}
