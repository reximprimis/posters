require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

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

async function uploadOne(filePath) {
  const filename = path.basename(filePath);
  const bytes = fs.readFileSync(filePath);

  const stagedQ = `mutation ($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }`;
  const staged = await gql(stagedQ, {
    input: [{ filename, mimeType: 'image/jpeg', httpMethod: 'POST', resource: 'FILE' }],
  });
  if (staged.errors || !staged.data || !staged.data.stagedUploadsCreate) {
    throw new Error('stagedUploadsCreate failed: ' + JSON.stringify(staged));
  }
  const target = staged.data.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error('staged upload failed: ' + JSON.stringify(staged));

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([bytes], { type: 'image/jpeg' }), filename);

  const uploadRes = await fetch(target.url, { method: 'POST', body: form });
  if (!uploadRes.ok) throw new Error('S3 upload failed: ' + uploadRes.status + ' ' + (await uploadRes.text()));

  const createQ = `mutation ($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id alt fileStatus ... on MediaImage { image { url } } }
      userErrors { field message }
    }
  }`;
  const created = await gql(createQ, {
    files: [{ alt: filename, contentType: 'IMAGE', originalSource: target.resourceUrl }],
  });
  const file = created.data.fileCreate.files[0];
  if (created.data.fileCreate.userErrors.length) {
    throw new Error('fileCreate error: ' + JSON.stringify(created.data.fileCreate.userErrors));
  }
  return file.id;
}

async function pollUrl(fileId) {
  const q = `query ($id: ID!) {
    node(id: $id) { ... on MediaImage { fileStatus image { url } } }
  }`;
  for (let i = 0; i < 20; i++) {
    const { data } = await gql(q, { id: fileId });
    if (data.node && data.node.image && data.node.image.url) return data.node.image.url;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('timed out waiting for file processing: ' + fileId);
}

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error('usage: node uploadCarouselToShopify.js <file1.jpg> <file2.jpg> ...');
  const urls = [];
  for (const f of files) {
    const id = await uploadOne(f);
    const url = await pollUrl(id);
    urls.push(url);
    console.error('uploaded', f, '->', url);
  }
  console.log(JSON.stringify(urls, null, 2));
})();
