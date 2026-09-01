/**
 * Dopisuje pomieszczenia plakatom, ktore ich nie maja.
 *
 * Pomieszczenie jest osia filtra na stronie. Plakat bez zadnego nie pojawia
 * sie w ZADNYM pokoju — nie jest bledny, jest niewidoczny, i nic tego nie
 * zglasza. W bibliotece bylo tak 71 plakatow, wszystkie sprzed 17 sierpnia.
 * Od tamtej pory generator przypisuje je sam, wiec to zaleglosc historyczna,
 * a nie dziura, ktora bedzie sie powtarzac.
 *
 * NIE WYMYSLAMY TU REGUL. Pomieszczenia wynikaja z kategorii i tabela juz
 * istnieje — CATEGORY_ROOM_COLLECTIONS w src/categoryStyles.js, ta sama,
 * z ktorej korzysta generator. Wlasne regulki dalyby drugi, rozjezdzajacy sie
 * zestaw przypisan; tego rodzaju rozjazd kosztowal juz w tym projekcie
 * cztery osobne awarie.
 *
 * Wynik przepuszczamy przez normalizeRooms(), bo to ona decyduje, co realnie
 * trafi na tag — klucz spoza taksonomii zostalby po cichu wyrzucony.
 *
 *   node scripts/uzupelnijPomieszczenia.js             — proba
 *   node scripts/uzupelnijPomieszczenia.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const { normalizeRooms } = require('../src/taxonomy');
const { getRoomCollectionsForCategory } = require('../src/categoryStyles');

const zapis = process.argv.includes('--wykonaj');
const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

const doUzupelnienia = [];
const bezTabeli = [];

for (const p of inv.posters) {
  if (p.kind === 'set') continue;
  if (normalizeRooms(p.roomCollections).length) continue;

  const pokoje = normalizeRooms(getRoomCollectionsForCategory(p.category));
  if (pokoje.length) doUzupelnienia.push({ id: p.id, title: p.title, kategoria: p.category, pokoje });
  else bezTabeli.push(p.title + '  (' + p.category + ')');
}

const wgKategorii = {};
for (const d of doUzupelnienia) wgKategorii[d.kategoria] = (wgKategorii[d.kategoria] || 0) + 1;

console.log('plakatow bez pomieszczenia: ' + (doUzupelnienia.length + bezTabeli.length));
console.log('');
console.log('DO UZUPELNIENIA Z TABELI KATEGORII: ' + doUzupelnienia.length);
Object.entries(wgKategorii).sort((a, b) => b[1] - a[1])
  .forEach((a) => console.log('   ' + String(a[1]).padStart(3) + '  ' + a[0]));

if (bezTabeli.length) {
  console.log('');
  console.log('KATEGORIA NIE MA WPISU W TABELI — trzeba dopisac recznie: ' + bezTabeli.length);
  bezTabeli.forEach((t) => console.log('   ' + t));
}

// Ile przybedzie w kazdym pokoju — to jest realny efekt na stronie.
const przyrost = {};
for (const d of doUzupelnienia) for (const r of d.pokoje) przyrost[r] = (przyrost[r] || 0) + 1;
console.log('');
console.log('PRZYROST W FILTRZE POKOI:');
Object.entries(przyrost).sort((a, b) => b[1] - a[1])
  .forEach((a) => console.log('   +' + String(a[1]).padStart(3) + '  ' + a[0]));

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj.');
  process.exit(0);
}

if (!doUzupelnienia.length) process.exit(0);

// Kartoteke czytamy PONOWNIE tuz przed zapisem. Serwer preview trzyma ja
// w pamieci przez dlugie przebiegi i zapisuje na koniec; nadpisanie jej
// obrazem sprzed analizy byloby dokladnie ta awaria, ktora zabrala juz
// wpisy mockupow i komplet okazji.
const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const wgId = new Map(swieza.posters.map((p) => [p.id, p]));
let zapisane = 0;

for (const d of doUzupelnienia) {
  const cel = wgId.get(d.id);
  if (!cel) continue;
  if (normalizeRooms(cel.roomCollections).length) continue;
  cel.roomCollections = d.pokoje;
  zapisane++;
}

fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');
console.log('');
console.log('zapisane: ' + zapisane);
