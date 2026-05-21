require('dotenv').config();
const { getHeadlessConfig, fetchShopifyProductHandles } = require('../src/shopifyHeadless');

async function main() {
  const cfg = getHeadlessConfig();
  if (!cfg.storeDomain || !cfg.storefrontToken) {
    throw new Error('Brak SHOPIFY_STORE_DOMAIN lub SHOPIFY_STOREFRONT_API_TOKEN w .env');
  }
  const limitArg = process.argv.find((x) => String(x).startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 250) : 250;
  const handles = await fetchShopifyProductHandles(limit);
  console.log(`Headless OK: ${cfg.storeDomain} (${cfg.apiVersion})`);
  console.log(`Loaded handles: ${handles.size}`);
  console.log(`Sample: ${[...handles].slice(0, 10).join(', ')}`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
