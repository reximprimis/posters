/**
 * Porownuje tagi, ktore GENERUJEMY, z tagami, ktorych OCZEKUJE strona.
 *
 * Strona jest headless (Next.js + Storefront API) i filtruje po tagach
 * z wlasnej taksonomii. Kazda rozbieznosc daje pusta kolekcje albo filtr,
 * ktory nic nie zwraca — i nie widac tego ani w eksporcie, ani w sklepie,
 * dopoki ktos nie kliknie. Tak wlasnie "Gabinet" mial zero produktow:
 * strona czeka na room:home-office, a my wysylalismy room:office.
 *
 * Sciezke do repozytorium strony podaje sie argumentem albo zmienna
 * REXIMPRIMIS_WWW.
 *
 *   node scripts/porownajTagiZeStrona.js "D:/Projekty/.../REXIMPRIMIS_V1"
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSV = path.join(ROOT, 'shopify_csv', 'products_export_shopify.csv');

const repo = process.argv[2] || process.env.REXIMPRIMIS_WWW;
if (!repo) {
  console.error('Podaj sciezke do repozytorium strony.');
  process.exit(1);
}
const taksonomia = path.join(repo, 'src', 'lib', 'constants', 'catalog-taxonomy.ts');
if (!fs.existsSync(taksonomia)) {
  console.error('Nie znalazlem catalog-taxonomy.ts w: ' + taksonomia);
  process.exit(1);
}

const src = fs.readFileSync(taksonomia, 'utf8');
const oczekiwane = new Set();
for (const m of src.matchAll(/namespaced\("([a-z]+)",\s*"([a-z0-9-]+)"\)/g)) {
  oczekiwane.add(m[1] + ':' + m[2]);
}

const csv = fs.readFileSync(CSV, 'utf8');
const wysylane = new Map();
for (const m of csv.matchAll(/\b(category|style|aesthetic|room|color|occasion|collection|orientation|size):([a-z0-9-]+)/g)) {
  const t = m[1] + ':' + m[2];
  wysylane.set(t, (wysylane.get(t) || 0) + 1);
}

const brakujace = [...oczekiwane].filter((t) => !wysylane.has(t)).sort();
const nadmiarowe = [...wysylane.keys()].filter((t) => !oczekiwane.has(t)).sort();

console.log('tagow oczekiwanych przez strone: ' + oczekiwane.size);
console.log('tagow w naszym CSV:              ' + wysylane.size);
console.log('');

console.log('STRONA CZEKA, MY NIE WYSYLAMY (' + brakujace.length + ') — te filtry beda puste:');
if (!brakujace.length) console.log('   brak');
for (const t of brakujace) console.log('   ' + t);

console.log('');
console.log('MY WYSYLAMY, STRONA NIE ZNA (' + nadmiarowe.length + ') — te tagi nikt nie odczyta:');
if (!nadmiarowe.length) console.log('   brak');
for (const t of nadmiarowe) console.log('   ' + t + '   (' + wysylane.get(t) + ' wystapien)');

// Para "prawie taka sama" to najczestszy przypadek: literowka albo inny
// wariant slowa. Podpowiadamy ja wprost, bo sama lista roznic tego nie widac.
console.log('');
console.log('PRAWDOPODOBNE PARY DO POGODZENIA:');
let par = 0;
for (const b of brakujace) {
  const [nsB, vB] = b.split(':');
  for (const n of nadmiarowe) {
    const [nsN, vN] = n.split(':');
    if (nsB !== nsN) continue;
    if (vB.includes(vN) || vN.includes(vB)) {
      console.log('   my: ' + n.padEnd(28) + ' → strona: ' + b);
      par++;
    }
  }
}
if (!par) console.log('   brak oczywistych par');

process.exitCode = brakujace.length || nadmiarowe.length ? 1 : 0;
