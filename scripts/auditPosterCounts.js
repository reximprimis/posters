const fs = require('fs');
const path = require('path');
const {
  evaluatePosterShopifyState,
  summarizeApprovedShopifyStates,
} = require('../src/shopifyState');

const root = path.resolve(__dirname, '..');
const inv = JSON.parse(fs.readFileSync(path.join(root, 'posters_inventory.json'), 'utf8'));
const posters = inv.posters || [];

const approved = posters.filter((p) => p.approvedForPrint === true);
const notApproved = posters.filter((p) => !p.approvedForPrint);
const byState = { ready: 0, pending_assets: 0, legacy_blocked: 0 };
for (const p of posters) {
  const s = evaluatePosterShopifyState(root, p).state;
  byState[s] = (byState[s] || 0) + 1;
}

const byImg = new Map();
for (const p of posters) {
  const k = String(p.imagePath || '')
    .replace(/\\/g, '/')
    .toLowerCase();
  if (!k) continue;
  const t = Date.parse(p.createdAt || '') || 0;
  const prev = byImg.get(k);
  if (!prev || t >= prev._t) byImg.set(k, { p, _t: t });
}
const unique = [...byImg.values()].map((x) => x.p);
const uniqueApproved = unique.filter((p) => p.approvedForPrint);

let invNoPng = 0;
let invNoPngApproved = 0;
for (const p of posters) {
  const e = evaluatePosterShopifyState(root, p);
  if (!e.resolved.sourceExists) {
    invNoPng += 1;
    if (p.approvedForPrint) invNoPngApproved += 1;
  }
}

function countSourcePngs(dir) {
  let n = 0;
  if (!fs.existsSync(dir)) return 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) {
        stack.push(p);
        continue;
      }
      if (!/\.png$/i.test(e.name)) continue;
      const low = e.name.toLowerCase();
      if (
        low.includes('_ramka') ||
        low.includes('_thumb') ||
        low.includes('_master') ||
        low.includes('.gen.tmp.')
      ) {
        continue;
      }
      n += 1;
    }
  }
  return n;
}

const summarize = summarizeApprovedShopifyStates(root, inv);

function fileExistsAtRelative(rel) {
  const p = String(rel || '').replace(/\\/g, '/');
  const abs = path.join(root, p);
  return fs.existsSync(abs) && fs.statSync(abs).isFile();
}

function cleanPosterSubPath(web) {
  return String(web || '')
    .replace(/^\/?posters\//i, '')
    .replace(/^\//, '');
}

const groups = new Map();
let skippedNoFile = 0;
let skippedMaster = 0;
for (const poster of posters) {
  const ipNorm = String(poster.imagePath || '').replace(/\\/g, '/');
  if (/_master\.png$/i.test(ipNorm) || /\.gen\.tmp\.png$/i.test(ipNorm)) {
    skippedMaster += 1;
    continue;
  }
  if (!poster.imagePath || !fileExistsAtRelative(poster.imagePath)) {
    skippedNoFile += 1;
    continue;
  }
  const clean = cleanPosterSubPath(poster.imagePath.replace(/\\/g, '/'));
  const key = clean.toLowerCase();
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(poster);
}

let apiTotal = 0;
let apiApproved = 0;
const apiCats = new Set();
for (const items of groups.values()) {
  items.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
  const primary = items[0];
  apiTotal += 1;
  apiCats.add(primary.category);
  if (primary.approvedForPrint) apiApproved += 1;
}

const exportMap = new Map();
for (const p of posters) {
  const e = evaluatePosterShopifyState(root, p);
  if (e.state !== 'ready' || !p.approvedForPrint) continue;
  const k = String(p.imagePath || '')
    .replace(/\\/g, '/')
    .toLowerCase();
  const t = Date.parse(p.createdAt || '') || 0;
  const prev = exportMap.get(k);
  if (!prev || t >= prev._t) exportMap.set(k, { p, _t: t });
}

console.log('=== INVENTORY (posters_inventory.json) ===');
console.log('Wiersze total:', posters.length);
console.log('Zatwierdzone (approvedForPrint):', approved.length);
console.log('Niezatwierdzone:', notApproved.length);
console.log('Unikalne plakaty (po imagePath):', unique.length);
console.log('Unikalne zatwierdzone:', uniqueApproved.length);
console.log('Stan wszystkich wierszy:', byState);
console.log('summarizeApprovedShopifyStates:', summarize);
console.log('Wiersze bez PNG:', invNoPng, '| zatwierdzone bez PNG:', invNoPngApproved);

console.log('\n=== PLIKI NA DYSKU (posters/) ===');
console.log('Zrodlowe PNG (bez _ramka/_thumb/_master):', countSourcePngs(path.join(root, 'posters')));

console.log('\n=== BIBLIOTEKA UI (/api/posters) ===');
console.log('Widoczne karty:', apiTotal);
console.log('Z tego zatwierdzone:', apiApproved);
console.log('Niezatwierdzone widoczne:', apiTotal - apiApproved);
console.log('Kategorie:', apiCats.size);
console.log('Pominiete wiersze inventory (brak pliku):', skippedNoFile);
console.log('Pominiete wiersze (master/tmp):', skippedMaster);

console.log('\n=== EKSPORT SHOPIFY ===');
console.log('Produkty do CSV (ready + zatwierdzone + dedupe):', exportMap.size);

if (notApproved.length > 0) {
  console.log('\n=== NIEZATWIERDZONE (lista) ===');
  for (const p of notApproved) {
    const e = evaluatePosterShopifyState(root, p);
    console.log('-', p.title, '|', p.category, '| PNG:', e.resolved.sourceExists ? 'tak' : 'nie');
  }
}
