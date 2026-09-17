require('dotenv').config({ quiet: true });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';

async function gql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

const FRAME_HANDLES = [
  'ramka-aluminiowa-czarna-mat-21x30-cm',
  'ramka-aluminiowa-czarna-mat-30x40-cm',
  'ramka-aluminiowa-czarna-mat-40x50-cm',
  'ramka-aluminiowa-czarna-mat-50x70-cm',
  'ramka-drewniana-dab-13x18-cm',
  'ramka-aluminiowa-srebrna-30x40-cm',
];
const POSTER_HANDLE_QUERY = '-tag:type_frame';

async function contextualPrice(handle, country) {
  const q = `query($handle: String!, $country: CountryCode!) {
    productByHandle(handle: $handle) {
      title
      variants(first: 5) {
        nodes {
          selectedOptions { name value }
          contextualPricing(context: { country: $country }) {
            price { amount currencyCode }
          }
        }
      }
    }
  }`;
  const { data, errors } = await gql(q, { handle, country });
  if (errors) { console.log('ERR', handle, JSON.stringify(errors)); return; }
  if (!data.productByHandle) { console.log('MISSING', handle); return; }
  console.log(handle, '(' + data.productByHandle.title + '):');
  for (const v of data.productByHandle.variants.nodes) {
    const opt = v.selectedOptions.map(o => o.value).join('/');
    console.log('  ', opt, '->', v.contextualPricing.price.amount, v.contextualPricing.price.currencyCode);
  }
}

async function samplePosters(country, n) {
  const q = `query($country: CountryCode!) {
    products(first: ${n}, query: "${POSTER_HANDLE_QUERY}") {
      nodes {
        handle
        title
        variants(first: 3) {
          nodes {
            selectedOptions { name value }
            contextualPricing(context: { country: $country }) { price { amount currencyCode } }
          }
        }
      }
    }
  }`;
  const { data, errors } = await gql(q, { country });
  if (errors) { console.log('ERR posters', JSON.stringify(errors)); return; }
  console.log(`--- POSTERS sample (${country}) ---`);
  for (const p of data.products.nodes) {
    console.log(p.handle, '->', p.variants.nodes.map(v => `${v.selectedOptions.map(o=>o.value).join('/')}:${v.contextualPricing.price.amount}${v.contextualPricing.price.currencyCode}`).join(' | '));
  }
}

(async () => {
  console.log('=== FRAMES contextual pricing for DE ===');
  for (const h of FRAME_HANDLES) {
    await contextualPrice(h, 'DE');
  }
  console.log('');
  await samplePosters('DE', 8);
})();
