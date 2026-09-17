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
  const mimeType = 'video/mp4';

  const stagedQ = `mutation ($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }`;
  const staged = await gql(stagedQ, {
    input: [{ filename, mimeType, httpMethod: 'POST', resource: 'VIDEO', fileSize: String(bytes.length) }],
  });
  if (staged.errors || !staged.data || !staged.data.stagedUploadsCreate) {
    throw new Error('stagedUploadsCreate failed: ' + JSON.stringify(staged));
  }
  const target = staged.data.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error('staged upload failed: ' + JSON.stringify(staged));

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([bytes], { type: mimeType }), filename);

  const uploadRes = await fetch(target.url, { method: 'POST', body: form });
  if (!uploadRes.ok) throw new Error('S3 upload failed: ' + uploadRes.status + ' ' + (await uploadRes.text()));

  const createQ = `mutation ($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id alt fileStatus ... on Video { sources { url } } }
      userErrors { field message }
    }
  }`;
  const created = await gql(createQ, {
    files: [{ alt: filename, contentType: 'VIDEO', originalSource: target.resourceUrl }],
  });
  const file = created.data.fileCreate.files[0];
  if (created.data.fileCreate.userErrors.length) {
    throw new Error('fileCreate error: ' + JSON.stringify(created.data.fileCreate.userErrors));
  }
  return file.id;
}

async function pollUrl(fileId) {
  const q = `query ($id: ID!) {
    node(id: $id) { ... on Video { fileStatus sources { url format } } }
  }`;
  for (let i = 0; i < 40; i++) {
    const { data } = await gql(q, { id: fileId });
    const node = data.node;
    if (node && node.fileStatus === 'READY' && node.sources && node.sources.length) {
      const mp4 = node.sources.find((s) => s.format === 'mp4') || node.sources[0];
      return mp4.url;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('timed out waiting for video processing: ' + fileId);
}

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error('usage: node uploadVideoToShopify.js <file1.mp4> ...');
  const urls = [];
  for (const f of files) {
    const id = await uploadOne(f);
    const url = await pollUrl(id);
    urls.push(url);
    console.error('uploaded', f, '->', url);
  }
  console.log(JSON.stringify(urls, null, 2));
})();
