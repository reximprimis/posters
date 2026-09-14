/**
 * Ustawia STALE ceny EUR (zamiast automatycznej konwersji kursem na zywo)
 * w price liscie rynku "European Union" (obejmuje DE i reszte strefy euro).
 *
 * Dotychczas kazdy wariant mial wpis typu RELATIVE z 0% korekta - Shopify
 * po prostu przeliczal cene PLN na EUR biezacym kursem w locie, stad brzydkie
 * grosze (2,77 EUR, 5,57 EUR). Ten skrypt liczy cene w EUR wg kursu, zaokragla
 * do najblizszej koncowki ",95" i ustawia jako FIXED w price liscie -
 * cena przekreslona (compareAt) liczona jest tak, zeby zachowac DOKLADNIE
 * ten sam procent rabatu co w PLN (np. jesli PLN ma compareAt = 2x price,
 * EUR tez dostanie compareAt = ~2x price po zaokragleniu).
 *
 *   node scripts/ustawCenyEurEU.js --dry-run           - pokazuje co by zrobil, nic nie zapisuje
 *   node scripts/ustawCenyEurEU.js --dry-run --limit=10
 *   node scripts/ustawCenyEurEU.js --limit=5            - realnie ustawia dla pierwszych 5 produktow
 *   node scripts/ustawCenyEurEU.js                      - caly katalog, wznawialny
 *   node scripts/ustawCenyEurEU.js --handle=jakis-produkt
 */

'use strict';

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const PROGRESS = path.join(ROOT, 'ceny_eur_progress.json');

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';

const PRICE_LIST_ID = 'gid://shopify/PriceList/53610774915'; // EU - Euro zone

const isDryRun = process.argv.includes('--dry-run');
const onlyHandle = (process.argv.find((a) => a.startsWith('--handle=')) || '').split('=')[1] || null;
const limitArg = (process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1];
const limit = limitArg ? Number(limitArg) : 0;
const rateArg = (process.argv.find((a) => a.startsWith('--rate=')) || '').split('=')[1];

function loadProgress() {
  if (!fs.existsSync(PROGRESS)) return {};
  return JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
}
function saveProgress(p) {
  fs.writeFileSync(PROGRESS, JSON.stringify(p, null, 2) + '\n', 'utf8');
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

async function fetchFxRate() {
  if (rateArg) return Number(rateArg);
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=PLN&to=EUR');
    const j = await r.json();
    if (j && j.rates && j.rates.EUR) return j.rates.EUR;
  } catch (e) {
    // fall through to fallback
  }
  return 0.2312; // ostatni znany kurs jako fallback, gdyby API bylo niedostepne
}

/** Zaokragla do najblizszej wartosci konczacej sie na ",95" (min. 0.95). */
function roundToNinetyFive(value) {
  if (!(value > 0)) return 0.95;
  const rounded = Math.round(value - 0.95) + 0.95;
  return Math.max(0.95, Math.round(rounded * 100) / 100);
}

/**
 * Liczy pare {price, compareAtPrice} w EUR z pary PLN, zachowujac ten sam
 * procentowy rabat (compareAt/price) co w PLN, zaokraglone do ",95".
 */
function computeEurPricing(plnPrice, plnCompareAt, fxRate) {
  const priceEur = roundToNinetyFive(plnPrice * fxRate);
  if (!plnCompareAt || plnCompareAt <= plnPrice) {
    return { price: priceEur, compareAtPrice: null };
  }
  const ratio = plnCompareAt / plnPrice;
  const compareAtEur = roundToNinetyFive(priceEur * ratio);
  return { price: priceEur, compareAtPrice: compareAtEur };
}

// Tylko rdzen katalogu (plakaty, zestawy, ramki) - male akcesoria typu
// przypinki maja pusty product_type i potrzebuja innej skali zaokraglania
// (patrz komentarz nad roundToNinetyFive), zostaja na razie na zywym kursie.
const CORE_PRODUCT_TYPES = ['poster', 'poster set', 'gallery set', 'ramka'];

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

