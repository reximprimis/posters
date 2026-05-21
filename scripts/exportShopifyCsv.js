const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { normalizeRelPath, evaluatePosterShopifyState, reconcileInventoryShopifyStates } = require('../src/shopifyState');
const { fetchShopifyProductHandles, getHeadlessConfig } = require('../src/shopifyHeadless');

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'posters_inventory.json');
const outputDir = path.join(projectRoot, 'shopify_csv');
const outputCsvPath = path.join(outputDir, 'products_export_shopify.csv');
const settingsPath = path.join(projectRoot, 'shopify_export_settings.json');
const historyPath = path.join(projectRoot, 'shopify_export_history.json');

const DEFAULT_HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option1 Linked To',
  'Option2 Name',
  'Option2 Value',
  'Option2 Linked To',
  'Option3 Name',
  'Option3 Value',
  'Option3 Linked To',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Unit Price Total Measure',
  'Unit Price Total Measure Unit',
  'Unit Price Base Measure',
  'Unit Price Base Measure Unit',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Materiał ramy dzieła sztuki (product.metafields.shopify.artwork-frame-material)',
  'Kolor (product.metafields.shopify.color-pattern)',
  'Materiał dekoracyjny (product.metafields.shopify.decoration-material)',
  'Obsługiwany format (product.metafields.shopify.format-supported)',
  'Styl oprawki (product.metafields.shopify.frame-style)',
  'Materiał (product.metafields.shopify.material)',
  'Typ mocowania (product.metafields.shopify.mounting-type)',
  'Orientacja (product.metafields.shopify.orientation)',
  'Kształt (product.metafields.shopify.shape)',
  'Motyw (product.metafields.shopify.theme)',
  'Variant Image',
  'Variant Weight Unit',
  'Variant Tax Code',
  'Cost per item',
  'Status',
];

const SIZE_DEFS = [
  { key: '13x18', label: '13 × 18 cm (Small)', price: '15.00' },
  { key: '21x30', label: '21 × 30 cm (A4)', price: '25.00' },
  { key: '30x40', label: '30 × 40 cm (Medium)', price: '32.00' },
  { key: '40x50', label: '40 × 50 cm (Large)', price: '54.00' },
  { key: '50x70', label: '50 × 70 cm (Large)', price: '65.00' },
  { key: '70x100', label: '70 × 100 cm (Extra Large)', price: '90.00' },
];

const PRINT_STYLES = [
  { label: 'Full Bleed', code: 'full' },
  { label: 'White Border', code: 'ramka' },
];

const SIZE_KEYS = SIZE_DEFS.map((s) => s.key);
const DEFAULT_PRICES = Object.fromEntries(SIZE_DEFS.map((s) => [s.key, s.price]));

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function toHandle(title) {
  return (
    String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'poster'
  );
}

