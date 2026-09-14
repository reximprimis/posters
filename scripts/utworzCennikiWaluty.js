/**
 * Tworzy Catalog + PriceList (RELATIVE, 0% - placeholder do nadpisania FIXED
 * cenami) dla kazdego z nowych rynkow (Sweden/Czechia/Denmark), tak jak
 * Shopify robi to automatycznie dla rynkow tworzonych w Adminie. Trzeba to
 * zrobic recznie przez API, bo marketCreate samo nie zaklada katalogu.
 *
 *   node scripts/utworzCennikiWaluty.js
 */

'use strict';

require('dotenv').config({ quiet: true });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';

const MARKETS = [
  { name: 'Sweden', id: 'gid://shopify/Market/118520480131', currency: 'SEK' },
  { name: 'Czechia', id: 'gid://shopify/Market/118520512899', currency: 'CZK' },
  { name: 'Denmark', id: 'gid://shopify/Market/118520545667', currency: 'DKK' },
];

async function adminGraphql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data;
}

async function createCatalog(market) {
  const mutation = `mutation catalogCreate($input: CatalogCreateInput!) {
    catalogCreate(input: $input) {
      catalog { id title }
      userErrors { field message }
    }
  }`;
  const input = {
    title: `${market.name} - ${market.currency}`,
    status: 'ACTIVE',
    context: { marketIds: [market.id] },
  };
  const data = await adminGraphql(mutation, { input });
  if (data.catalogCreate.userErrors.length) {
    throw new Error(`${market.name} catalog: ` + JSON.stringify(data.catalogCreate.userErrors));
  }
  return data.catalogCreate.catalog;
}

async function createPriceList(market, catalogId) {
  const mutation = `mutation priceListCreate($input: PriceListCreateInput!) {
    priceListCreate(input: $input) {
      priceList { id name currency }
      userErrors { field message }
    }
  }`;
  const input = {
    name: `${market.name} - ${market.currency}`,
    currency: market.currency,
    catalogId,
    parent: { adjustment: { type: 'PERCENTAGE_DECREASE', value: 0 } },
  };
  const data = await adminGraphql(mutation, { input });
  if (data.priceListCreate.userErrors.length) {
    throw new Error(`${market.name} price list: ` + JSON.stringify(data.priceListCreate.userErrors));
  }
  return data.priceListCreate.priceList;
}

(async () => {
  if (!domain || !token) throw new Error('Brak SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN w .env');

  const result = {};
  for (const market of MARKETS) {
    const catalog = await createCatalog(market);
    console.log(`${market.name}: catalog ${catalog.id}`);
    const priceList = await createPriceList(market, catalog.id);
    console.log(`${market.name}: price list ${priceList.id} (${priceList.currency})`);
    result[market.currency] = priceList.id;
  }

  console.log('\n--- ID cennikow (do uzycia w skrypcie ustawiania cen) ---');
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error('BLAD:', e.message);
  process.exit(1);
});
