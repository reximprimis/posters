/**
 * Sprawdza plan RECZNY, zanim pojdzie do generatora.
 *
 * Plany budowane przez zbudujPlanUzupelnien.js maja te sprawdzenia w sobie,
 * ale plan pisany recznie — a taki jest potrzebny dla okazji, bo tytul musi
 * zawierac slowo kluczowe reguly — omija je wszystkie. Pierwszy plan okazji
 * mial TRZYNASCIE bledow, z ktorych kazdy kosztowalby jedno generowanie:
 *
 *   - styl niedozwolony w kategorii (Photography w love-romance)
 *   - estetyka spoza listy kategorii (black-white w nature-landscapes)
 *   - blizniacze tytuly wobec biblioteki ("Christmas Market Lights" przy
 *     istniejacym "City Lights at Dusk")
 *   - tytul, ktory NIE ZLAPIE zadnej okazji: regula szuka slowa "egg", wiec
 *     "Painted Eggs Basket" w liczbie mnogiej przechodzil obok niej bokiem
 *
 * Ostatni przypadek jest najgorszy, bo plakat powstaje poprawny i nic nie
 * zglasza bledu — po prostu nigdy nie trafia do kolekcji, dla ktorej powstal.
 *
 *   node scripts/walidujPlan.js planOkazje.json
 */

'use strict';

const path = require('path');
const ROOT = path.join(__dirname, '..');
const plan = require(path.resolve(process.argv[2] || 'planOkazje.json'));
const inv = require(ROOT + '/posters_inventory.json');
const { CATEGORY_STYLES } = require(ROOT + '/src/categoryStyles');
const { ESTETYKI, estetykaPasujeDoTytulu } = require(ROOT + '/src/categoryAesthetics');
const { ocenTytul } = require(ROOT + '/src/realneObiekty');
const { zbytPodobne } = require(ROOT + '/src/podobneTytuly');
const { toPosterHandle } = require(ROOT + '/src/posterTitle');
const t = require(ROOT + '/src/taxonomy');

const bledy = [];
const handle = new Map();
for (const p of inv.posters) handle.set(toPosterHandle(p.title), p.title);

for (const z of plan) {
  const dozw = CATEGORY_STYLES[z.kategoria] || [];
  if (!dozw.length) bledy.push(z.tytul + ': nieznana kategoria ' + z.kategoria);
  else if (!dozw.includes(z.styl)) bledy.push(z.tytul + ': styl ' + z.styl + ' niedozwolony w ' + z.kategoria + ' (mozna: ' + dozw.join(', ') + ')');

  const est = ESTETYKI[z.kategoria] || [];
  if (z.estetyka && !est.includes(z.estetyka)) bledy.push(z.tytul + ': estetyka ' + z.estetyka + ' spoza listy ' + z.kategoria + ' (' + est.join(', ') + ')');
  if (!estetykaPasujeDoTytulu(z.tytul, z.estetyka)) bledy.push(z.tytul + ': estetyka kloci sie z kolorem w tytule');

  const o = ocenTytul(z.tytul);
  if (o.ryzyko) bledy.push(z.tytul + ': ' + o.powod);

  const h = toPosterHandle(z.tytul);
  if (handle.has(h)) bledy.push(z.tytul + ': handle zajety przez "' + handle.get(h) + '"');
  handle.set(h, z.tytul);
}

// blizniacze tytuly w obrebie kategorii — w planie i wobec biblioteki
for (let i = 0; i < plan.length; i++) {
  for (let j = i + 1; j < plan.length; j++) {
    if (plan[i].kategoria === plan[j].kategoria && zbytPodobne(plan[i].tytul, plan[j].tytul))
      bledy.push('blizniaki w planie: "' + plan[i].tytul + '" ~ "' + plan[j].tytul + '"');
  }
  for (const p of inv.posters) {
    if (p.kind === 'set' || p.category !== plan[i].kategoria) continue;
    if (zbytPodobne(p.title, plan[i].tytul)) bledy.push('blizniak w bibliotece: "' + plan[i].tytul + '" ~ "' + p.title + '"');
  }
}

console.log(bledy.length ? 'BLEDY (' + bledy.length + '):' : 'PLAN CZYSTY');
bledy.forEach((b) => console.log('   ' + b));

// Ktora okazje zlapie kazdy tytul. Reguly bierzemy z src/regulyOkazji.js —
// ta sama lista, ktorej uzywa przypiszOkazje.js. Pierwsza wersja tego pliku
// miala wlasna kopie i znala szesc okazji z szesnastu, wiec pokazywala
// "ZADNEJ" przy tytulach, ktore regule spelnialy.
const { REGULY } = require(ROOT + '/src/regulyOkazji');
console.log('');
console.log('OKAZJE, KTORE ZLAPIE KAZDY TYTUL:');
const licz = {};
for (const z of plan) {
  const udawany = { category: z.kategoria, title: z.tytul, colors: [] };
  const tekst = String(z.tytul).toLowerCase();
  const trafienia = [...new Set(REGULY.filter((r) => {
    try { return r.test(udawany, tekst, []); } catch (e) { return false; }
  }).map((r) => r.okazja))];
  trafienia.forEach((k) => { licz[k] = (licz[k] || 0) + 1; });
  console.log('   ' + z.tytul.padEnd(28) + (trafienia.join(', ') || '*** ZADNEJ ***'));
}
console.log('');
console.log('razem: ' + Object.entries(licz).map((a) => a[0] + ' +' + a[1]).join(', '));
