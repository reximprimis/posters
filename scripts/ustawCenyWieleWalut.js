/**
 * Ustawia stale ceny w cennikach Sweden (SEK), Czechia (CZK) i Denmark (DKK)
 * - ten sam mechanizm co ustawCenyEurEU.js, ale dla trzech walut naraz, z
 * rozna skala zaokraglania:
 *   - SEK, DKK: koncowka ",95" (jak EUR/PLN)
 *   - CZK: pelne korony konczace sie na "9" (halerze nie istnieja od dawna,
 *     ceny w Czechach praktycznie zawsze sa bez grosza)
 *
 *   node scripts/ustawCenyWieleWalut.js --dry-run
 *   node scripts/ustawCenyWieleWalut.js --dry-run --limit=10
 *   node scripts/ustawCenyWieleWalut.js --currency=CZK   - tylko jedna waluta
 *   node scripts/ustawCenyWieleWalut.js                  - wszystkie 3, caly katalog
 */

'use strict';

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';

const CURRENCIES = {
  SEK: { priceListId: 'gid://shopify/PriceList/53614084483', style: 'ninety-five' },
  CZK: { priceListId: 'gid://shopify/PriceList/53614117251', style: 'whole-nine' },
  DKK: { priceListId: 'gid://shopify/PriceList/53614150019', style: 'ninety-five' },
};

const CORE_PRODUCT_TYPES = ['poster', 'poster set', 'gallery set', 'ramka'];

const isDryRun = process.argv.includes('--dry-run');
const onlyHandle = (process.argv.find((a) => a.startsWith('--handle=')) || '').split('=')[1] || null;
const limitArg = (process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1];
const limit = limitArg ? Number(limitArg) : 0;
const onlyCurrency = (process.argv.find((a) => a.startsWith('--currency=')) || '').split('=')[1] || null;

