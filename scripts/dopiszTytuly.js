/**
 * Dopisuje tytuly do puli kategorii — po sprawdzeniu, nie na slepo.
 *
 * Pula wyznacza sufit produkcyjny kategorii: bez wolnych tytulow generator
 * nie ma z czego brac, wiec przy celu 1000-1500 plakatow to pule sa waskim
 * gardlem, a nie moc generowania.
 *
 * Kazdy kandydat przechodzi te same sita co plan generowania, bo tytul zly
 * w puli jest gorszy niz jego brak — siedzi tam i czeka, zeby zepsuc przebieg
 * za tydzien, kiedy nikt juz nie pamieta, skad sie wzial:
 *
 *   - znak towarowy, wymyslony zabytek, slowo odrzucane przez filtr dostawcy
 *   - tytul blizniaczy wobec biblioteki LUB wobec samej puli
 *   - handle juz zajety
 *
 * Wejscie: plik z liniami "Tytul|kategoria". Zapis dopisuje tytuly na koniec
 * tablicy kategorii, zachowujac formatowanie pliku.
 *
 *   node scripts/dopiszTytuly.js kandydaci.txt             — proba
 *   node scripts/dopiszTytuly.js kandydaci.txt --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLIK_PUL = path.join(ROOT, 'src', 'categoryTitlePools.js');
const inv = require('../posters_inventory.json');
const pools = require('../src/categoryTitlePools');
const PULE = pools.CATEGORY_TITLE_POOLS || pools;
const { zbytPodobne } = require('../src/podobneTytuly');
const { toPosterHandle } = require('../src/posterTitle');
const { ocenTytul } = require('../src/realneObiekty');

const wejscie = process.argv[2];
const zapis = process.argv.includes('--wykonaj');
if (!wejscie) {
  console.error('Podaj plik z liniami "Tytul|kategoria".');
  process.exit(1);
}

const handle = new Set(inv.posters.map((p) => toPosterHandle(p.title)));
for (const lista of Object.values(PULE)) for (const t of lista) handle.add(toPosterHandle(t));

// Blizniakow szukamy i w bibliotece, i w puli — tytul moze byc wolny, a mimo
// to opisywac ten sam plakat co pozycja, ktorej jeszcze nie wygenerowano.
const wgKategorii = new Map();
for (const [kat, lista] of Object.entries(PULE)) wgKategorii.set(kat, [...lista]);
for (const p of inv.posters) {
  if (p.kind === 'set') continue;
  if (!wgKategorii.has(p.category)) wgKategorii.set(p.category, []);
  wgKategorii.get(p.category).push(p.title);
}

const przyjete = new Map();
const odrzucone = [];

for (const linia of fs.readFileSync(wejscie, 'utf8').split('\n')) {
  const l = linia.trim();
  if (!l || l.startsWith('#')) continue;
  const [tytul, kat] = l.split('|').map((x) => (x || '').trim());
  if (!tytul || !kat) continue;

  if (!PULE[kat]) { odrzucone.push(tytul + '  — nieznana kategoria ' + kat); continue; }

  const o = ocenTytul(tytul);
  if (o.ryzyko) { odrzucone.push(tytul + '  — ' + o.powod); continue; }
  if (handle.has(toPosterHandle(tytul))) { odrzucone.push(tytul + '  — handle zajety'); continue; }

  const kolizja = (wgKategorii.get(kat) || []).find((t) => zbytPodobne(t, tytul));
  if (kolizja) { odrzucone.push(tytul + '  — blizniak: ' + kolizja); continue; }

  handle.add(toPosterHandle(tytul));
  wgKategorii.get(kat).push(tytul);
  if (!przyjete.has(kat)) przyjete.set(kat, []);
  przyjete.get(kat).push(tytul);
}

const razem = [...przyjete.values()].reduce((s, a) => s + a.length, 0);
console.log('PRZYJETE: ' + razem);
for (const [kat, lista] of [...przyjete.entries()].sort()) {
  console.log('   ' + kat.padEnd(26) + '+' + String(lista.length).padStart(3) +
    '   (pula ' + PULE[kat].length + ' → ' + (PULE[kat].length + lista.length) + ')');
}
if (odrzucone.length) {
  console.log('');
  console.log('ODRZUCONE: ' + odrzucone.length);
  odrzucone.forEach((x) => console.log('   ' + x));
}

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj.');
  process.exit(0);
}
if (!razem) process.exit(0);

let tekst = fs.readFileSync(PLIK_PUL, 'utf8');
for (const [kat, lista] of przyjete) {
  // Wstawiamy przed nawiasem zamykajacym tablice tej kategorii. Szukamy po
  // kluczu z apostrofami, bo nazwy kategorii bywaja podciagiem innych nazw.
  const znacznik = "  '" + kat + "': [";
  const start = tekst.indexOf(znacznik);
  if (start < 0) { console.error('NIE ZNALAZLEM KATEGORII W PLIKU: ' + kat); process.exit(1); }
  const koniec = tekst.indexOf('\n  ],', start);
  if (koniec < 0) { console.error('NIE ZNALAZLEM KONCA TABLICY: ' + kat); process.exit(1); }
  const wstawka = '\n' + lista.map((t) => "    '" + t.replace(/'/g, "\'") + "',").join('\n');
  tekst = tekst.slice(0, koniec) + wstawka + tekst.slice(koniec);
}
fs.writeFileSync(PLIK_PUL, tekst, 'utf8');
console.log('');
console.log('dopisane do src/categoryTitlePools.js');
