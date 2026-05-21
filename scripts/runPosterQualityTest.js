#!/usr/bin/env node
/**
 * Quality test batch: 21 posters (7 category/style × 3).
 * Usage: node scripts/runPosterQualityTest.js [--skip-generate] [--no-vision]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const OpenAI = require('openai');
const PosterBatchGenerator = require('../src/posterGenerator');
const { getPosterOutputDir } = require('../src/posterPaths');
const { tempGenerationPathFromFinal } = require('../src/safePrintFraming');

const projectRoot = path.join(__dirname, '..');
const REPORT_PATH = path.join(projectRoot, 'docs', 'poster-generation-quality-report.md');
const TARGET_W = 5906;
const TARGET_H = 8268;

const TEST_CASES = [
  { category: 'Kawa i herbata', style: 'Photography' },
  { category: 'Kuchnia i jedzenie', style: 'Photography' },
  { category: 'Morze i plaża', style: 'Minimalism' },
  { category: 'Architektura', style: 'Line art' },
  { category: 'Retro', style: 'Abstract' },
  { category: 'Botanika', style: 'Photography' },
  { category: 'Pojazdy', style: 'Minimalism' },
];

const REQUIRED_META_KEYS = [
  'categorySchemaVersion',
  'promptBuilderVersion',
  'routingPath',
  'usedFallbackPromptBuilder',
  'title',
  'category',
  'style',
  'roomCollections',
  'outputDir',
  'imagePath',
];

function parseArgs() {
  return {
    skipGenerate: process.argv.includes('--skip-generate'),
    noVision: process.argv.includes('--no-vision'),
  };
}

function slugBase(title) {
  return String(title || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'poster';
}

async function runGeneration() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY required for quality test generation');
  }
  const gen = new PosterBatchGenerator();
  const runStartedMs = Date.now();
  for (const { category, style } of TEST_CASES) {
    console.log(`\n### Quality batch: ${category} / ${style} (3)\n`);
    await gen.generateCategory(category, 3, {
      artStyle: style,
      withPdf: false,
    });
  }
  return runStartedMs;
}

function collectPostersFromRun(runStartedMs) {
  const posters = [];
  for (const { category, style } of TEST_CASES) {
    const dir = getPosterOutputDir(category, style);
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir).filter((f) => isQualityTestFinalPng(f));
    for (const f of entries) {
      const pngAbs = path.join(dir, f);
      const st = fs.statSync(pngAbs);
      if (st.mtimeMs < runStartedMs - 5000) continue;
      const base = path.basename(f, '.png');
      const metaAbs = path.join(dir, `${base}.meta.json`);
      posters.push({
        category,
        style,
        title: base.replace(/_/g, ' '),
        fileBase: base,
        pngAbs,
        metaAbs,
        mtimeMs: st.mtimeMs,
      });
    }
  }
  posters.sort((a, b) => a.mtimeMs - b.mtimeMs);
  return posters;
}

function isQualityTestFinalPng(fileName) {
  const lower = String(fileName || '').toLowerCase();
  if (!lower.endsWith('.png')) return false;
  if (lower.includes('.gen.tmp') || lower.endsWith('_master.png')) return false;
  if (/_ramka|_framed|_thumb|_preview/i.test(lower)) return false;
  return true;
}

function collectLatestPostersPerCase(maxPerCase = 3) {
  const posters = [];
  for (const { category, style } of TEST_CASES) {
    const dir = getPosterOutputDir(category, style);
    if (!fs.existsSync(dir)) continue;
    const items = fs
      .readdirSync(dir)
      .filter((f) => isQualityTestFinalPng(f))
      .map((f) => {
        const pngAbs = path.join(dir, f);
        const base = path.basename(f, '.png');
        const metaAbs = path.join(dir, `${base}.meta.json`);
        return {
          f,
          pngAbs,
          metaAbs,
          mtimeMs: fs.statSync(pngAbs).mtimeMs,
          hasMeta: fs.existsSync(metaAbs),
        };
      })
      .filter((x) => x.hasMeta)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, maxPerCase);
    for (const { f, pngAbs, mtimeMs } of items) {
      const base = path.basename(f, '.png');
      const metaAbs = path.join(dir, `${base}.meta.json`);
      posters.push({
        category,
        style,
        title: null,
        fileBase: base,
        pngAbs,
        metaAbs,
        mtimeMs,
      });
    }
  }
  return posters;
}

function loadMeta(metaAbs) {
  if (!fs.existsSync(metaAbs)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaAbs, 'utf-8'));
  } catch {
    return null;
  }
}

function checkMetadataComplete(meta) {
  const missing = [];
  if (!meta) return { ok: false, missing: ['<file missing>'] };
  for (const k of REQUIRED_META_KEYS) {
    if (meta[k] === undefined || meta[k] === null) missing.push(k);
  }
  if (!meta.prompt?.imagePrompt) missing.push('prompt.imagePrompt');
  if (!meta.prompt?.finalPromptSentToModel) missing.push('prompt.finalPromptSentToModel');
  if (!meta.generation?.model) missing.push('generation.model');
  if (meta.generation?.durationMs == null) missing.push('generation.durationMs');
  if (!meta.assets?.temporaryMasterImagePath) missing.push('assets.temporaryMasterImagePath');
  if (meta.assets?.temporaryMasterImageRemoved !== true) missing.push('assets.temporaryMasterImageRemoved');
  if (!meta.assets?.finalImagePath) missing.push('assets.finalImagePath');
  if (!meta.safeFraming) missing.push('safeFraming');
  if (!meta.safeFramingValidation) missing.push('safeFramingValidation');
  if (meta.upscale?.temporaryMasterBeforeUpscale !== true) missing.push('upscale.temporaryMasterBeforeUpscale');
  if (meta.upscale?.masterStored !== false) missing.push('upscale.masterStored');
  if (meta.upscale?.targetSize !== '5906x8268') missing.push('upscale.targetSize');
  return { ok: missing.length === 0, missing };
}

function analyzePromptHeuristics(meta, category, style) {
  const issues = [];
  const p = `${meta?.prompt?.imagePrompt || ''}\n${meta?.prompt?.finalPromptSentToModel || ''}`.toLowerCase();
  const finalP = String(meta?.prompt?.finalPromptSentToModel || '');

  if (!/SAFE PRINT FRAMING/i.test(finalP)) {
    issues.push('missing SAFE PRINT FRAMING in finalPromptSentToModel');
  }

  const photoTerms = /\b(photograph|photography|dslr|photo[- ]?realistic|stock photo|lifelike photo)\b/i;
  const lineArtTerms = /\b(line art|line-art|ink line|contour drawing|architectural line)\b/i;

  if (category === 'Retro' && style === 'Abstract') {
    if (photoTerms.test(p) && /\b(still[- ]?life|realistic)\b/i.test(p)) {
      issues.push('Retro/Abstract: prompt sounds like realistic photography');
    }
  }
  if (category === 'Architektura' && style === 'Line art') {
    if (photoTerms.test(p) && !lineArtTerms.test(p)) {
      issues.push('Architektura/Line art: photography terms without line-art cues');
    }
  }
  if (category === 'Morze i plaża' && style === 'Minimalism') {
    if (/\b(stock photo|photorealistic|commercial photography)\b/i.test(p)) {
      issues.push('Morze/Minimalism: stock-photo wording');
    }
  }
  if (category === 'Pojazdy' && style === 'Minimalism') {
    if (/\b(abstract symbol|icon only|silhouette only)\b/i.test(p) && !/\b(complete vehicle|full car|entire vehicle|whole vehicle)\b/i.test(p)) {
      issues.push('Pojazdy/Minimalism: may reduce vehicle to symbol');
    }
  }
  if (category === 'Botanika' && style === 'Photography') {
    if (!/BOTANICAL|botanical|full bloom|entire flower/i.test(p)) {
      issues.push('Botanika: weak botanical/full-subject wording in prompt');
    }
  }
  if (category === 'Kawa i herbata' && style === 'Photography') {
    if (!/\b(no text|no logo|no label|no watermark|no typography)\b/i.test(p)) {
      issues.push('Kawa: missing explicit no-text/no-logo restriction');
    }
  }
  if (category === 'Kuchnia i jedzenie' && style === 'Photography') {
    if (/\b(menu|advertisement|commercial stock|restaurant ad)\b/i.test(p)) {
      issues.push('Kuchnia: ad/menu/stock-ad wording');
    }
  }
  if (style === 'Abstract' && photoTerms.test(p) && !/\babstract\b/i.test(p)) {
    issues.push('style mismatch: photography terms in Abstract');
  }
  if (style === 'Line art' && photoTerms.test(p) && !lineArtTerms.test(p)) {
    issues.push('style mismatch: photography in Line art');
  }

  return issues;
}

async function getImageDimensions(pngAbs) {
  const m = await sharp(pngAbs).metadata();
  return { width: m.width || 0, height: m.height || 0 };
}

async function crudeEdgeRisk(pngAbs) {
  const { width: W, height: H } = await getImageDimensions(pngAbs);
  if (!W || !H) return { level: 'unknown', note: 'no dimensions' };
  const marginPct = 0.05;
  const mx = Math.max(1, Math.round(W * marginPct));
  const my = Math.max(1, Math.round(H * marginPct));
  const buf = await sharp(pngAbs).ensureAlpha().raw().toBuffer();
  const channels = 4;
  let borderEnergy = 0;
  let centerEnergy = 0;
  let borderN = 0;
  let centerN = 0;
  const lum = (i) => {
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const border =
        x < mx || x >= W - mx || y < my || y >= H - my;
      const idx = (y * W + x) * channels;
      const L = lum(idx);
      if (border) {
        borderEnergy += L;
        borderN++;
      } else if (x > mx * 2 && x < W - mx * 2 && y > my * 2 && y < H - my * 2) {
        centerEnergy += L;
        centerN++;
      }
    }
  }
  const borderAvg = borderEnergy / (borderN || 1);
  const centerAvg = centerEnergy / (centerN || 1);
  const contrast = Math.abs(borderAvg - centerAvg);
  if (contrast > 45) return { level: 'medium', note: `border/center luminance Δ≈${contrast.toFixed(0)}` };
  return { level: 'low', note: `border/center Δ≈${contrast.toFixed(0)} (heuristic)` };
}

async function visionReview(client, poster, meta) {
  const title = meta?.title || poster.fileBase.replace(/_/g, ' ');
  const b64 = fs.readFileSync(poster.pngAbs).toString('base64');
  const res = await client.chat.completions.create({
    model: process.env.QUALITY_VISION_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You review fine-art poster prints. Reply JSON only with keys: titleMatch, categoryMatch, styleMatch, textOrLogo, edgeRisk, notes. Values: titleMatch/categoryMatch/styleMatch = ok|warn|fail; textOrLogo = none|suspected|fail; edgeRisk = low|medium|high.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Title: "${title}"\nCategory: ${poster.category}\nStyle: ${poster.style}\nCheck: title vs image, category fit, style fit (no style mixing), visible text/logos/watermarks, subject touching outer 5% edges.`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${b64}`, detail: 'low' },
          },
        ],
      },
    ],
    max_tokens: 400,
  });
  const raw = res.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

function pipelineChecks(poster, meta, dims) {
  const tempAbs = tempGenerationPathFromFinal(poster.pngAbs);
  const tempExists = fs.existsSync(tempAbs);
  const mastersDir = path.join(path.dirname(poster.pngAbs), 'masters');
  const masterGlob = fs
    .readdirSync(path.dirname(poster.pngAbs))
    .filter((f) => f.endsWith('_master.png') || f.includes('.gen.tmp.'));
  return {
    tempGenerated: Boolean(meta?.assets?.temporaryMasterImagePath),
    upscaleDone: dims.width === TARGET_W && dims.height === TARGET_H,
    finalPngExists: fs.existsSync(poster.pngAbs),
    tempRemoved: !tempExists && meta?.assets?.temporaryMasterImageRemoved === true,
    metadataSaved: fs.existsSync(poster.metaAbs),
    noMasterFiles: !fs.existsSync(mastersDir) && masterGlob.length === 0,
  };
}

function overallStatus(checks, promptIssues, vision) {
  const errors = [];
  const warnings = [];
  if (!checks.finalPngExists) errors.push('missing final PNG');
  if (!checks.upscaleDone) errors.push('wrong dimensions');
  if (!checks.tempRemoved) errors.push('temp not removed');
  if (!checks.metadataSaved) errors.push('missing metadata');
  if (!checks.noMasterFiles) errors.push('master/tmp artifacts in folder');
  if (promptIssues.length) warnings.push(...promptIssues);
  if (vision) {
    for (const k of ['titleMatch', 'categoryMatch', 'styleMatch']) {
      if (vision[k] === 'fail') errors.push(`vision:${k}=fail`);
      if (vision[k] === 'warn') warnings.push(`vision:${k}=warn`);
    }
    if (vision.textOrLogo === 'fail') errors.push('vision:textOrLogo=fail');
    else if (vision.textOrLogo === 'suspected') warnings.push('vision:textOrLogo=suspected');
    if (vision.edgeRisk === 'high') warnings.push('vision:edgeRisk=high');
    else if (vision.edgeRisk === 'medium') warnings.push('vision:edgeRisk=medium');
  }
  if (errors.length) return { status: 'error', errors, warnings };
  if (warnings.length) return { status: 'warn', errors, warnings };
  return { status: 'pass', errors, warnings };
}

function buildReport(data) {
  const {
    posters,
    caseSummaries,
    pipelineOk,
    generatedCount,
    passCount,
    warnCount,
    errorCount,
    problems,
    recommendations,
    runStartedAt,
    visionUsed,
  } = data;

  const lines = [];
  lines.push('# Poster Generation Quality Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Run started: ${runStartedAt || 'n/a'}`);
  lines.push(`Vision review: ${visionUsed ? 'yes (gpt-4o-mini or QUALITY_VISION_MODEL)' : 'no (heuristics only)'}`);
  lines.push('');
  lines.push('## Test scope');
  lines.push('');
  lines.push('| Category | Style | Planned | Found |');
  lines.push('|----------|-------|---------|-------|');
  for (const c of TEST_CASES) {
    const found = posters.filter((p) => p.category === c.category && p.style === c.style).length;
    lines.push(`| ${c.category} | ${c.style} | 3 | ${found} |`);
  }
  lines.push('');
  lines.push(`**Total planned:** 21 · **Found for review:** ${posters.length}`);
  lines.push('');
  lines.push('## Pipeline verification');
  lines.push('');
  lines.push(pipelineOk ? '✅ Pipeline checks passed for all reviewed posters (temp → upscale → final → temp removed → metadata).' : '⚠️ Some pipeline checks failed — see tables below.');
  lines.push('');
  lines.push('| Check | Result |');
  lines.push('|-------|--------|');
  lines.push(`| Temp path recorded in metadata | ${pipelineOk ? 'OK' : 'See failures'} |`);
  lines.push(`| Final PNG ${TARGET_W}×${TARGET_H} | ${pipelineOk ? 'OK' : 'See failures'} |`);
  lines.push(`| .gen.tmp.png removed | ${pipelineOk ? 'OK' : 'See failures'} |`);
  lines.push(`| .meta.json beside PNG | ${pipelineOk ? 'OK' : 'See failures'} |`);
  lines.push(`| No masters/ or *_master.png | ${pipelineOk ? 'OK' : 'See failures'} |`);
  lines.push('');
  lines.push('## Category/style validation');
  lines.push('');
  lines.push('| Category | Style | Posters | Routing path | Status | Notes |');
  lines.push('|----------|-------|---------|--------------|--------|-------|');
  for (const s of caseSummaries) {
    lines.push(
      `| ${s.category} | ${s.style} | ${s.count} | ${s.routingPath || '—'} | ${s.status} | ${s.notes} |`
    );
  }
  lines.push('');
  lines.push('## Prompt quality review');
  lines.push('');
  lines.push('| Title | Category | Style | Prompt issue? | Notes |');
  lines.push('|-------|----------|-------|---------------|-------|');
  for (const p of posters) {
    const title = p.meta?.title || p.fileBase;
    const iss = p.promptIssues?.length ? 'yes' : 'no';
    lines.push(
      `| ${title} | ${p.category} | ${p.style} | ${iss} | ${(p.promptIssues || []).join('; ') || (p.vision?.notes || '—')} |`
    );
  }
  lines.push('');
  lines.push('## Output file validation');
  lines.push('');
  lines.push('| Title | Final PNG exists | Size 5906x8268 | Metadata exists | Temp removed | Status |');
  lines.push('|-------|------------------|----------------|-------------------|--------------|--------|');
  for (const p of posters) {
    const title = p.meta?.title || p.fileBase;
    lines.push(
      `| ${title} | ${p.checks.finalPngExists ? 'yes' : 'no'} | ${p.dims.width}×${p.dims.height} | ${p.checks.metadataSaved ? 'yes' : 'no'} | ${p.checks.tempRemoved ? 'yes' : 'no'} | ${p.overall.status} |`
    );
  }
  lines.push('');
  lines.push('## Safe framing review');
  lines.push('');
  lines.push('| Title | Safe framing in prompt | Edge risk | Notes |');
  lines.push('|-------|-------------------------|-----------|-------|');
  for (const p of posters) {
    const title = p.meta?.title || p.fileBase;
    const inPrompt = /SAFE PRINT FRAMING/i.test(p.meta?.prompt?.finalPromptSentToModel || '')
      ? 'yes'
      : 'no';
    const edge = p.vision?.edgeRisk || p.edgeHeuristic?.level || 'n/a';
    lines.push(`| ${title} | ${inPrompt} | ${edge} | ${p.edgeHeuristic?.note || p.vision?.notes || '—'} |`);
  }
  lines.push('');
  lines.push('## Metadata review');
  lines.push('');
  lines.push('| Title | Required metadata complete | Routing path | Master stored false | Temp removed true | Status |');
  lines.push('|-------|---------------------------|--------------|----------------------|-------------------|--------|');
  for (const p of posters) {
    const title = p.meta?.title || p.fileBase;
    lines.push(
      `| ${title} | ${p.metaComplete.ok ? 'yes' : 'no'} | ${p.meta?.routingPath || '—'} | ${p.meta?.upscale?.masterStored === false ? 'yes' : 'no'} | ${p.meta?.assets?.temporaryMasterImageRemoved === true ? 'yes' : 'no'} | ${p.overall.status} |`
    );
  }
  lines.push('');
  lines.push('## Problems found');
  lines.push('');
  if (!problems.length) lines.push('_None._');
  else for (const x of problems) lines.push(`- ${x}`);
  lines.push('');
  lines.push('## Recommended fixes');
  lines.push('');
  if (!recommendations.length) lines.push('_None — no code changes required from this run._');
  else for (const r of recommendations) lines.push(`- ${r}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Posters reviewed | ${posters.length} |`);
  lines.push(`| Generated this run | ${generatedCount} |`);
  lines.push(`| Pass | ${passCount} |`);
  lines.push(`| Warnings | ${warnCount} |`);
  lines.push(`| Errors | ${errorCount} |`);
  return lines.join('\n');
}

async function main() {
  const { skipGenerate, noVision } = parseArgs();
  let runStartedMs = Date.now() - 3600_000;
  const runStartedAt = new Date().toISOString();

  if (!skipGenerate) {
    console.log('Starting quality test generation (21 posters, no PDF)...\n');
    runStartedMs = await runGeneration();
  } else {
    console.log('Skipping generation — validating latest posters per case...\n');
  }

  let posters = skipGenerate
    ? collectLatestPostersPerCase(3)
    : collectPostersFromRun(runStartedMs);

  if (posters.length < 21) {
    console.warn(`Found ${posters.length}/21 posters by mtime; filling from latest per folder.`);
    const extra = collectLatestPostersPerCase(3);
    const seen = new Set(posters.map((p) => p.pngAbs));
    for (const p of extra) {
      if (!seen.has(p.pngAbs)) {
        posters.push(p);
        seen.add(p.pngAbs);
      }
    }
  }

  const client =
    !noVision && process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  const problems = [];
  const recommendations = [];
  let pipelineOk = true;

  for (const p of posters) {
    p.meta = loadMeta(p.metaAbs);
    if (p.meta?.title) p.title = p.meta.title;
    p.metaComplete = checkMetadataComplete(p.meta);
    if (!p.metaComplete.ok) {
      problems.push(`${p.fileBase}: incomplete metadata (${p.metaComplete.missing.join(', ')})`);
    }
    p.promptIssues = analyzePromptHeuristics(p.meta, p.category, p.style);
    p.dims = await getImageDimensions(p.pngAbs);
    p.checks = pipelineChecks(p, p.meta, p.dims);
    if (!p.checks.upscaleDone) {
      problems.push(`${p.fileBase}: size ${p.dims.width}×${p.dims.height}, expected ${TARGET_W}×${TARGET_H}`);
      pipelineOk = false;
    }
    if (!p.checks.tempRemoved) {
      problems.push(`${p.fileBase}: temporary .gen.tmp.png still on disk`);
      pipelineOk = false;
    }
    p.edgeHeuristic = await crudeEdgeRisk(p.pngAbs);
    if (client) {
      try {
        p.vision = await visionReview(client, p, p.meta);
        console.log(`  vision OK: ${p.meta?.title || p.fileBase}`);
      } catch (e) {
        p.vision = null;
        problems.push(`${p.fileBase}: vision review failed (${e.message})`);
      }
    }
    p.overall = overallStatus(p.checks, p.promptIssues, p.vision);
  }

  const caseSummaries = TEST_CASES.map(({ category, style }) => {
    const subset = posters.filter((p) => p.category === category && p.style === style);
    const routingPath = subset[0]?.meta?.routingPath || '';
    const statuses = subset.map((p) => p.overall.status);
    const status = statuses.some((s) => s === 'error')
      ? 'error'
      : statuses.some((s) => s === 'warn')
        ? 'warn'
        : statuses.length
          ? 'pass'
          : 'missing';
    const notes = subset
      .flatMap((p) => [...(p.overall.errors || []), ...(p.overall.warnings || [])])
      .slice(0, 3)
      .join('; ');
    return { category, style, count: subset.length, routingPath, status, notes: notes || '—' };
  });

  const passCount = posters.filter((p) => p.overall.status === 'pass').length;
  const warnCount = posters.filter((p) => p.overall.status === 'warn').length;
  const errorCount = posters.filter((p) => p.overall.status === 'error').length;

  if (posters.some((p) => p.meta?.usedFallbackPromptBuilder)) {
    recommendations.push(
      '`src/promptRouter.js` — posters with `usedFallbackPromptBuilder: true` used CORE_FALLBACK; add or tighten dedicated builder for that category+style.'
    );
  }
  for (const p of posters) {
    if (p.promptIssues.some((i) => i.includes('Kawa'))) {
      recommendations.push(
        '`src/salesCategoryPrompts.js` / coffee Photography builder — ensure explicit `no text, no logo, no labels` in `finalPromptSentToModel`.'
      );
      break;
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const md = buildReport({
    posters,
    caseSummaries,
    pipelineOk: pipelineOk && errorCount === 0,
    generatedCount: skipGenerate ? 0 : posters.length,
    passCount,
    warnCount,
    errorCount,
    problems,
    recommendations: [...new Set(recommendations)],
    runStartedAt,
    visionUsed: Boolean(client),
  });
  fs.writeFileSync(REPORT_PATH, md, 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log(`Reviewed: ${posters.length} posters`);
  console.log(`Pass: ${passCount} | Warn: ${warnCount} | Error: ${errorCount}`);
  console.log(`Report: ${REPORT_PATH}`);
  console.log('='.repeat(60));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
