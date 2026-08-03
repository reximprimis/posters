#!/usr/bin/env node
/**
 * Generate Shopify mockups (frame + interior) for all posters in a category.
 *
 * Usage:
 *   node scripts/generateMockupsByCategory.js --category Abstrakcja
 *   node scripts/generateMockupsByCategory.js --category Abstrakcja --force
 *   node scripts/generateMockupsByCategory.js --category Abstrakcja --dry-run
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const MockupGenerator = require('../src/mockupGenerator');

const root = path.resolve(__dirname, '..');
const INVENTORY_PATH = path.join(root, 'posters_inventory.json');

function parseArgs(argv) {
  const out = { category: '', force: false, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force') out.force = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--category' && argv[i + 1]) {
      out.category = String(argv[++i]).trim();
    } else if (!a.startsWith('-') && !out.category) {
      out.category = a.trim();
    }
  }
  return out;
}

function loadInventory() {
  const raw = fs.readFileSync(INVENTORY_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const posters = Array.isArray(data) ? data : data.posters || [];
  return { data, posters, isArray: Array.isArray(data) };
}

function saveInventory(data, isArray, posters) {
  const payload = isArray ? posters : { ...data, posters };
  fs.writeFileSync(INVENTORY_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

function mockupExistsOnDisk(relPath) {
  if (!relPath) return false;
  const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath);
  return fs.existsSync(abs);
}

function posterNeedsMockups(poster, force) {
  if (force) return true;
  if (!poster.mockups || !poster.mockups.frame || !poster.mockups.interior) return true;
  return !mockupExistsOnDisk(poster.mockups.frame) || !mockupExistsOnDisk(poster.mockups.interior);
}

async function main() {
  const { category, force, dryRun } = parseArgs(process.argv);
  if (!category) {
    console.error('Usage: node scripts/generateMockupsByCategory.js --category <name> [--force] [--dry-run]');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set (.env).');
    process.exit(1);
  }
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error('Missing posters_inventory.json');
    process.exit(1);
  }

  const { data, posters, isArray } = loadInventory();
  const matches = posters.filter((p) => p && String(p.category || '').trim() === category);
  const todo = matches.filter((p) => posterNeedsMockups(p, force));

  console.log(`Category: ${category}`);
  console.log(`Posters in category: ${matches.length}`);
  console.log(`To generate: ${todo.length}${force ? ' (force)' : ''}`);
  if (dryRun) {
    todo.forEach((p, i) => console.log(`  ${i + 1}. ${p.title || p.id}`));
    return;
  }
  if (todo.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const mg = new MockupGenerator();
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < todo.length; i += 1) {
    const poster = todo[i];
    const relPath = poster.imagePath || '';
    const masterAbs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath);
    const label = poster.title || poster.id;
    console.log(`\n[${i + 1}/${todo.length}] ${label}`);

    if (!relPath || !fs.existsSync(masterAbs)) {
      console.warn(`  SKIP — master PNG missing: ${relPath || '(empty)'}`);
      fail += 1;
      continue;
    }

    try {
      const outputDir = path.dirname(masterAbs);
      const titleSlug = String(poster.title || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]/g, '');
      const { frame, interior } = await mg.generate(masterAbs, outputDir, titleSlug, {
        category: poster.category,
        title: poster.title,
      });
      const toRel = (abs) => path.relative(root, abs).replace(/\\/g, '/');
      poster.mockups = {
        frame: toRel(frame),
        interior: toRel(interior),
        generatedAt: new Date().toISOString(),
      };
      saveInventory(data, isArray, posters);
      ok += 1;
      console.log(`  OK — saved to inventory`);
    } catch (err) {
      fail += 1;
      console.error(`  FAIL — ${err.message || err}`);
    }
  }

  console.log(`\nDone. OK: ${ok}, failed: ${fail}, skipped existing: ${matches.length - todo.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
