/**
 * Pobiera realny stan magazynowy ram z zywego sklepu (Storefront API,
 * tag:type_frame) i wpisuje go do rekordow kind:'frame' w kartotece,
 * pomniejszony o 10 sztuk — bufor na blad przy inwentaryzacji, zeby CSV
 * nigdy nie obiecal wiecej sztuk, niz faktycznie jest na polce.
 *
 * Dopasowanie po handle — TYM SAMYM, ktorego uzywa eksport (rama.handlePrefix
 * + '-' + rozmiar + '-cm', patrz src/ramkiKatalog.js). Handle w Shopify sa
 * jedynym pewnym kluczem: tytuly czasem sa po angielsku, czasem po polsku.
 *
 *   node scripts/pobierzStanRamek.js             — proba (pokazuje co by wpisal)
 *   node scripts/pobierzStanRamek.js --wykonaj   — zapis
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const BUFOR = 10;

const { storefrontQuery } = require('../src/shopifyHeadless');

const zapis = process.argv.includes('--wykonaj');

async function pobierzWszystkie() {
  const query = `
    query($cursor: String) {
      products(first: 50, after: $cursor, query: "tag:type_frame") {
        pageInfo { hasNextPage endCursor }
        nodes {
          handle
          title
          variants(first: 1) { nodes { quantityAvailable } }
        }
      }
    }
  `;
  let cursor = null;
  const out = [];
  for (;;) {
    const data = await storefrontQuery(query, { cursor });
    const p = data.products;
    for (const n of p.nodes) {
      out.push({ handle: n.handle, title: n.title, qty: n.variants.nodes[0] ? n.variants.nodes[0].quantityAvailable : null });
    }
    if (!p.pageInfo.hasNextPage) break;
    cursor = p.pageInfo.endCursor;
  }
  return out;
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const ramki = inv.posters.filter((p) => p.kind === 'frame');
  const byHandle = new Map(ramki.map((r) => [r.handle, r]));

  console.log('Pobieram stan z zywego sklepu (tag:type_frame)...');
  const live = await pobierzWszystkie();
  console.log('Znaleziono w sklepie: ' + live.length + ' produktow z tagiem type_frame.');

  const nieznalezione = [];
  const doZapisu = [];
  for (const rec of ramki) {
    const match = live.find((x) => x.handle === rec.handle);
    if (!match || match.qty == null) { nieznalezione.push(rec.handle); continue; }
    const stock = Math.max(0, match.qty - BUFOR);
    doZapisu.push({ handle: rec.handle, title: rec.title, qtyZywy: match.qty, stock });
  }

  const wSklepieBrakUNas = live.filter((x) => !byHandle.has(x.handle));

  console.log('');
  console.log('Do zapisania: ' + doZapisu.length + ' / ' + ramki.length);
  doZapisu.forEach((d) => console.log('   ' + d.handle + '  zywy=' + d.qtyZywy + '  ->  stock=' + d.stock));

  if (nieznalezione.length) {
    console.log('');
    console.log('NIE ZNALEZIONO w sklepie (bez zmiany stock): ' + nieznalezione.length);
    nieznalezione.forEach((h) => console.log('   ' + h));
  }
  if (wSklepieBrakUNas.length) {
    console.log('');
    console.log('W SKLEPIE JEST, A U NAS BRAK REKORDU (nie dotyka tego skryptu):');
    wSklepieBrakUNas.forEach((x) => console.log('   ' + x.handle + '  "' + x.title + '"  qty=' + x.qty));
  }

  if (!zapis) {
    console.log('');
    console.log('To byla proba. Dodaj --wykonaj.');
    process.exit(0);
  }

  const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const swiezeByHandle = new Map(swieza.posters.filter((p) => p.kind === 'frame').map((p) => [p.handle, p]));
  for (const d of doZapisu) {
    const rec = swiezeByHandle.get(d.handle);
    if (!rec) continue;
    rec.stock = d.stock;
    rec.stockSyncedAt = new Date().toISOString();
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');
  console.log('');
  console.log('Zapisano stan dla ' + doZapisu.length + ' rekordow.');
})().catch((e) => { console.error(e); process.exit(1); });
