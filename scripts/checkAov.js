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

(async () => {
  const q = `{
    frames: products(first: 20, query: "tag:type_frame") {
      nodes {
        handle
        title
        variants(first: 3) {
          nodes { price selectedOptions { name value } }
        }
      }
    }
  }`;
  const { data, errors } = await gql(q);
  if (errors) { console.log('ERR', JSON.stringify(errors)); return; }
  console.log('--- FRAMES (base currency) ---');
  for (const p of data.frames.nodes) {
    console.log(p.handle, '->', p.variants.nodes.map(v => v.price).join(', '));
  }
})();

(async () => {
  const q2 = `{ shop { currencyCode } }`;
  const { data } = await gql(q2);
  console.log('shop currency:', data.shop.currencyCode);
})();