function loadProgress(currency) {
  const p = path.join(ROOT, `ceny_${currency.toLowerCase()}_progress.json`);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function saveProgress(currency, data) {
  const p = path.join(ROOT, `ceny_${currency.toLowerCase()}_progress.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function adminGraphql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  const cost = json.extensions && json.extensions.cost;
  return { json, cost };
}

async function throttleGuard(cost) {
  if (!cost || !cost.throttleStatus) return;
  const { currentlyAvailable, restoreRate } = cost.throttleStatus;
  if (currentlyAvailable < 300) {
    const waitMs = Math.ceil((300 - currentlyAvailable) / restoreRate) * 1000 + 500;
    await new Promise((res) => setTimeout(res, waitMs));
  }
}

async function fetchFxRates() {
  const r = await fetch('https://api.frankfurter.app/latest?from=PLN&to=SEK,CZK,DKK');
  const j = await r.json();
  return j.rates;
}

/** SEK/DKK: zaokragla do najblizszej koncowki ",95" (min. 0.95). */
function roundNinetyFive(value) {
  if (!(value > 0)) return 0.95;
  const rounded = Math.round(value - 0.95) + 0.95;
  return Math.max(0.95, Math.round(rounded * 100) / 100);
}

/** CZK: zaokragla do najblizszej pelnej korony konczacej sie na "9" (min. 9). */
function roundWholeNine(value) {
  if (!(value > 0)) return 9;
  const rounded = Math.round((value + 1) / 10) * 10 - 1;
  return Math.max(9, rounded);
}

function roundFor(style, value) {
  return style === 'whole-nine' ? roundWholeNine(value) : roundNinetyFive(value);
}

function computePricing(plnPrice, plnCompareAt, fxRate, style) {
  const price = roundFor(style, plnPrice * fxRate);
  if (!plnCompareAt || plnCompareAt <= plnPrice) {
    return { price, compareAtPrice: null };
  }
  const ratio = plnCompareAt / plnPrice;
  const compareAtPrice = roundFor(style, price * ratio);
  return { price, compareAtPrice };
}

async function fetchAllProducts() {
  const products = [];
  let cursor = null;
  const typeFilter = CORE_PRODUCT_TYPES.map((t) => `product_type:'${t}'`).join(' OR ');
  const searchQuery = onlyHandle ? `handle:${onlyHandle}` : `(${typeFilter})`;
  for (;;) {
    const q = `query($cursor: String) {
      products(first: 50, after: $cursor, query: "${searchQuery}") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            title
            handle
            variants(first: 30) {
              edges { node { id price compareAtPrice } }
            }
          }
        }
      }
    }`;
    const { json, cost } = await adminGraphql(q, { cursor });
    await throttleGuard(cost);
    if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
    const page = json.data.products;
    for (const edge of page.edges) products.push(edge.node);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
    if (limit && products.length >= limit) break;
  }
  return limit ? products.slice(0, limit) : products;
}

async function applyFixedPrices(priceListId, prices) {
  const mutation = `mutation priceListFixedPricesAdd($priceListId: ID!, $prices: [PriceListPriceInput!]!) {
    priceListFixedPricesAdd(priceListId: $priceListId, prices: $prices) {
      userErrors { field message }
    }
  }`;
  const { json, cost } = await adminGraphql(mutation, { priceListId, prices });
  await throttleGuard(cost);
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data.priceListFixedPricesAdd;
}

async function runForCurrency(currency, cfg, products, fxRate) {
  console.log(`\n=== ${currency} (kurs PLN->${currency}: ${fxRate}, styl: ${cfg.style}) ===`);
  const progress = isDryRun ? {} : loadProgress(currency);
  let ok = 0, skip = 0, blad = 0, variantsSet = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!isDryRun && progress[p.handle]) { skip += 1; continue; }

    const variants = p.variants.edges.map((e) => e.node);
    const pricesForApi = [];
    const preview = [];

    for (const v of variants) {
      const plnPrice = Number(v.price);
      const plnCompareAt = v.compareAtPrice ? Number(v.compareAtPrice) : null;
      if (!plnPrice) continue;
      const { price, compareAtPrice } = computePricing(plnPrice, plnCompareAt, fxRate, cfg.style);
      preview.push({ plnPrice, plnCompareAt, price, compareAtPrice });
      pricesForApi.push({
        variantId: v.id,
        price: { amount: price.toFixed(2), currencyCode: currency },
        ...(compareAtPrice ? { compareAtPrice: { amount: compareAtPrice.toFixed(2), currencyCode: currency } } : {}),
      });
    }

    if (isDryRun) {
      console.log(`[${i + 1}/${products.length}] ${p.title} (${p.handle})`);
      for (const row of preview) {
        console.log(
          `   ${row.plnPrice.toFixed(2)} zl${row.plnCompareAt ? ` (was ${row.plnCompareAt.toFixed(2)} zl)` : ''}` +
          `  ->  ${row.price.toFixed(2)} ${currency}${row.compareAtPrice ? ` (was ${row.compareAtPrice.toFixed(2)} ${currency})` : ''}`
        );
      }
      continue;
    }

    process.stdout.write(`[${i + 1}/${products.length}] ${p.handle} (${pricesForApi.length} wariantow)... `);
    try {
      for (let b = 0; b < pricesForApi.length; b += BATCH_SIZE) {
        const batch = pricesForApi.slice(b, b + BATCH_SIZE);
        const result = await applyFixedPrices(cfg.priceListId, batch);
        if (result.userErrors && result.userErrors.length) {
          throw new Error(JSON.stringify(result.userErrors));
        }
        variantsSet += batch.length;
      }
      progress[p.handle] = { done: true, at: new Date().toISOString(), fxRate };
      saveProgress(currency, progress);
      console.log('OK');
      ok += 1;
    } catch (e) {
      console.log('BLAD: ' + e.message);
      blad += 1;
    }
  }

  console.log(isDryRun
    ? `${currency}: dry-run zakonczony (${products.length} produktow podglodowych).`
    : `${currency}: gotowe - ${ok} OK, ${skip} pominietych, ${blad} bledow, ${variantsSet} wariantow ustawionych.`);
}

(async () => {
  if (!domain || !token) throw new Error('Brak SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN w .env');

  const fxRates = await fetchFxRates();
  const products = await fetchAllProducts();
  console.log(`Produktow do przetworzenia: ${products.length}`);
  console.log(isDryRun ? 'TRYB DRY-RUN: nic nie zostanie zapisane.' : 'TRYB REALNY.');

  const currencies = onlyCurrency ? [onlyCurrency] : Object.keys(CURRENCIES);
  for (const currency of currencies) {
    const cfg = CURRENCIES[currency];
    if (!cfg) throw new Error(`Nieznana waluta: ${currency}`);
    await runForCurrency(currency, cfg, products, fxRates[currency]);
  }
})().catch((e) => {
  console.error('BLAD:', e.message);
  process.exit(1);
});
