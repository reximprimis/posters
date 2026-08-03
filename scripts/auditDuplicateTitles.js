/**
 * Audyt kolizji handli Shopify w posters_inventory.json.
 *
 * Handle produktu liczy sie z samego tytulu, wiec dwa plakaty o tym samym tytule
 * (nawet w roznych kategoriach lub stylach) zlewaja sie przy imporcie w jeden
 * produkt - jeden z nich przepada po cichu.
 *
 * Skrypt niczego nie zmienia. Konczy sie kodem 1, gdy znajdzie kolizje,
 * dzieki czemu nadaje sie tez do uzycia w CI lub w hooku.
 *
 * Uzycie:
 *   npm run audit:duplicates
 *   node scripts/auditDuplicateTitles.js --all   (takze niezatwierdzone)
 */

const fs = require('fs');
const path = require('path');
const { findHandleCollisions } = require('../src/posterNameGuard');
const { toPosterHandle } = require('../src/posterTitle');

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'posters_inventory.json');

function main() {
  const includeAll = process.argv.slice(2).includes('--all');

  if (!fs.existsSync(inventoryPath)) {
    console.error('Brak posters_inventory.json');
    process.exit(1);
  }

  const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const all = Array.isArray(inv.posters) ? inv.posters : [];
  const posters = includeAll ? all : all.filter((p) => p && p.approvedForPrint === true);

  const scope = includeAll ? 'wszystkie rekordy' : 'tylko zatwierdzone (approvedForPrint)';
  console.log(`Audyt kolizji handli — ${scope}`);
  console.log(`Sprawdzanych plakatów: ${posters.length} z ${all.length}\n`);

  const collisions = findHandleCollisions(posters);

  if (collisions.length === 0) {
    const handles = new Set(posters.map((p) => toPosterHandle(p.title)));
    console.log(`✓ Brak kolizji. Unikalnych handli: ${handles.size}`);
    process.exit(0);
  }

  console.log(`✗ Znaleziono ${collisions.length} kolizji:\n`);
  for (const { handle, posters: group } of collisions) {
    console.log(`  handle "${handle}" — ${group.length} plakaty:`);
    for (const p of group) {
      console.log(`      "${p.title}"  [${p.category || '?'} / ${p.artStyle || '?'}]`);
      console.log(`          ${p.imagePath || '(brak imagePath)'}`);
    }
    console.log('');
  }
  console.log('Napraw: zmień pole "title" jednego z plakatów w posters_inventory.json.');
  console.log('Zachowaj tytuł tego plakatu, który jest już opublikowany na sklepie —');
  console.log('zmiana tytułu zmienia handle, a to psuje działający adres produktu.');
  process.exit(1);
}

main();
