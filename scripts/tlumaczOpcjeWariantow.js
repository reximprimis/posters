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

// ── Slownik: angielski tekst -> {sv, cs, da, pl, de} ────────────────────────
// pl/de dopisane 2026-09-17 wieczorem: bulk run pokrywal tylko sv/cs/da, wiec
// PL i DE nadal pokazywaly surowe angielskie etykiety opcji ("(Small)" itd.)
// mimo w pelni przetlumaczonych tytulow/opisow produktow — inny typ zasobu
// tlumaczen (ProductOption/ProductOptionValue), patrz komentarz na gorze pliku.
const DICT = {
  'Size': { sv: 'Storlek', cs: 'Velikost', da: 'Størrelse', pl: 'Rozmiar', de: 'Größe' },
  'Print Style': { sv: 'Trycktyp', cs: 'Styl tisku', da: 'Trykstil', pl: 'Styl wydruku', de: 'Druckstil' },
  'Material': { sv: 'Material', cs: 'Materiál', da: 'Materiale', pl: 'Materiał', de: 'Material' },
  'Paper': { sv: 'Papper', cs: 'Papír', da: 'Papir', pl: 'Papier', de: 'Papier' },
  'Full Bleed': { sv: 'Kant till kant', cs: 'Tisk do krajů', da: 'Kant til kant', pl: 'Pełny nadruk', de: 'Randlos' },
  'White Border': { sv: 'Vit kant', cs: 'Bílý okraj', da: 'Hvid kant', pl: 'Biały margines', de: 'Weißer Rand' },
  '13 × 18 cm (Small)': { sv: '13 × 18 cm (Liten)', cs: '13 × 18 cm (Malý)', da: '13 × 18 cm (Lille)', pl: '13 × 18 cm (Mały)', de: '13 × 18 cm (Klein)' },
  '21 × 30 cm (A4)': { sv: '21 × 30 cm (A4)', cs: '21 × 30 cm (A4)', da: '21 × 30 cm (A4)', pl: '21 × 30 cm (A4)', de: '21 × 30 cm (A4)' },
  '30 × 40 cm (Medium)': { sv: '30 × 40 cm (Mellan)', cs: '30 × 40 cm (Střední)', da: '30 × 40 cm (Mellem)', pl: '30 × 40 cm (Średni)', de: '30 × 40 cm (Mittel)' },
  '40 × 50 cm (Large)': { sv: '40 × 50 cm (Stor)', cs: '40 × 50 cm (Velký)', da: '40 × 50 cm (Stor)', pl: '40 × 50 cm (Duży)', de: '40 × 50 cm (Groß)' },
  '50 × 70 cm (Large)': { sv: '50 × 70 cm (Stor)', cs: '50 × 70 cm (Velký)', da: '50 × 70 cm (Stor)', pl: '50 × 70 cm (Duży)', de: '50 × 70 cm (Groß)' },
  // Some products store the same sizes with height×width swapped (e.g. portrait-first
  // products list "18 × 13" instead of "13 × 18") — the bulk run left every one of
  // these as UNKNOWN because only the width×height spelling was in this dictionary.
  '18 × 13 cm (Small)': { sv: '18 × 13 cm (Liten)', cs: '18 × 13 cm (Malý)', da: '18 × 13 cm (Lille)', pl: '18 × 13 cm (Mały)', de: '18 × 13 cm (Klein)' },
  '30 × 21 cm (A4)': { sv: '30 × 21 cm (A4)', cs: '30 × 21 cm (A4)', da: '30 × 21 cm (A4)', pl: '30 × 21 cm (A4)', de: '30 × 21 cm (A4)' },
  '40 × 30 cm (Medium)': { sv: '40 × 30 cm (Mellan)', cs: '40 × 30 cm (Střední)', da: '40 × 30 cm (Mellem)', pl: '40 × 30 cm (Średni)', de: '40 × 30 cm (Mittel)' },
  '50 × 40 cm (Large)': { sv: '50 × 40 cm (Stor)', cs: '50 × 40 cm (Velký)', da: '50 × 40 cm (Stor)', pl: '50 × 40 cm (Duży)', de: '50 × 40 cm (Groß)' },
  '70 × 50 cm (Large)': { sv: '70 × 50 cm (Stor)', cs: '70 × 50 cm (Velký)', da: '70 × 50 cm (Stor)', pl: '70 × 50 cm (Duży)', de: '70 × 50 cm (Groß)' },
  // "Create your own photo poster" uses its own plain "W x H cm" values with no
  // (Small)/(Medium)/(Large) suffix and a lowercase ascii "x" — a different
  // format from every other product, so it never matched the dict above.
  '13 x 18 cm': { sv: '13 x 18 cm', cs: '13 x 18 cm', da: '13 x 18 cm', pl: '13 x 18 cm', de: '13 x 18 cm' },
  '21 x 30 cm': { sv: '21 x 30 cm', cs: '21 x 30 cm', da: '21 x 30 cm', pl: '21 x 30 cm', de: '21 x 30 cm' },
  '30 x 40 cm': { sv: '30 x 40 cm', cs: '30 x 40 cm', da: '30 x 40 cm', pl: '30 x 40 cm', de: '30 x 40 cm' },
  '40 x 50 cm': { sv: '40 x 50 cm', cs: '40 x 50 cm', da: '40 x 50 cm', pl: '40 x 50 cm', de: '40 x 50 cm' },
  '50 x 70 cm': { sv: '50 x 70 cm', cs: '50 x 70 cm', da: '50 x 70 cm', pl: '50 x 70 cm', de: '50 x 70 cm' },
};
const LOCALES = ['sv', 'cs', 'da', 'pl', 'de'];

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

function doneLocalesFor(progress, resourceId) {
  const entry = progress[resourceId];
  if (!entry) return [];
  // Old progress entries (pre pl/de) only recorded a flat `done: true` for
  // whatever LOCALES existed at the time (sv/cs/da) — treat those as done for
  // exactly that set, not for locales added since.
  if (Array.isArray(entry.doneLocales)) return entry.doneLocales;
  if (entry.done) return ['sv', 'cs', 'da'];
  return [];
}

async function translateResource(resourceId, englishText, progress) {
  const entry = DICT[englishText];
  if (!entry) return { unknown: true, text: englishText };

  const already = doneLocalesFor(progress, resourceId);
  const pending = LOCALES.filter((loc) => !already.includes(loc));
  if (pending.length === 0) return { skipped: true };

  const { json: tj, cost: tc } = await adminGraphql(TRANSLATABLE_QUERY, { id: resourceId });
  await throttleGuard(tc);
  const nameField = tj.data && tj.data.translatableResource && tj.data.translatableResource.translatableContent.find((c) => c.key === 'name');
  if (!nameField) return { noDigest: true };

  const translations = pending.map((loc) => ({
    locale: loc,
    key: 'name',
    value: entry[loc],
    translatableContentDigest: nameField.digest,
  }));

  if (isDryRun) {
    console.log(`[dry-run] ${resourceId} "${englishText}" -> locales ${pending.join(',')}`, entry);
    return { ok: true, dryRun: true };
  }

  const { json: rj, cost: rc } = await adminGraphql(REGISTER_MUTATION, { resourceId, translations });
  await throttleGuard(rc);
  const errors = rj.data && rj.data.translationsRegister && rj.data.translationsRegister.userErrors;
  if (errors && errors.length) return { error: errors };
  progress[resourceId] = { doneLocales: [...already, ...pending], text: englishText };
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
