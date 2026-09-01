/**
 * Przypisuje plakatom OKAZJE — os, ktora strona zna, a my mielismy pusta.
 *
 * Strona filtruje po tagach occasion:* (16 wartosci w catalog-taxonomy.ts),
 * ale w kartotece pole occasions bylo puste przy WSZYSTKICH 288 plakatach.
 * Szesnascie filtrow i kolekcji sezonowych nie mialo czego pokazac.
 *
 * Nie zgadujemy z powietrza: okazje wynikaja z trzech przeslanek, ktore juz
 * mamy — kategorii, slow w tytule i wyliczonych kolorow. Sezon dostaja tylko
 * plakaty, ktore faktycznie go niosa, bo kolekcja jesienna z przypadkowa
 * polowa katalogu przestaje cokolwiek znaczyc.
 *
 *   node scripts/przypiszOkazje.js             — proba i rozklad
 *   node scripts/przypiszOkazje.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const zapis = process.argv.includes('--wykonaj');

const { REGULY } = require('../src/regulyOkazji');


/**
 * KLUCZ SPOZA TAKSONOMII MA ZATRZYMAC SKRYPT, A NIE PRZEJSC.
 *
 * Trzy reguly pisaly klucze, ktorych taksonomia nie zna: "valentines-day"
 * zamiast "valentines", "party-fun" zamiast "party", "first-day-of-school"
 * zamiast "einschulung". normalizeOccasions() takie klucze po cichu WYRZUCA,
 * wiec 43 plakaty mialy w kartotece okazje, ktora nigdy nie dotarla do
 * Shopify — a pozycje "Walentynki" i "Impreza" w menu sklepu byly puste,
 * mimo ze towar istnial. Nic nie zglaszalo bledu na zadnym etapie.
 *
 * Sprawdzenie przy starcie, bo pomylka w kluczu jest literowka, a jej skutek
 * to niewidoczna pusta kolekcja.
 */
const { isKnownOccasion } = require('../src/taxonomy');
const zleKlucze = [...new Set(REGULY.map((r) => r.okazja).filter((k) => !isKnownOccasion(k)))];
if (zleKlucze.length) {
  console.error('KLUCZE SPOZA TAKSONOMII: ' + zleKlucze.join(', '));
  console.error('normalizeOccasions() wyrzuci je po cichu — popraw w REGULY albo dopisz do taxonomy.js');
  process.exit(1);
}


const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const zatwierdzone = inv.posters.filter((p) => p.approvedForPrint);

const rozklad = {};
const zmiany = [];
for (const p of zatwierdzone) {
  const t = String(p.title || '').toLowerCase();
  const kolory = p.colors || [];
  const okazje = [];
  for (const r of REGULY) {
    try {
      if (r.test(p, t, kolory) && !okazje.includes(r.okazja)) okazje.push(r.okazja);
    } catch (_) { /* regula nie pasuje do rekordu */ }
  }
  okazje.forEach((o) => (rozklad[o] = (rozklad[o] || 0) + 1));
  const obecne = (p.occasions || []).join(',');
  if (okazje.join(',') !== obecne) zmiany.push({ rekord: p, okazje });
}

console.log('zatwierdzonych: ' + zatwierdzone.length);
console.log('do zmiany: ' + zmiany.length);
console.log('');
console.log('ROZKLAD OKAZJI:');
const posort = Object.entries(rozklad).sort((a, b) => b[1] - a[1]);
for (const [k, v] of posort) console.log('   ' + String(v).padStart(4) + '  occasion:' + k);
const bez = zatwierdzone.filter((p) => {
  const t = String(p.title || '').toLowerCase();
  return !REGULY.some((r) => { try { return r.test(p, t, p.colors || []); } catch (_) { return false; } });
}).length;
console.log('');
console.log('bez zadnej okazji: ' + bez + ' (to normalne — nie kazdy plakat jest sezonowy)');

console.log('');
console.log('PRZYKLADY occasion:autumn:');
zatwierdzone
  .filter((p) => {
    const t = String(p.title || '').toLowerCase();
    return REGULY.filter((r) => r.okazja === 'autumn').some((r) => r.test(p, t, p.colors || []));
  })
  .slice(0, 10)
  .forEach((p) => console.log('   ' + String(p.title).slice(0, 34).padEnd(36) + (p.colors || []).join(', ')));

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
  process.exit(0);
}

// Kartoteke wczytujemy ponownie tuz przed zapisem — miedzy odczytem a zapisem
// mogl ja zmienic serwer podgladu albo trwajaca generacja.
const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const wgId = new Map(zmiany.map((z) => [z.rekord.id, z.okazje]));
let zapisanych = 0;
for (const p of swieza.posters) {
  if (wgId.has(p.id)) {
    p.occasions = wgId.get(p.id);
    zapisanych++;
  }
}
fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2), 'utf8');
console.log('');
console.log('zapisane: ' + zapisanych);
