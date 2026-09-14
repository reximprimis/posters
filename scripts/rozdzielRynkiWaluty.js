/**
 * Wydziela Szwecje (SEK), Czechy (CZK) i Dania (DKK) z rynku "European Union"
 * (ktory mial je wszystkie zlepione pod jedna cena EUR) do osobnych rynkow
 * z ich wlasna waluta rozliczeniowa. Pozostale kraje strefy euro (AT, BE,
 * DE, ES, FI, FR, NL, LU) zostaja w rynku EU/EUR bez zmian.
 *
 *   node scripts/rozdzielRynkiWaluty.js            - wykonuje wszystko
 *   node scripts/rozdzielRynkiWaluty.js --status    - tylko pokazuje stan rynkow
 */

'use strict';

require('dotenv').config({ quiet: true });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';

const EU_MARKET_ID = 'gid://shopify/Market/111621013891';
// Kraje ktore ZOSTAJA w rynku EU/EUR (usuwamy stad SE, CZ, DK).
const EU_KEEP_COUNTRIES = ['AT', 'BE', 'DE', 'ES', 'FI', 'FR', 'NL', 'LU'];

const NEW_MARKETS = [
  { name: 'Sweden', country: 'SE', currency: 'SEK' },
  { name: 'Czechia', country: 'CZ', currency: 'CZK' },
  { name: 'Denmark', country: 'DK', currency: 'DKK' },
];

const isStatus = process.argv.includes('--status');

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

async function findMarketByName(name) {
  const q = `{ markets(first: 20) { edges { node { id name enabled
    currencySettings { baseCurrency { currencyCode } }
    regions(first: 10) { edges { node { ... on MarketRegionCountry { code } } } } } } } }`;
  const data = await adminGraphql(q);
  return data.markets.edges.map((e) => e.node).find((m) => m.name === name) || null;
}

async function showStatus() {
  const q = `{ markets(first: 20) { edges { node { id name enabled primary
    currencySettings { baseCurrency { currencyCode } }
    regions(first: 15) { edges { node { ... on MarketRegionCountry { code name } } } } } } } }`;
  const data = await adminGraphql(q);
  for (const { node: m } of data.markets.edges) {
    const countries = m.regions.edges.map((e) => e.node.code).join(', ');
    console.log(`${m.name} [${m.enabled ? 'enabled' : 'DRAFT'}${m.primary ? ', primary' : ''}] currency=${m.currencySettings?.baseCurrency?.currencyCode ?? '?'} -> ${countries}`);
  }
}

async function ensureDraftMarket(spec) {
  let market = await findMarketByName(spec.name);
  if (market) {
    console.log(`${spec.name}: juz istnieje (${market.id})`);
    return market;
  }
  const mutation = `mutation marketCreate($input: MarketCreateInput!) {
    marketCreate(input: $input) {
      market { id name enabled }
      userErrors { field message }
    }
  }`;
  const input = {
    name: spec.name,
    conditions: { regionsCondition: { regions: [{ countryCode: spec.country }] } },
  };
  const data = await adminGraphql(mutation, { input });
  if (data.marketCreate.userErrors.length) {
    throw new Error(`${spec.name}: ${JSON.stringify(data.marketCreate.userErrors)}`);
  }
  console.log(`${spec.name}: utworzony jako draft (${data.marketCreate.market.id})`);
  return data.marketCreate.market;
}

async function shrinkEuMarket() {
  const mutation = `mutation marketUpdate($id: ID!, $input: MarketUpdateInput!) {
    marketUpdate(id: $id, input: $input) {
      market { id name enabled
        regions(first: 15) { edges { node { ... on MarketRegionCountry { code } } } } }
      userErrors { field message }
    }
  }`;
  const removeCountries = NEW_MARKETS.map((m) => m.country);
  const input = {
    conditions: {
      conditionsToDelete: {
        regionsCondition: {
          regions: removeCountries.map((code) => ({ countryCode: code })),
        },
      },
    },
  };
  const data = await adminGraphql(mutation, { id: EU_MARKET_ID, input });
  if (data.marketUpdate.userErrors.length) {
    throw new Error('EU market update: ' + JSON.stringify(data.marketUpdate.userErrors));
  }
  const codes = data.marketUpdate.market.regions.edges.map((e) => e.node.code).join(', ');
  console.log(`European Union: regiony po usunieciu ${removeCountries.join(',')} -> ${codes}`);
}

async function setCurrencyAndEnable(market, currency) {
  const mutation = `mutation marketUpdate($id: ID!, $input: MarketUpdateInput!) {
    marketUpdate(id: $id, input: $input) {
      market { id name enabled currencySettings { baseCurrency { currencyCode } } }
      userErrors { field message }
    }
  }`;
  const input = {
    status: 'ACTIVE',
    currencySettings: { baseCurrency: currency, localCurrencies: false },
  };
  const data = await adminGraphql(mutation, { id: market.id, input });
  if (data.marketUpdate.userErrors.length) {
    throw new Error(`${market.name} enable/currency: ` + JSON.stringify(data.marketUpdate.userErrors));
  }
  const m = data.marketUpdate.market;
  console.log(`${m.name}: waluta=${m.currencySettings.baseCurrency.currencyCode}, enabled=${m.enabled}`);
}

(async () => {
  if (!domain || !token) throw new Error('Brak SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN w .env');

  if (isStatus) {
    await showStatus();
    return;
  }

  console.log('--- 1. Tworzenie rynkow draft (Sweden/Czechia/Denmark) ---');
  const drafts = {};
  for (const spec of NEW_MARKETS) {
    drafts[spec.country] = await ensureDraftMarket(spec);
  }

  console.log('\n--- 2. Zawezanie regionow rynku European Union ---');
  await shrinkEuMarket();

  console.log('\n--- 3. Ustawianie waluty i wlaczanie nowych rynkow ---');
  for (const spec of NEW_MARKETS) {
    await setCurrencyAndEnable(drafts[spec.country], spec.currency);
  }

  console.log('\n--- Stan koncowy ---');
  await showStatus();
})().catch((e) => {
  console.error('BLAD:', e.message);
  process.exit(1);
});
