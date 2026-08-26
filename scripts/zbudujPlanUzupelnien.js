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
const { ESTETYKI, LUBIA_POZIOM } = require('../src/categoryAesthetics');

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


/**
 * Uklada pary styl+estetyka tak, zeby zadna nie powtorzyla sie przed
 * wyczerpaniem siatki, a przy tym KAZDY styl i KAZDA estetyka wchodzily
 * rownomiernie.
 *
 * Dwa podejscia, ktore tu nie wystarczyly:
 *
 * 1. Rotacja dwoma indeksami zawodzi, gdy dlugosci list maja wspolny dzielnik:
 *    przy dwoch stylach i dwoch estetykach wychodzily w kolko te same dwie
 *    pary, choc dostepne byly cztery.
 *
 * 2. Zachlanne "byle inne niz poprzednie" naprawilo powtorki, ale zawezilo
 *    kategorie do dwoch pierwszych stylow — kuchnia dostawala na przemian
 *    Photography i Minimalism, a Line art i Illustration nie wchodzily wcale.
 *
 * Dlatego wybieramy pare o NAJRZADZIEJ dotad uzytym stylu i estetyce, a dopiero
 * przy remisie patrzymy, czy rozni sie od poprzedniej.
 *
 * Powtorka jest mozliwa dopiero, gdy zamawiamy wiecej plakatow niz siatka ma
 * pol (retro-vintage: dwa style x dwie estetyki = cztery, a chcemy piec) — i
 * wtedy jest to ograniczenie kategorii, nie blad rotacji.
 */
function ulozPary(style, estetyki) {
  const siatka = [];
  for (const st of style) for (const es of estetyki) siatka.push({ styl: st, estetyka: es });

  const ileStyl = new Map();
  const ileEst = new Map();
  const out = [];
  let ostatni = { styl: null, estetyka: null };

  const ocena = (p) => [
    (ileStyl.get(p.styl) || 0) + (ileEst.get(p.estetyka) || 0),
    p.styl === ostatni.styl ? 1 : 0,
    p.estetyka === ostatni.estetyka ? 1 : 0,
  ];
  const mniejsza = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };

  while (siatka.length) {
    let najlepszy = 0;
    let najlepszaOcena = ocena(siatka[0]);
    for (let i = 1; i < siatka.length; i++) {
      const o = ocena(siatka[i]);
      if (mniejsza(o, najlepszaOcena)) { najlepszaOcena = o; najlepszy = i; }
    }
    ostatni = siatka.splice(najlepszy, 1)[0];
    ileStyl.set(ostatni.styl, (ileStyl.get(ostatni.styl) || 0) + 1);
    ileEst.set(ostatni.estetyka, (ileEst.get(ostatni.estetyka) || 0) + 1);
    out.push(ostatni);
  }
  return out;
}

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

  const estetyki = ESTETYKI[z.kat] || [''];
  const pary = ulozPary(style, estetyki);

  const ile = Math.min(z.ile, wolne.length);
  for (let i = 0; i < ile; i++) {
    plan.push({
      tytul: wolne[i],
      kategoria: z.kat,
      styl: pary[i % pary.length].styl,
      estetyka: pary[i % pary.length].estetyka,
      // Poziom co czwarty, ale tylko tam, gdzie ma sens sam z siebie. Poziomy
      // plakat kuchenny czy nursery to rzadkosc — wymuszanie go psuje kategorie,
      // zeby poprawic licznik orientacji.
      orientacja: LUBIA_POZIOM.has(z.kat) && i % 4 === 3 ? 'landscape' : 'portrait',
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
