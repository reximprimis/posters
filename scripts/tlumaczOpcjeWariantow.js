/**
 * Tlumaczy nazwy i wartosci opcji wariantow (ProductOption / ProductOptionValue)
 * - "Size"/"Print Style" i ich wartosci ("13 x 18 cm (Small)", "Full Bleed" itd.)
 * - na SV/CS/DA. To INNY typ zasobu tlumaczen niz tytul/opis produktu (ktory byl
 * juz przetlumaczony wczesniej) - stad kazdy produkt mial te same angielskie
 * etykiety rozmiaru/stylu druku niezaleznie od jezyka strony.
 *
 * Tekst jest identyczny na kazdym produkcie (ten sam zestaw 2 opcji / 7 wartosci
 * dla plakatow, 1 opcja / 5 wartosci dla zestawow) - wiec tlumaczymy raz, po czym
 * rejestrujemy te same gotowe teksty pod GID kazdego produktu z osobna (kazdy
 * produkt ma WLASNE ProductOption/ProductOptionValue GID, mimo identycznej tresci).
 * Produkty typu "ramka" maja tylko techniczna opcje "Title"/"Default Title" -
 * pomijane (ukryte w UI, nie wymagaja tlumaczenia).
 *
 *   node scripts/tlumaczOpcjeWariantow.js --dry-run
 *   node scripts/tlumaczOpcjeWariantow.js --dry-run --limit=5
 *   node scripts/tlumaczOpcjeWariantow.js
 */

'use strict';

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';

const isDryRun = process.argv.includes('--dry-run');
const limitArg = (process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1];
const limit = limitArg ? Number(limitArg) : 0;

const PROGRESS_PATH = path.join(ROOT, 'tlumaczenia_opcje_progress.json');

// ── Slownik: angielski tekst -> {sv, cs, da} ────────────────────────────────
const DICT = {
  'Size': { sv: 'Storlek', cs: 'Velikost', da: 'Størrelse' },
  'Print Style': { sv: 'Trycktyp', cs: 'Styl tisku', da: 'Trykstil' },
  'Material': { sv: 'Material', cs: 'Materiál', da: 'Materiale' },
  'Paper': { sv: 'Papper', cs: 'Papír', da: 'Papir' },
  'Full Bleed': { sv: 'Kant till kant', cs: 'Tisk do krajů', da: 'Kant til kant' },
  'White Border': { sv: 'Vit kant', cs: 'Bílý okraj', da: 'Hvid kant' },
  '13 × 18 cm (Small)': { sv: '13 × 18 cm (Liten)', cs: '13 × 18 cm (Malý)', da: '13 × 18 cm (Lille)' },
  '21 × 30 cm (A4)': { sv: '21 × 30 cm (A4)', cs: '21 × 30 cm (A4)', da: '21 × 30 cm (A4)' },
  '30 × 40 cm (Medium)': { sv: '30 × 40 cm (Mellan)', cs: '30 × 40 cm (Střední)', da: '30 × 40 cm (Mellem)' },
  '40 × 50 cm (Large)': { sv: '40 × 50 cm (Stor)', cs: '40 × 50 cm (Velký)', da: '40 × 50 cm (Stor)' },
  '50 × 70 cm (Large)': { sv: '50 × 70 cm (Stor)', cs: '50 × 70 cm (Velký)', da: '50 × 70 cm (Stor)' },
  // Some products store the same sizes with height×width swapped (e.g. portrait-first
  // products list "18 × 13" instead of "13 × 18") — the bulk run left every one of
  // these as UNKNOWN because only the width×height spelling was in this dictionary.
  '18 × 13 cm (Small)': { sv: '18 × 13 cm (Liten)', cs: '18 × 13 cm (Malý)', da: '18 × 13 cm (Lille)' },
  '30 × 21 cm (A4)': { sv: '30 × 21 cm (A4)', cs: '30 × 21 cm (A4)', da: '30 × 21 cm (A4)' },
  '40 × 30 cm (Medium)': { sv: '40 × 30 cm (Mellan)', cs: '40 × 30 cm (Střední)', da: '40 × 30 cm (Mellem)' },
  '50 × 40 cm (Large)': { sv: '50 × 40 cm (Stor)', cs: '50 × 40 cm (Velký)', da: '50 × 40 cm (Stor)' },
  '70 × 50 cm (Large)': { sv: '70 × 50 cm (Stor)', cs: '70 × 50 cm (Velký)', da: '70 × 50 cm (Stor)' },
};
const LOCALES = ['sv', 'cs', 'da'];

