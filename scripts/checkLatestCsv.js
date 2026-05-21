const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function main() {
  const dir = path.join(process.cwd(), 'shopify_csv');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) {
    console.log(JSON.stringify({ error: 'no_csv_files' }, null, 2));
    return;
  }
  const latest = files[files.length - 1];
  const lines = fs.readFileSync(path.join(dir, latest), 'utf8').split(/\r?\n/).filter(Boolean);
  const head = parseCsvLine(lines[0]);
  const idxSize = head.indexOf('Option2 Value');
  const idxSrc = head.indexOf('Image Src');
  const idxVar = head.indexOf('Variant Image');
  const idxHandle = head.indexOf('Handle');
  let has70Rows = 0;
  let missingSrcRows = 0;
  let missingVarRows = 0;
  let thumbVariantRows = 0;
  let httpVariantRows = 0;
  const handles = new Set();
  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const size = row[idxSize] || '';
    if (size.includes('70 × 100')) has70Rows += 1;
    if (!(row[idxSrc] || '').trim()) missingSrcRows += 1;
    const varImg = (row[idxVar] || '').trim();
    if (!varImg) missingVarRows += 1;
    if (varImg.includes('_thumb.jpg')) thumbVariantRows += 1;
    if (/^https?:\/\//i.test(varImg)) httpVariantRows += 1;
    if ((row[idxHandle] || '').trim()) handles.add(row[idxHandle].trim());
  }
  console.log(
    JSON.stringify(
      {
        latest,
        rows: Math.max(0, lines.length - 1),
        products: handles.size,
        has70x100Rows: has70Rows,
        missingImageSrcRows: missingSrcRows,
        missingVariantImageRows: missingVarRows,
        thumbVariantRows,
        httpVariantRows,
      },
      null,
      2
    )
  );
}

main();