function htmlDescription(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const escaped = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<p>${escaped}</p>`;
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (!/[",\n\r]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function slugifyTag(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[ch] || ch))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withThumbSuffix(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  const dot = p.lastIndexOf('.');
  if (dot < 0) return '';
  return p.slice(0, dot) + '_thumb.jpg';
}

function withFramedSuffix(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  const dot = p.lastIndexOf('.');
  if (dot < 0) return '';
  return p.slice(0, dot) + '_ramka' + p.slice(dot);
}

function fileExists(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return false;
  const abs = path.join(projectRoot, p);
  return fs.existsSync(abs) && fs.statSync(abs).isFile();
}

function toPublicUrl(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = String(process.env.SHOPIFY_IMAGE_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  const cleaned = p.startsWith('posters/') ? p.slice('posters/'.length) : p;
  return `${base}/${encodeURI(cleaned)}`;
}

function dedupePosters(rows) {
  const map = new Map();
  for (const p of rows || []) {
    const k = normalizeRelPath(p && p.imagePath).toLowerCase();
    if (!k) continue;
    const prev = map.get(k);
    const t = Date.parse(p && p.createdAt ? p.createdAt : '') || 0;
    if (!prev || t >= prev._t) map.set(k, { ...p, _t: t });
  }
  return [...map.values()].map(({ _t, ...rest }) => rest);
}

function pickHeaders() {
  if (!fs.existsSync(outputCsvPath)) return DEFAULT_HEADERS;
  const firstLine = fs.readFileSync(outputCsvPath, 'utf8').split(/\r?\n/, 1)[0].trim();
  if (!firstLine) return DEFAULT_HEADERS;
  return firstLine.split(',').map((x) => x.trim()).filter(Boolean);
}

function makeRow(headers, data) {
  return headers.map((h) => csvEscape(data[h] || '')).join(',');
}

function parseArgs(argv) {
  const out = {
    all: false,
    onlyNew: false,
    onlyMissingOnStore: false,
    fetchStoreHandles: false,
    storeLimit: 5000,
    sizes: [],
    prices: {},
    timestamped: false,
    saveSettings: false,
  };
  for (const raw of argv) {
    const a = String(raw || '').trim();
    if (!a) continue;
    if (a === '--all') out.all = true;
    else if (a === '--only-new') out.onlyNew = true;
    else if (a === '--only-missing-on-store') out.onlyMissingOnStore = true;
    else if (a === '--fetch-store-handles') out.fetchStoreHandles = true;
    else if (a === '--timestamped') out.timestamped = true;
    else if (a === '--save-settings') out.saveSettings = true;
    else if (a.startsWith('--sizes=')) {
      out.sizes = a
        .slice('--sizes='.length)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => SIZE_KEYS.includes(s));
    } else if (a.startsWith('--price-')) {
      const m = a.match(/^--price-([0-9]+x[0-9]+)=(.+)$/);
      if (!m) continue;
      const key = m[1];
      const val = String(m[2]).trim().replace(',', '.');
      if (!SIZE_KEYS.includes(key)) continue;
      const n = Number(val);
      if (Number.isFinite(n) && n > 0) out.prices[key] = n.toFixed(2);
    } else if (a.startsWith('--store-limit=')) {
      const n = Number(a.slice('--store-limit='.length));
      if (Number.isFinite(n) && n > 0) out.storeLimit = Math.floor(n);
    }
  }
  if (out.onlyMissingOnStore) out.fetchStoreHandles = true;
  return out;
}

function loadSettings() {
  const base = { prices: { ...DEFAULT_PRICES }, selectedSizes: [...SIZE_KEYS] };
  if (!fs.existsSync(settingsPath)) return base;
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const prices = { ...base.prices };
    for (const k of SIZE_KEYS) {
      if (raw && raw.prices && raw.prices[k] != null) {
        const n = Number(String(raw.prices[k]).replace(',', '.'));
        if (Number.isFinite(n) && n > 0) prices[k] = n.toFixed(2);
      }
    }
    const selectedSizes = Array.isArray(raw && raw.selectedSizes)
      ? raw.selectedSizes.filter((k) => SIZE_KEYS.includes(k))
      : base.selectedSizes;
    return { prices, selectedSizes: selectedSizes.length ? selectedSizes : [...SIZE_KEYS] };
  } catch (_) {
    return base;
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

function loadHistoryHandles() {
  if (!fs.existsSync(historyPath)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    const arr = Array.isArray(raw && raw.handles) ? raw.handles : [];
    return new Set(arr.map((x) => String(x || '').trim()).filter(Boolean));
  } catch (_) {
    return new Set();
  }
}

function saveHistoryHandles(prevSet, newHandles) {
  const merged = new Set(prevSet);
  for (const h of newHandles || []) merged.add(h);
  const out = {
    updatedAt: new Date().toISOString(),
    handles: [...merged].sort((a, b) => a.localeCompare(b)),
  };
  fs.writeFileSync(historyPath, JSON.stringify(out, null, 2), 'utf8');
}

async function main() {
  ensureOutputDir();
  if (!fs.existsSync(inventoryPath)) throw new Error('Brak posters_inventory.json');
  const cli = parseArgs(process.argv.slice(2));
  const settings = loadSettings();

  const prices = { ...settings.prices, ...cli.prices };
  const selectedSizes = (cli.sizes && cli.sizes.length ? cli.sizes : settings.selectedSizes).filter((k) => SIZE_KEYS.includes(k));
  const sizeDefs = SIZE_DEFS.filter((s) => selectedSizes.includes(s.key)).map((s) => ({ ...s, price: prices[s.key] || s.price }));
  if (sizeDefs.length === 0) throw new Error('Brak wybranych rozmiarów do eksportu.');

  if (cli.saveSettings || Object.keys(cli.prices).length > 0 || (cli.sizes && cli.sizes.length > 0)) {
    saveSettings({ prices, selectedSizes });
  }

  const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const reconcileSummary = reconcileInventoryShopifyStates(projectRoot, inv);
  if (reconcileSummary.changed > 0) fs.writeFileSync(inventoryPath, JSON.stringify(inv, null, 2), 'utf8');

  const approvedOnly = !cli.all;
  const posters = dedupePosters(inv.posters || []).filter((p) => (approvedOnly ? p.approvedForPrint === true : true));
  const headers = pickHeaders();
  const lines = [headers.join(',')];
  const knownHandles = loadHistoryHandles();
  let storeHandles = null;
  if (cli.fetchStoreHandles) {
    const cfg = getHeadlessConfig();
    if (!cfg.storeDomain || !cfg.storefrontToken) {
      throw new Error(
        'Brak ENV dla headless porownania sklepu. Ustaw SHOPIFY_STORE_DOMAIN i SHOPIFY_STOREFRONT_API_TOKEN.'
      );
    }
    storeHandles = await fetchShopifyProductHandles(cli.storeLimit);
  }
  const exportedHandles = new Set();
  let skippedNoThumb = 0;
  let skippedNotReady = 0;
  let skippedKnown = 0;
  let skippedOnStore = 0;

  for (const p of posters) {
    const evalState = evaluatePosterShopifyState(projectRoot, p);
    if (evalState.state !== 'ready') {
      skippedNotReady += 1;
      continue;
    }
    const handle = toHandle(p.title);
    if (cli.onlyNew && knownHandles.has(handle)) {
      skippedKnown += 1;
      continue;
    }
    if (cli.onlyMissingOnStore && storeHandles && storeHandles.has(handle)) {
      skippedOnStore += 1;
      continue;
    }
    const title = String(p.title || '').trim();
    const body = htmlDescription(p.shopDescription || p.prompt || '');
    const categoryTag = slugifyTag(p.category || '');
    const styleTag = slugifyTag(p.artStyle || '');
    const tags = ['poster', categoryTag, styleTag, ...sizeDefs.map((s) => `size_${s.key}`)].filter(Boolean).join(', ');
    const seoTitle = title ? `${title} | REXIMPRIMIS` : '';
    const seoDescription = String(p.shopDescription || '').slice(0, 160);
    const masterThumbRel =
      (p.imagePathThumb && fileExists(p.imagePathThumb) && normalizeRelPath(p.imagePathThumb)) ||
      (withThumbSuffix(p.imagePath) && fileExists(withThumbSuffix(p.imagePath)) && withThumbSuffix(p.imagePath)) ||
      '';
    const framedSourceRel = p.imagePathFramed || withFramedSuffix(p.imagePath);
    const framedThumbRel =
      (p.imagePathFramedThumb && fileExists(p.imagePathFramedThumb) && normalizeRelPath(p.imagePathFramedThumb)) ||
      (withThumbSuffix(framedSourceRel) && fileExists(withThumbSuffix(framedSourceRel)) && withThumbSuffix(framedSourceRel)) ||
      '';
    if (!masterThumbRel) {
      skippedNoThumb += 1;
      continue;
    }

    const imageMaster = toPublicUrl(masterThumbRel);
    const imageFramed = toPublicUrl(framedThumbRel || masterThumbRel);
    let rowIndex = 0;
    for (const printStyle of PRINT_STYLES) {
      for (const size of sizeDefs) {
        const firstRowForProduct = rowIndex === 0;
        const imageSrcCell = firstRowForProduct ? imageMaster : rowIndex === 1 ? imageFramed : '';
        const variantImageCell = imageSrcCell || (printStyle.code === 'ramka' ? imageFramed : imageMaster) || '';
        const row = {
          Handle: handle,
          Title: firstRowForProduct ? title : '',
          'Body (HTML)': firstRowForProduct ? body : '',
          Vendor: firstRowForProduct ? 'REXIMPRIMIS' : '',
          'Product Category': '',
          Type: firstRowForProduct ? 'poster' : '',
          Tags: firstRowForProduct ? tags : '',
          Published: firstRowForProduct ? (p.approvedForPrint ? 'true' : 'false') : '',
          'Option1 Name': firstRowForProduct ? 'Print Style' : '',
          'Option1 Value': printStyle.label,
          'Option1 Linked To': '',
          'Option2 Name': firstRowForProduct ? 'Size' : '',
          'Option2 Value': size.label,
          'Option2 Linked To': '',
          'Option3 Name': '',
          'Option3 Value': '',
          'Option3 Linked To': '',
          'Variant SKU': `${handle}-${printStyle.code}-${size.key}`,
          'Variant Grams': '0',
          'Variant Inventory Tracker': '',
          'Variant Inventory Qty': '',
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Price': size.price,
          'Variant Compare At Price': '',
          'Variant Requires Shipping': 'true',
          'Variant Taxable': 'true',
          'Unit Price Total Measure': '',
          'Unit Price Total Measure Unit': '',
          'Unit Price Base Measure': '',
          'Unit Price Base Measure Unit': '',
          'Variant Barcode': '',
          'Image Src': imageSrcCell,
          'Image Position': imageSrcCell ? (firstRowForProduct ? '1' : rowIndex === 1 ? '2' : '') : '',
          'Image Alt Text': '',
          'Gift Card': firstRowForProduct ? 'false' : '',
          'SEO Title': firstRowForProduct ? seoTitle : '',
          'SEO Description': firstRowForProduct ? seoDescription : '',
          'Materiał ramy dzieła sztuki (product.metafields.shopify.artwork-frame-material)': '',
          'Kolor (product.metafields.shopify.color-pattern)': '',
          'Materiał dekoracyjny (product.metafields.shopify.decoration-material)': '',
          'Obsługiwany format (product.metafields.shopify.format-supported)': '',
          'Styl oprawki (product.metafields.shopify.frame-style)': '',
          'Materiał (product.metafields.shopify.material)': '',
          'Typ mocowania (product.metafields.shopify.mounting-type)': '',
          'Orientacja (product.metafields.shopify.orientation)': '',
          'Kształt (product.metafields.shopify.shape)': '',
          'Motyw (product.metafields.shopify.theme)': '',
          'Variant Image': variantImageCell,
          'Variant Weight Unit': 'kg',
          'Variant Tax Code': '',
          'Cost per item': '',
          Status: firstRowForProduct ? (p.approvedForPrint ? 'active' : 'draft') : '',
        };
        lines.push(makeRow(headers, row));
        rowIndex += 1;
      }
    }
    exportedHandles.add(handle);
  }

  const csvText = lines.join('\n') + '\n';
  fs.writeFileSync(outputCsvPath, csvText, 'utf8');
  let outputUsedPath = outputCsvPath;
  if (cli.timestamped || cli.onlyNew) {
    const datedName = `products_export_shopify_${nowStamp()}.csv`;
    outputUsedPath = path.join(outputDir, datedName);
    fs.writeFileSync(outputUsedPath, csvText, 'utf8');
  }

  if (exportedHandles.size > 0) saveHistoryHandles(knownHandles, [...exportedHandles]);

  console.log(`Shopify CSV exported: ${outputUsedPath}`);
  console.log(`Products exported: ${Math.max(0, Math.floor((lines.length - 1) / (sizeDefs.length * PRINT_STYLES.length)))}, rows: ${lines.length - 1}`);
  console.log(`Sizes used: ${sizeDefs.map((s) => `${s.key}:${s.price}`).join(', ')}`);
  console.log(
    `Inventory state summary: ready=${reconcileSummary.ready}, pending_assets=${reconcileSummary.pending_assets}, legacy_blocked=${reconcileSummary.legacy_blocked}`
  );
  if (reconcileSummary.changed > 0) console.log(`Inventory records reconciled: ${reconcileSummary.changed}`);
  if (skippedNoThumb > 0) console.log(`Skipped (no thumb): ${skippedNoThumb}`);
  if (skippedNotReady > 0) console.log(`Skipped (not ready): ${skippedNotReady}`);
  if (skippedKnown > 0) console.log(`Skipped (already exported): ${skippedKnown}`);
  if (skippedOnStore > 0) console.log(`Skipped (already on Shopify store): ${skippedOnStore}`);
  if (storeHandles) console.log(`Live store handles loaded: ${storeHandles.size}`);
  if (!process.env.SHOPIFY_IMAGE_BASE_URL) console.log('Warning: SHOPIFY_IMAGE_BASE_URL is missing. CSV will be generated without image URLs.');
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
