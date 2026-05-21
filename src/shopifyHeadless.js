const axios = require('axios');

const DEFAULT_API_VERSION = '2025-10';

function getHeadlessConfig() {
  const storeDomain = String(process.env.SHOPIFY_STORE_DOMAIN || '').trim();
  const storefrontToken = String(process.env.SHOPIFY_STOREFRONT_API_TOKEN || '').trim();
  const apiVersion = String(process.env.SHOPIFY_STOREFRONT_API_VERSION || DEFAULT_API_VERSION).trim();
  return { storeDomain, storefrontToken, apiVersion };
}

function assertHeadlessConfig() {
  const cfg = getHeadlessConfig();
  if (!cfg.storeDomain) {
    throw new Error('Brak SHOPIFY_STORE_DOMAIN w ENV.');
  }
  if (!cfg.storefrontToken) {
    throw new Error('Brak SHOPIFY_STOREFRONT_API_TOKEN w ENV.');
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(cfg.storeDomain)) {
    throw new Error('SHOPIFY_STORE_DOMAIN ma niepoprawny format (oczekiwane *.myshopify.com).');
  }
  return cfg;
}

async function storefrontQuery(query, variables) {
  const cfg = assertHeadlessConfig();
  const url = `https://${cfg.storeDomain}/api/${cfg.apiVersion}/graphql.json`;
  const { data } = await axios.post(
    url,
    { query, variables: variables || {} },
    {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg.storefrontToken,
      },
    }
  );
  if (data && Array.isArray(data.errors) && data.errors.length > 0) {
    const msg = data.errors.map((e) => e.message).filter(Boolean).join(' | ') || 'Storefront API error';
    throw new Error(msg);
  }
  return data && data.data ? data.data : {};
}

async function fetchShopifyProductHandles(limit = 5000) {
  const query = `
    query ProductHandlesPage($cursor: String, $first: Int!) {
      products(first: $first, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        nodes { handle }
      }
    }
  `;
  const out = new Set();
  let cursor = null;
  while (out.size < limit) {
    const remaining = Math.max(1, Math.min(250, limit - out.size));
    const payload = await storefrontQuery(query, { cursor, first: remaining });
    const products = payload && payload.products ? payload.products : null;
    if (!products) break;
    const nodes = Array.isArray(products.nodes) ? products.nodes : [];
    for (const node of nodes) {
      const h = String(node && node.handle ? node.handle : '').trim();
      if (h) out.add(h);
    }
    const pageInfo = products.pageInfo || {};
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) break;
    cursor = pageInfo.endCursor;
  }
  return out;
}

module.exports = {
  getHeadlessConfig,
  assertHeadlessConfig,
  storefrontQuery,
  fetchShopifyProductHandles,
};
