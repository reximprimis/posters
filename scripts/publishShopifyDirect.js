/**
 * Publikuje produkty bezposrednio do Shopify przez Admin GraphQL API
 * (productSet mutation), na podstawie juz wygenerowanego CSV
 * (exportShopifyCsv.js). Omija reczny import w Shopify Admin.
 *
 * Uzycie:
 *   node scripts/publishShopifyDirect.js <plik.csv>
 *   node scripts/publishShopifyDirect.js <plik.csv> --only=handle1,handle2
 *   node scripts/publishShopifyDirect.js <plik.csv> --dry-run
 */
'use strict';
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

/**
 * Publikacja produktu w Shopify odwoluje sie do obrazow przez URL jsDelivr
 * (SHOPIFY_IMAGE_BASE_URL -> cdn.jsdelivr.net/gh/reximprimis/posters@main/...).
 * Te pliki fizycznie musza juz byc na GitHub PRZED wywolaniem productSet,
 * inaczej Shopify probuje je pobrac, dostaje 404 i produkt ladunje jako
 * "Media processing failed" na WSZYSTKICH obrazkach (odkryte 2026-09-17 na
 * batchu 27 plakatow Impressionism — mockupy byly wygenerowane lokalnie, ale
 * nikt ich nie wypchnal do repo `posters` na GitHub przed publikacja).
 *
 * Ta funkcja robi to automatycznie: commit + push wszystkiego co nowe w
 * shopify_thumbs/, potem jawne purge cache jsDelivr dla kazdego zmienionego
 * pliku (bez tego jsDelivr potrafi serwowac stare/brakujace dane jeszcze
 * do 24h nawet po pushu).
 */
function ensureThumbsPushed() {
  const repoRoot = path.join(__dirname, '..');
  const opts = { cwd: repoRoot, encoding: 'utf8' };
  let statusOut;
  try {
    statusOut = execFileSync('git', ['status', '--porcelain', 'shopify_thumbs'], opts);
  } catch (e) {
    console.error('git status nie powiodlo sie, pomijam auto-push miniatur:', e.message);
    return Promise.resolve();
  }
  const changed = statusOut
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[AM?]+\s+/, ''));
  if (!changed.length) return Promise.resolve();

  console.log(`\n[thumbs-sync] ${changed.length} nowych/zmienionych plikow w shopify_thumbs/ — commit + push + purge jsDelivr...`);
  execFileSync('git', ['add', 'shopify_thumbs'], opts);
  execFileSync(
    'git',
    ['commit', '-m', `data: sync ${changed.length} miniatur/mockupow przed publikacja Shopify\n\nAutomatyczny commit z publishShopifyDirect.js — patrz project_shopify_publish_pipeline.md.`],
    opts
  );
  execFileSync('git', ['push', 'origin', 'main'], opts);
  console.log('[thumbs-sync] wypchniete na GitHub.');

  return (async () => {
    let ok = 0;
    let fail = 0;
    for (const rel of changed) {
      const url = `https://purge.jsdelivr.net/gh/reximprimis/posters@main/${rel.split(path.sep).join('/')}`;
      try {
        const res = await fetch(url);
        if (res.ok) ok++;
        else fail++;
      } catch (_) {
        fail++;
      }
    }
    console.log(`[thumbs-sync] jsDelivr purge: ${ok} OK, ${fail} bledow.`);
  })();
}

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function groupByHandle(rows) {
  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const products = new Map();
  let currentHandle = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const handle = r[idx('Handle')] || currentHandle;
    if (!handle) continue;
    currentHandle = handle;
    if (!products.has(handle)) {
      products.set(handle, {
        handle,
        title: '', descriptionHtml: '', vendor: '', productType: '', tags: '',
        published: true, seoTitle: '', seoDescription: '',
        variants: [], images: new Set(),
      });
    }
    const p = products.get(handle);
    if (r[idx('Title')]) p.title = r[idx('Title')];
    if (r[idx('Body (HTML)')]) p.descriptionHtml = r[idx('Body (HTML)')];
    if (r[idx('Vendor')]) p.vendor = r[idx('Vendor')];
    if (r[idx('Type')]) p.productType = r[idx('Type')];
    if (r[idx('Tags')]) p.tags = r[idx('Tags')];
    if (r[idx('SEO Title')]) p.seoTitle = r[idx('SEO Title')];
    if (r[idx('SEO Description')]) p.seoDescription = r[idx('SEO Description')];

    const opt1Name = r[idx('Option1 Name')];
    const opt1Val = r[idx('Option1 Value')];
    const opt2Name = r[idx('Option2 Name')];
    const opt2Val = r[idx('Option2 Value')];
    const price = r[idx('Variant Price')];
    const compareAt = r[idx('Variant Compare At Price')];
    const sku = r[idx('Variant SKU')];
    const imageSrc = r[idx('Image Src')];
    if (imageSrc) p.images.add(imageSrc);

    // Shopify CSV convention: the Option N Name column is only populated on
    // the product's FIRST row. Every row still carries its own Option N
    // Value, so remember the name once and reuse it for every variant.
    if (opt1Name && !p.opt1Name) p.opt1Name = opt1Name;
    if (opt2Name && !p.opt2Name) p.opt2Name = opt2Name;

    if (opt1Val || opt2Val || sku) {
      p.variants.push({
        optionValues: [
          opt1Val ? { optionName: p.opt1Name, name: opt1Val } : null,
          opt2Val ? { optionName: p.opt2Name, name: opt2Val } : null,
        ].filter(Boolean),
        price: price || '0',
        compareAtPrice: compareAt || null,
        sku: sku || '',
        imageSrc: imageSrc || '',
      });
    }
  }
  return [...products.values()];
}

