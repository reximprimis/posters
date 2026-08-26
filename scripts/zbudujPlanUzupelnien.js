/**
 * Buduje plan uzupelnien z PUL TYTULOW — do przekazania dodajPlakaty.js.
 *
 * Rozdzial nie jest rowny. Kategoria domknieta do progu przestaje wygladac
 * na pusta, a rozsmarowanie po jednej sztuce wszedzie nie domyka zadnej.
 * Dlatego najpierw konczymy te, ktorym brakuje najmniej, a reszte kierujemy
 * do kategorii nosnych sprzedazowo.
 *
 * Styl dobierany z dozwolonych dla kategorii, po kolei — zeby w jednej
 * kategorii nie powstalo piec plakatow w tym samym stylu.
 *
 * Plan zapisujemy do PLIKU, nie na stdout: categoryStyles.js wypisuje przy
 * imporcie "CATEGORY_STYLES validation OK", co przy przekierowaniu ladowalo
 * w srodku JSON-a i psulo go.
 *
 *   node scripts/zbudujPlanUzupelnien.js plan.json sea-coast:5 coffee-tea:5
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const { CATEGORY_STYLES } = require('../src/categoryStyles');
const pools = require('../src/categoryTitlePools');
const PULE = pools.CATEGORY_TITLE_POOLS || pools;
const { znajdzRyzykowne } = require('../src/realneObiekty');

const wyjscie = process.argv[2];
if (!wyjscie || wyjscie.includes(':')) {
  console.error('Pierwszy argument to sciezka pliku wyjsciowego, potem pary kategoria:ile.');
  process.exit(1);
}

const zadania = process.argv.slice(3).map((a) => {
  const [kat, ile] = a.split(':');
  return { kat, ile: Number(ile) || 0 };
}).filter((z) => z.kat && z.ile > 0);

if (!zadania.length) {
  console.error('Podaj pary kategoria:ile, np. sea-coast:5 coffee-tea:5');
  process.exit(1);
}

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const uzyte = new Set(inv.posters.map((p) => String(p.title).trim().toLowerCase()));

const plan = [];
const raport = [];

for (const z of zadania) {
  const style = CATEGORY_STYLES[z.kat] || [];
  if (!style.length) {
    raport.push('   ' + z.kat.padEnd(26) + 'NIEZNANA KATEGORIA');
    continue;
  }
  const pula = (PULE[z.kat] || []).filter((t) => !uzyte.has(String(t).trim().toLowerCase()));

  // Tytul obiecujacy konkretny istniejacy obiekt odpada juz tutaj — inaczej
  // dodajPlakaty zablokuje CALY przebieg przez jedna pozycje.
  const ryzyko = new Set(znajdzRyzykowne(pula).map((r) => r.tytul));
  const wolne = pula.filter((t) => !ryzyko.has(t));

  const ile = Math.min(z.ile, wolne.length);
  for (let i = 0; i < ile; i++) {
    plan.push({
      tytul: wolne[i],
      kategoria: z.kat,
      styl: style[i % style.length],
      // Co czwarty poziomy — katalog ma ich za malo, a filtr orientacji
      // dziala od dzisiaj.
      orientacja: i % 4 === 3 ? 'landscape' : 'portrait',
    });
    uzyte.add(String(wolne[i]).trim().toLowerCase());
  }
  raport.push('   ' + z.kat.padEnd(26) + ile + '/' + z.ile +
    (ile < z.ile ? '  ← pula ma tylko ' + wolne.length : '') +
    (ryzyko.size ? '  (odsiane ryzykowne: ' + ryzyko.size + ')' : ''));
}

fs.writeFileSync(path.resolve(ROOT, wyjscie), JSON.stringify(plan, null, 2) + '\n', 'utf8');

console.log('PLAN UZUPELNIEN:');
raport.forEach((r) => console.log(r));
console.log('');
console.log('razem: ' + plan.length + ' plakatow  →  ' + wyjscie);
