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
    products(first: 20, query: "tag:gallery-set") {
      nodes {
        handle
        title
        tags
        featuredImage { url }
        images(first: 3) { nodes { url } }
        variants(first: 3) { nodes { price selectedOptions { name value } } }
      }
    }
  }`;
  const { data, errors } = await gql(q);
  if (errors) { console.log('ERR', JSON.stringify(errors)); return; }
  console.log('Znaleziono:', data.products.nodes.length);
  for (const p of data.products.nodes) {
    console.log('---');
    console.log(p.handle, '|', p.title);
    console.log('img:', p.featuredImage?.url);
    console.log('price:', p.variants.nodes.map(v=>v.price).join(', '));
  }
})();