async function gql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

const PRODUCT_SET_MUTATION = `
mutation ($input: ProductSetInput!) {
  productSet(input: $input, synchronous: true) {
    product {
      id
      handle
      title
      variants(first: 20) { nodes { id sku price } }
    }
    userErrors { field message }
  }
}`;

// Kanaly sprzedazy, na ktorych publikuja sie zywe produkty gdy ktos klika
// "Publish" recznie w Shopify Admin — zweryfikowane 2026-09-17 przez
// resourcePublicationsV2 na "Sunlit Coastal Cliffs" (jeden z oryginalnych 8
// produktow Impressionism, poprawnie widoczny na zywo). WAZNE: "Reximprimis
// Headless" (nie "Online Store") to kanal, ktory faktycznie zasila
// storefront Next.js przez Storefront API — bez niego produkt bylby ACTIVE
// w Shopify, ale niewidoczny na reximprimis.com mimo publikacji do
// klasycznego "Online Store".
const SALES_CHANNEL_IDS = [
  'gid://shopify/Publication/334495678851', // Online Store
  'gid://shopify/Publication/334796489091', // Reximprimis Headless
  'gid://shopify/Publication/336742973827', // Reximprimis Headless 03
  'gid://shopify/Publication/346265977219', // Facebook & Instagram
  'gid://shopify/Publication/346269974915', // Google & YouTube
  'gid://shopify/Publication/346308837763', // Pinterest
];

const PUBLISHABLE_PUBLISH_MUTATION = `
mutation ($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    userErrors { field message }
  }
}`;

async function publishToSalesChannels(productGid) {
  const input = SALES_CHANNEL_IDS.map((publicationId) => ({ publicationId }));
  const res = await gql(PUBLISHABLE_PUBLISH_MUTATION, { id: productGid, input });
  if (res.errors) return { ok: false, error: JSON.stringify(res.errors) };
  const errs = res.data?.publishablePublish?.userErrors || [];
  if (errs.length) return { ok: false, error: JSON.stringify(errs) };
  return { ok: true };
}

function buildOptionValuesList(variants, optName) {
  const seen = new Set();
  const out = [];
  for (const v of variants) {
    const ov = v.optionValues.find((o) => o.optionName === optName);
    if (ov && !seen.has(ov.name)) { seen.add(ov.name); out.push({ name: ov.name }); }
  }
  return out;
}