async function adminGraphql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  return { json, cost: json.extensions && json.extensions.cost };
}

async function throttleGuard(cost) {
  if (!cost || !cost.throttleStatus) return;
  const { currentlyAvailable, restoreRate } = cost.throttleStatus;
  if (currentlyAvailable < 300) {
    const waitMs = Math.ceil((300 - currentlyAvailable) / restoreRate) * 1000 + 500;
    await new Promise((res) => setTimeout(res, waitMs));
  }
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_PATH)) return {};
  return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
}
function saveProgress(data) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const PRODUCTS_PAGE_QUERY = `
  query ($cursor: String) {
    products(first: 50, after: $cursor, query: "-product_type:ramka") {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        options { id name optionValues { id name } }
      }
    }
  }
`;

async function fetchAllProducts() {
  const all = [];
  let cursor = null;
  for (;;) {
    const { json, cost } = await adminGraphql(PRODUCTS_PAGE_QUERY, { cursor });
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    const page = json.data.products;
    all.push(...page.nodes);
    await throttleGuard(cost);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
    if (limit && all.length >= limit) break;
  }
  return limit ? all.slice(0, limit) : all;
}

const TRANSLATABLE_QUERY = `
  query ($id: ID!) {
    translatableResource(resourceId: $id) {
      translatableContent { key value digest locale }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation ($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      userErrors { field message }
    }
  }
`;

async function translateResource(resourceId, englishText, progress) {
  if (progress[resourceId] && progress[resourceId].done) return { skipped: true };
  const entry = DICT[englishText];
  if (!entry) return { unknown: true, text: englishText };

  const { json: tj, cost: tc } = await adminGraphql(TRANSLATABLE_QUERY, { id: resourceId });
  await throttleGuard(tc);
  const nameField = tj.data && tj.data.translatableResource && tj.data.translatableResource.translatableContent.find((c) => c.key === 'name');
  if (!nameField) return { noDigest: true };

  const translations = LOCALES.map((loc) => ({
    locale: loc,
    key: 'name',
    value: entry[loc],
    translatableContentDigest: nameField.digest,
  }));

  if (isDryRun) {
    console.log(`[dry-run] ${resourceId} "${englishText}" ->`, entry);
    return { ok: true, dryRun: true };
  }

  const { json: rj, cost: rc } = await adminGraphql(REGISTER_MUTATION, { resourceId, translations });
  await throttleGuard(rc);
  const errors = rj.data && rj.data.translationsRegister && rj.data.translationsRegister.userErrors;
  if (errors && errors.length) return { error: errors };
  progress[resourceId] = { done: true, text: englishText };
  return { ok: true };
}

(async () => {
  console.log(isDryRun ? 'DRY RUN — no writes' : 'LIVE RUN');
  const progress = loadProgress();
  const products = await fetchAllProducts();
  console.log(`Products to process: ${products.length}`);

  let ok = 0, skipped = 0, errors = 0, unknown = 0;
  for (const [i, product] of products.entries()) {
    for (const option of product.options) {
      if (option.name === 'Title') continue; // technical default, hidden in UI
      const r1 = await translateResource(option.id, option.name, progress);
      if (r1.ok) ok++; else if (r1.skipped) skipped++; else if (r1.unknown) { unknown++; console.log('UNKNOWN option text:', r1.text, 'on', product.handle); }
      else if (r1.error) { errors++; console.log('ERROR', product.handle, option.id, r1.error); }

      for (const value of option.optionValues) {
        const r2 = await translateResource(value.id, value.name, progress);
        if (r2.ok) ok++; else if (r2.skipped) skipped++; else if (r2.unknown) { unknown++; console.log('UNKNOWN value text:', r2.text, 'on', product.handle); }
        else if (r2.error) { errors++; console.log('ERROR', product.handle, value.id, r2.error); }
      }
    }
    if (!isDryRun && (i + 1) % 25 === 0) saveProgress(progress);
    if ((i + 1) % 50 === 0) console.log(`... ${i + 1}/${products.length} products (ok=${ok} skipped=${skipped} errors=${errors} unknown=${unknown})`);
  }
  if (!isDryRun) saveProgress(progress);
  console.log(`DONE. ok=${ok} skipped=${skipped} errors=${errors} unknown=${unknown}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