async function applyFixedPrices(prices) {
  const mutation = `mutation priceListFixedPricesAdd($priceListId: ID!, $prices: [PriceListPriceInput!]!) {
    priceListFixedPricesAdd(priceListId: $priceListId, prices: $prices) {
      userErrors { field message }
    }
  }`;
  const { json, cost } = await adminGraphql(mutation, { priceListId: PRICE_LIST_ID, prices });
  await throttleGuard(cost);
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data.priceListFixedPricesAdd;
}

(async () => {
  if (!domain || !token) throw new Error('Brak SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN w .env');

  const fxRate = await fetchFxRate();
  console.log(`Kurs PLN->EUR: ${fxRate} (1 EUR = ${(1 / fxRate).toFixed(4)} PLN)`);
  console.log(isDryRun ? 'TRYB DRY-RUN: nic nie zostanie zapisane.' : 'TRYB REALNY: ceny zostana ustawione w Shopify.');

  const products = await fetchAllProducts();
  console.log(`Produktow do przetworzenia: ${products.length}`);

  const progress = loadProgress();
  let ok = 0, skip = 0, blad = 0, variantsSet = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const done = progress[p.handle];
    if (done && !isDryRun) { skip += 1; continue; }

    const variants = p.variants.edges.map((e) => e.node);
    const pricesForApi = [];
    const preview = [];

    for (const v of variants) {
      const plnPrice = Number(v.price);
      const plnCompareAt = v.compareAtPrice ? Number(v.compareAtPrice) : null;
      if (!plnPrice) continue;
      const { price, compareAtPrice } = computeEurPricing(plnPrice, plnCompareAt, fxRate);
      preview.push({ variant: v.id, plnPrice, plnCompareAt, priceEur: price, compareAtEur: compareAtPrice });
      pricesForApi.push({
        variantId: v.id,
        price: { amount: price.toFixed(2), currencyCode: 'EUR' },
        ...(compareAtPrice ? { compareAtPrice: { amount: compareAtPrice.toFixed(2), currencyCode: 'EUR' } } : {}),
      });
    }

    if (isDryRun) {
      console.log(`\n[${i + 1}/${products.length}] ${p.title} (${p.handle})`);
      for (const row of preview) {
        console.log(
          `   ${row.plnPrice.toFixed(2)} zl${row.plnCompareAt ? ` (was ${row.plnCompareAt.toFixed(2)} zl)` : ''}` +
          `  ->  ${row.priceEur.toFixed(2)} EUR${row.compareAtEur ? ` (was ${row.compareAtEur.toFixed(2)} EUR)` : ''}`
        );
      }
      continue;
    }

    process.stdout.write(`[${i + 1}/${products.length}] ${p.handle} (${pricesForApi.length} wariantow)... `);
    try {
      for (let b = 0; b < pricesForApi.length; b += BATCH_SIZE) {
        const batch = pricesForApi.slice(b, b + BATCH_SIZE);
        const result = await applyFixedPrices(batch);
        if (result.userErrors && result.userErrors.length) {
          throw new Error(JSON.stringify(result.userErrors));
        }
        variantsSet += batch.length;
      }
      progress[p.handle] = { done: true, at: new Date().toISOString(), fxRate };
      saveProgress(progress);
      console.log('OK');
      ok += 1;
    } catch (e) {
      console.log('BLAD: ' + e.message);
      blad += 1;
    }
  }

  console.log('');
  if (isDryRun) {
    console.log(`Dry-run zakonczony. ${products.length} produktow podglodowych.`);
  } else {
    console.log(`Gotowe: ${ok} OK, ${skip} pominietych (juz zrobione), ${blad} bledow, ${variantsSet} wariantow ustawionych.`);
  }
})();
