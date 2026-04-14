const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'posters_inventory.json');
const outputCsvPath = path.join(projectRoot, 'products_export_shopify.csv');

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

const SIZES = [
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

function toHandle(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'poster';
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

function normalizeRelPath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
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
  const finalBase = base;
  const cleaned = p.startsWith('posters/') ? p.slice('posters/'.length) : p;
  return `${finalBase}/${encodeURI(cleaned)}`;
}

function dedupePosters(rows) {
  const map = new Map();
  for (const p of rows || []) {
    const k = normalizeRelPath(p && p.imagePath).toLowerCase();
    if (!k) continue;
    const prev = map.get(k);
    const t = Date.parse(p && p.createdAt ? p.createdAt : '') || 0;
    if (!prev || t >= prev._t) {
      map.set(k, { ...p, _t: t });
    }
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

function main() {
  if (!fs.existsSync(inventoryPath)) {
    throw new Error('Brak posters_inventory.json');
  }
  const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const approvedOnly = !process.argv.includes('--all');
  const posters = dedupePosters(inv.posters || []).filter((p) => (approvedOnly ? p.approvedForPrint === true : true));
  const headers = pickHeaders();
  const lines = [headers.join(',')];
  let skippedNoThumb = 0;

  for (const p of posters) {
    const handle = toHandle(p.title);
    const title = String(p.title || '').trim();
    const body = htmlDescription(p.shopDescription || p.prompt || '');
    const categoryTag = slugifyTag(p.category || '');
    const styleTag = slugifyTag(p.artStyle || '');
    const tags = ['poster', categoryTag, styleTag, ...SIZES.map((s) => `size_${s.key}`)].filter(Boolean).join(', ');
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

    // Thumb-only export: skip products that have no public master thumb URL.
    if (!masterThumbRel) {
      skippedNoThumb += 1;
      continue;
    }

    const imageMaster = toPublicUrl(masterThumbRel);
    const imageFramed = toPublicUrl(framedThumbRel || masterThumbRel);
    const orientation = 'pionowa';
    const theme = [slugifyTag(p.category), slugifyTag(p.artStyle)].filter(Boolean).join('; ');

    let rowIndex = 0;
    for (const printStyle of PRINT_STYLES) {
      for (const size of SIZES) {
        const firstRowForProduct = rowIndex === 0;
        const imageForVariant = printStyle.code === 'ramka' ? imageFramed : imageMaster;
        const imageSrcCell = firstRowForProduct ? imageMaster : rowIndex === 1 ? imageFramed : '';
        const variantImageCell = imageSrcCell || (printStyle.code === 'ramka' ? imageFramed : imageMaster) || '';
        const row = {
          Handle: handle,
          Title: firstRowForProduct ? title : '',
          'Body (HTML)': firstRowForProduct ? body : '',
          Vendor: firstRowForProduct ? 'REXIMPRIMIS' : '',
          // Leave Shopify taxonomy empty unless we map to a verified taxonomy ID/path.
          // Invalid taxonomy strings trigger import warnings and are ignored by Shopify.
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
          // Keep metafields empty in CSV import flow.
          // Store-specific metafield definitions can enforce owner subtype constraints;
          // filling these columns causes "Podtyp właściciela..." validation errors.
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
  }

  fs.writeFileSync(outputCsvPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Shopify CSV exported: ${outputCsvPath}`);
  console.log(`Products exported: ${Math.max(0, Math.floor((lines.length - 1) / (SIZES.length * PRINT_STYLES.length)))}, rows: ${lines.length - 1}`);
  if (skippedNoThumb > 0) {
    console.log(`Skipped (no thumb): ${skippedNoThumb}`);
  }
  if (!process.env.SHOPIFY_IMAGE_BASE_URL) {
    console.log('Warning: SHOPIFY_IMAGE_BASE_URL is missing. CSV will be generated without image URLs.');
  }
}

main();