async function publishProduct(p, { dryRun }) {
  const productOptions = [];
  if (p.opt1Name) productOptions.push({ name: p.opt1Name, values: buildOptionValuesList(p.variants, p.opt1Name) });
  if (p.opt2Name) productOptions.push({ name: p.opt2Name, values: buildOptionValuesList(p.variants, p.opt2Name) });

  const files = [...p.images].map((src) => ({ originalSource: src, contentType: 'IMAGE' }));

  const input = {
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    vendor: p.vendor,
    productType: p.productType,
    tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    status: 'ACTIVE',
    productOptions: productOptions.length ? productOptions : undefined,
    files: files.length ? files : undefined,
    variants: p.variants.map((v) => ({
      optionValues: v.optionValues.map((o) => ({ optionName: o.optionName, name: o.name })),
      price: v.price,
      compareAtPrice: v.compareAtPrice || undefined,
      sku: v.sku || undefined,
      inventoryPolicy: 'DENY',
    })),
    seo: (p.seoTitle || p.seoDescription) ? { title: p.seoTitle || undefined, description: p.seoDescription || undefined } : undefined,
  };

  if (dryRun) {
    console.log('DRY-RUN', p.handle, JSON.stringify(input, null, 2).slice(0, 800));
    return { handle: p.handle, ok: true, dryRun: true };
  }

  const res = await gql(PRODUCT_SET_MUTATION, { input });
  if (res.errors) {
    return { handle: p.handle, ok: false, error: JSON.stringify(res.errors) };
  }
  const errs = res.data?.productSet?.userErrors || [];
  if (errs.length) {
    return { handle: p.handle, ok: false, error: JSON.stringify(errs) };
  }
  const product = res.data.productSet.product;

  const pub = await publishToSalesChannels(product.id);
  if (!pub.ok) {
    console.log(`  UWAGA: produkt utworzony ale publikacja do kanalow nie powiodla sie: ${pub.error}`);
  }

  return { handle: p.handle, ok: true, product, published: pub.ok };
}

(async () => {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('usage: node publishShopifyDirect.js <plik.csv> [--only=handle1,handle2] [--dry-run]');
    process.exit(1);
  }
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
  const dryRun = process.argv.includes('--dry-run');

  if (!dryRun) await ensureThumbsPushed();

  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  let products = groupByHandle(rows);
  if (only) products = products.filter((p) => only.has(p.handle));

  console.log(`Produktow do publikacji: ${products.length}`);
  const results = [];
  for (const p of products) {
    console.log(`\n[${p.handle}] ${p.title} — ${p.variants.length} wariantow, ${p.images.size} obrazow`);
    const res = await publishProduct(p, { dryRun });
    results.push(res);
    if (res.ok) console.log('  OK', res.dryRun ? '(dry-run)' : `${res.product?.id} — kanaly: ${res.published ? 'opublikowane' : 'BLAD publikacji, patrz UWAGA wyzej'}`);
    else console.log('  BLAD', res.error);
  }
  const ok = results.filter((r) => r.ok).length;
  console.log(`\nGotowe: ${ok}/${results.length}`);

  // Tlumaczenia MUSZA isc PO utworzeniu produktu w Shopify — tlumaczKatalog.js
  // wymaga, zeby produkt juz istnial tam (translatableResource po handle).
  // Wczesniejsza proba automatyzacji w preview.js odpalala tlumaczenia w
  // momencie zatwierdzenia do druku, czyli PRZED publikacja — po cichu nic
  // nie robila (script raportowal "0 produktow" bo shopifyState nie byl
  // jeszcze 'ready' w praktyce uzytecznej dla translatableResource). Tutaj,
  // zaraz po realnej publikacji, jest jedyne poprawne miejsce na ten krok.
  if (!dryRun) {
    const publishedHandles = results.filter((r) => r.ok).map((r) => r.handle);
    if (publishedHandles.length) {
      console.log(`\nTlumaczenia (${publishedHandles.length} produktow)...`);
      for (const handle of publishedHandles) {
        await new Promise((resolve) => {
          const child = spawn('node', ['scripts/tlumaczKatalog.js', `--handle=${handle}`], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
          });
          child.on('close', () => resolve());
          child.on('error', (e) => { console.error(`tlumaczenie ${handle} nie wystartowalo:`, e.message); resolve(); });
        });
      }
    }
  }
})();
