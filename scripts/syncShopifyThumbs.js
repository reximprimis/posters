const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'posters_inventory.json');
const outRoot = path.join(projectRoot, 'shopify_thumbs');

function normalizeRelPath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function ensureDirForFile(absFile) {
  const dir = path.dirname(absFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfExists(relPath) {
  const rel = normalizeRelPath(relPath);
  if (!rel) return null;
  const srcAbs = path.join(projectRoot, rel);
  if (!fs.existsSync(srcAbs) || !fs.statSync(srcAbs).isFile()) return null;
  const cleaned = rel.startsWith('posters/') ? rel.slice('posters/'.length) : rel;
  const outAbs = path.join(outRoot, cleaned);
  ensureDirForFile(outAbs);
  fs.copyFileSync(srcAbs, outAbs);
  return path.relative(projectRoot, outAbs).replace(/\\/g, '/');
}

function main() {
  if (!fs.existsSync(inventoryPath)) {
    throw new Error('Brak posters_inventory.json');
  }
  if (!fs.existsSync(outRoot)) {
    fs.mkdirSync(outRoot, { recursive: true });
  }

  const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const posters = Array.isArray(inv.posters) ? inv.posters : [];

  let masterCopied = 0;
  let framedCopied = 0;
  let skipped = 0;

  for (const p of posters) {
    if (!p || p.approvedForPrint !== true) continue;
    const master = copyIfExists(p.imagePathThumb);
    const framed = copyIfExists(p.imagePathFramedThumb);
    if (master) masterCopied += 1;
    if (framed) framedCopied += 1;
    if (!master) skipped += 1;
  }

  console.log(`Master thumbs copied: ${masterCopied}`);
  console.log(`Framed thumbs copied: ${framedCopied}`);
  console.log(`Approved posters skipped (missing master thumb): ${skipped}`);
  console.log(`Output dir: ${outRoot}`);
}

main();
