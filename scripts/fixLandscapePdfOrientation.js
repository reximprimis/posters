const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PosterBatchGenerator = require('../src/posterGenerator');

const projectRoot = path.resolve(__dirname, '..');

function toAbs(p) {
  if (!p || typeof p !== 'string') return null;
  return path.isAbsolute(p) ? p : path.join(projectRoot, p);
}

function removePdfMap(pdfMap) {
  if (!pdfMap || typeof pdfMap !== 'object') return 0;
  let removed = 0;
  for (const rel of Object.values(pdfMap)) {
    const abs = toAbs(rel);
    if (!abs) continue;
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
      removed += 1;
    }
  }
  return removed;
}

async function isLandscapeImage(absImagePath) {
  try {
    const m = await sharp(absImagePath).metadata();
    const w = Number(m.width || 0);
    const h = Number(m.height || 0);
    return w > h;
  } catch (_) {
    return false;
  }
}

async function main() {
  const gen = new PosterBatchGenerator();
  gen.reloadDatabase();
  const posters = Array.isArray(gen.db && gen.db.posters) ? gen.db.posters : [];

  let processed = 0;
  let skipped = 0;
  let removed = 0;
  let failed = 0;

  for (const poster of posters) {
    const id = String(poster && poster.id ? poster.id : '').trim();
    const absImage = toAbs(poster && poster.imagePath);
    if (!id || !absImage || !fs.existsSync(absImage)) {
      skipped += 1;
      continue;
    }
    const hasFull = poster.pdfPaths && Object.keys(poster.pdfPaths).length > 0;
    const hasFramed = poster.pdfPathsFramed && Object.keys(poster.pdfPathsFramed).length > 0;
    if (!hasFull && !hasFramed) {
      skipped += 1;
      continue;
    }
    const landscape = await isLandscapeImage(absImage);
    if (!landscape) {
      skipped += 1;
      continue;
    }

    try {
      removed += removePdfMap(poster.pdfPaths);
      removed += removePdfMap(poster.pdfPathsFramed);
      if (hasFull) await gen.applyFullPrintPdfsForPosterId(id);
      if (hasFramed) await gen.applyFramedPrintPdfsForPosterId(id);
      processed += 1;
      console.log(`OK ${poster.title} (${id})`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${poster.title} (${id}): ${err.message || err}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        processed,
        skipped,
        failed,
        removedPdfs: removed,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
