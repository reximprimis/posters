/**
 * Kolejnosc 23 plakatow w kolekcji "best".
 *
 * Kolekcja jest sortowana MANUAL, a strona glowna bierze z niej pierwsze N
 * pozycji do szyny bestsellerow. Dopisanie pietnastu nowych NA KONIEC nic by
 * nie zmienilo na stronie glownej — szyna dalej pokazywalaby te same osiem.
 * Dlatego przeplatamy: nowe wchodza miedzy stare, a sasiadujace pozycje nie
 * moga byc z tej samej kategorii, zeby szyna nie wygladala na jeden motyw.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const inv = require('../posters_inventory.json');
const { toPosterHandle } = require('../src/posterTitle');

const STARE = ['morning-brew-embrace', 'flowing-lotus-serenity', 'black-miniature-schnauzer-portrait',
  'majestic-eagle-in-flight', 'golden-lemons-in-sunlight', 'crane-in-still-flight',
  'perfume-bottle-light', 'bamboo-grove-at-dawn'];
const NOWE = ['Delicate Magnolia Stem', 'Magnolia Over Still Water', 'Maple Leaves Autumn',
  'Soft Botanical Branch', 'Wild Flower Line Study', 'Morning Brew Ritual', 'Teapot Serenity Ritual',
  'Hand Holding Stem', 'Single Line Portrait', 'Lake Reflection Calm', 'Mist Over Mountain Peaks',
  'Misty Peaks at Dawn', 'Lighthouse Reflecting Calm Waters', 'Waves Crashing on Dunes',
  'Good Morning Lettering'];

const wgHandle = new Map();
// Zestawy TEZ musza tu byc: 'Bamboo Grove at Dawn' siedzi w kolekcji best
// jako zestaw, a pominiecie zestawow dawalo mu kategorie '?' i wypadal
// z przeplotu — ladowal obok drugiej botaniki.
for (const p of inv.posters) wgHandle.set(toPosterHandle(p.title), p);

const pula = [];
for (const h of STARE) {
  const p = wgHandle.get(h);
  pula.push({ handle: h, tytul: p ? p.title : h, kat: p ? p.category : '?', nowy: false });
}
for (const t of NOWE) {
  const p = inv.posters.find((x) => x.title === t);
  pula.push({ handle: toPosterHandle(t), tytul: t, kat: p.category, nowy: true });
}

// Przeplot zachlanny: bierz kolejno z najliczniejszej kategorii, ktora nie jest
// ta sama co ostatnio wybrana. Nowe maja pierwszenstwo przy remisie, bo to one
// maja sie pokazac na stronie glownej.
const wgKat = new Map();
for (const x of pula) {
  if (!wgKat.has(x.kat)) wgKat.set(x.kat, []);
  wgKat.get(x.kat).push(x);
}
for (const lista of wgKat.values()) lista.sort((a, b) => (b.nowy ? 1 : 0) - (a.nowy ? 1 : 0));

const out = [];
let poprzednia = null;
while (out.length < pula.length) {
  const kandydaci = [...wgKat.entries()].filter(([k, l]) => l.length && k !== poprzednia);
  const zrodlo = (kandydaci.length ? kandydaci : [...wgKat.entries()].filter(([, l]) => l.length))
    .sort((a, b) => b[1].length - a[1].length)[0];
  const x = zrodlo[1].shift();
  out.push(x);
  poprzednia = x.kat;
}

console.log('KOLEJNOSC KOLEKCJI best — ' + out.length + ' pozycji');
console.log('');
out.forEach((x, i) => {
  console.log('  ' + String(i + 1).padStart(2) + '  ' + (x.nowy ? 'NOWY ' : '     ') +
    x.handle.padEnd(36) + x.kat);
});

const plik = path.join(__dirname, '..', '_kopie_kartoteki', '_best_kolejnosc.txt');
fs.writeFileSync(plik, out.map((x, i) => (i + 1) + '\t' + x.handle + '\t' + x.tytul + '\t' + x.kat + (x.nowy ? '\tNOWY' : '')).join('\n') + '\n', 'utf8');
console.log('');
console.log('zapisane: ' + plik);
