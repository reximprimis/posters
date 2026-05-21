#!/usr/bin/env node
/** Resume quality test: generate only cases with fewer than 3 final PNGs in output folder. */
require('dotenv').config();
const fs = require('fs');
const PosterBatchGenerator = require('../src/posterGenerator');
const { getPosterOutputDir } = require('../src/posterPaths');

const CASES = [
  { category: 'Kawa i herbata', style: 'Photography' },
  { category: 'Kuchnia i jedzenie', style: 'Photography' },
  { category: 'Morze i plaża', style: 'Minimalism' },
  { category: 'Architektura', style: 'Line art' },
  { category: 'Retro', style: 'Abstract' },
  { category: 'Botanika', style: 'Photography' },
  { category: 'Pojazdy', style: 'Minimalism' },
];

function countFinalPng(category, style) {
  const dir = getPosterOutputDir(category, style);
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png') && !f.includes('.gen.tmp') && !/_master\.png$/i.test(f)).length;
}

async function main() {
  const gen = new PosterBatchGenerator();
  for (const { category, style } of CASES) {
    const have = countFinalPng(category, style);
    const need = Math.max(0, 3 - have);
    if (need === 0) {
      console.log(`Skip ${category} / ${style} (${have} PNGs)`);
      continue;
    }
    console.log(`\n### ${category} / ${style}: generating ${need} more (have ${have})\n`);
    try {
      await gen.generateCategory(category, need, { artStyle: style, withPdf: false });
    } catch (e) {
      console.error(`❌ ${category} / ${style}: ${e.message}\n`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
