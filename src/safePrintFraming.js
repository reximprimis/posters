const path = require('path');
const sharp = require('sharp');

function envFlag(name, defaultOn = true) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultOn;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function envFloat(name, fallback) {
  const n = parseFloat(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBlock(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SAFE_PRINT_FRAMING = normalizeBlock(`
SAFE PRINT FRAMING:
The complete main subject must fit inside the inner 90% safe area of the canvas.
Keep at least 5% clean background margin on every side: top, bottom, left, and right.
The outer 5% border area must contain only soft background, atmosphere, negative space, or non-essential texture.
No important part of the subject may touch, cross, or nearly touch the image border.
The subject should occupy around 70–80% of the canvas, leaving visible breathing room around the full form.
Camera is pulled back slightly to show the complete subject with generous negative space around it.
Avoid tight crop, edge-touching composition, cropped subject parts, oversized subject scale, extreme close-up framing, or important details near borders.
Full-bleed image is allowed only for the background, not for the main subject.
`);

const SAFE_PRINT_FRAMING_BOTANICAL = normalizeBlock(`
SAFE PRINT FRAMING — BOTANICAL:
The entire botanical subject must fit inside the inner 90% safe area of the canvas.
Keep at least 5% clean background margin on every side: top, bottom, left, and right.
The outer 5% border area must contain only soft blurred background, atmosphere, negative space, or non-essential texture.
No blossom, petal, bud, leaf, stem, branch tip, or important botanical detail may touch, cross, or nearly touch the image border.
If the branch grows diagonally, the full diagonal form must still remain safely inside the inner 90% area.
The botanical subject should occupy around 70–80% of the canvas, not more, leaving visible breathing room around it.
Camera is pulled back slightly to show the full botanical form with generous negative space around it.
Avoid tight crop, edge-touching composition, cropped stems, cropped petals, cropped buds, cut-off branches, oversized subject scale, macro crop, or close-up product-shot framing.
Full-bleed image is allowed only for the soft background, not for the branch, flowers, petals, buds, stems, or leaves.
`);

const COMPOSITION_GENERAL = normalizeBlock(`
Composition:
Single cohesive composition with one clear focal subject.
The subject should occupy around 70–80% of the canvas, not more.
Camera is pulled back slightly to show the complete subject with generous negative space around it.
Leave visible breathing room around the full subject.
`);

const COMPOSITION_BOTANICAL = normalizeBlock(`
Composition:
Single cohesive composition with one clear focal subject.
The branch should feel naturally placed, elegant, calm, and premium.
The subject should occupy around 70–80% of the canvas, not more.
Camera is pulled back slightly to show the complete botanical form.
Leave visible breathing room around the full botanical subject.
`);

const COMPOSITION_ABSTRACT = normalizeBlock(`
Composition:
Single cohesive abstract composition with one clear visual hierarchy.
Main abstract forms should occupy around 70–80% of the canvas, not more.
Keep generous breathing room around the full abstract structure.
Forms may overlap softly but must remain elegant, calm, premium, and balanced.
The image should feel like a memory or mood, not like a mockup or product photograph.
`);

const SAFE_PRINT_FRAMING_ABSTRACT = normalizeBlock(`
SAFE PRINT FRAMING:
The complete main abstract structure must fit inside the inner 90% safe area of the canvas.
Keep at least 5% clean background margin on every side: top, bottom, left, and right.
The outer 5% border area must contain only soft background, atmosphere, negative space, or non-essential texture.
No important rectangular form, edge, texture detail, or focal color field may touch, cross, or nearly touch the image border.
Avoid tight crop, edge-touching composition, oversized forms, cropped rectangles, or important details near borders.
Full-bleed image is allowed only for the background, not for the main abstract structure.
`);

const RESTRICTIONS_ABSTRACT = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, packaging copy, watermark, frame, mockup, border, mat, passe-partout, UI, or product presentation.
No realistic photography still-life, no physical table scene, no object-on-surface product shot.
No faces.
Single flat 2D image only.
Premium fine-art artwork for print.
`);

const RESTRICTIONS_BLOCK = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, packaging copy, watermark, frame, mockup, border, mat, passe-partout, or product presentation.
Single flat 2D image only.
Premium fine-art artwork for print.
`);

function isSafeFramingEnabled() {
  return envFlag('ENABLE_SAFE_FRAMING', true);
}

/** Zawsze false — biblioteka przechowuje tylko finalny PNG po upscale (KEEP_MASTER_IMAGES ignorowane). */
function isMasterSaveEnabled() {
  return false;
}

function getSafeMarginPercent() {
  return envFloat('SAFE_MARGIN_PERCENT', 0.05);
}

function getSubjectScaleRange(category, style) {
  const styleNorm = normalizeArtStyle(style);
  if (styleNorm === 'minimalism') {
    return { min: 0.55, max: 0.7 };
  }
  return {
    min: envFloat('SUBJECT_SCALE_MIN', 0.7),
    max: envFloat('SUBJECT_SCALE_MAX', 0.8),
  };
}

function isBotanicalCategory(category) {
  return String(category || '').trim() === 'Botanika';
}

function normalizeArtStyle(style) {
  const s = String(style || '').trim().toLowerCase();
  if (s === 'abstract art' || s === 'abstract') return 'abstract';
  if (s === 'photography') return 'photography';
  if (s === 'illustration') return 'illustration';
  if (s === 'minimalism') return 'minimalism';
  if (s === 'line art' || s === 'lineart') return 'line_art';
  return s || 'photography';
}

function isAbstractArtStyle(style) {
  return normalizeArtStyle(style) === 'abstract';
}

function isMinimalismArtStyle(style) {
  return normalizeArtStyle(style) === 'minimalism';
}

function isNatureLandscapeCategory(category) {
  return String(category || '').trim() === 'Natura i krajobrazy';
}

const COMPOSITION_MINIMAL = normalizeBlock(`
Composition:
Single cohesive minimalist composition with one clear visual hierarchy.
The main structure should occupy around 55–70% of the canvas, not more.
Leave generous breathing room around the full form.
Negative space is part of the artwork.
`);

const SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE = normalizeBlock(`
SAFE PRINT FRAMING — MINIMAL LANDSCAPE:
The complete main landscape structure must fit inside the inner 90% safe area of the canvas.
Keep at least 5% clean background margin on every side: top, bottom, left, and right.
The outer 5% border area must contain only soft background, sky, water, mist, atmosphere, or non-essential tonal texture.
No mountain peak, reflection edge, horizon focus, tree line, river curve, or important landscape form may touch, cross, or nearly touch the image border.
Avoid tight crop, edge-touching composition, oversized landscape forms, cropped reflections, cropped peaks, or important details near borders.
Full-bleed image is allowed only for soft sky, water, mist, and background atmosphere, not for the main landscape structure.
`);

const RESTRICTIONS_MINIMAL_LANDSCAPE = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, watermark, frame, mockup, border, mat, passe-partout, or product presentation.
No people, buildings, boats, animals, roads, signs, or modern elements.
No realistic photography still-life or product-shot framing.
Single flat 2D image only.
Premium fine-art artwork for print.
`);

function resolveSafePrintFramingForCategory(category, style) {
  if (!isSafeFramingEnabled()) return '';
  if (isMinimalismArtStyle(style) && isNatureLandscapeCategory(category)) {
    return SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE;
  }
  if (isAbstractArtStyle(style)) return SAFE_PRINT_FRAMING_ABSTRACT;
  if (isBotanicalCategory(category)) return SAFE_PRINT_FRAMING_BOTANICAL;
  return SAFE_PRINT_FRAMING;
}

function getCompositionBlock(category, style) {
  if (isMinimalismArtStyle(style)) return COMPOSITION_MINIMAL;
  if (isAbstractArtStyle(style)) return COMPOSITION_ABSTRACT;
  if (isBotanicalCategory(category)) return COMPOSITION_BOTANICAL;
  return COMPOSITION_GENERAL;
}

function getRestrictionsBlock(style, category) {
  if (isMinimalismArtStyle(style) && isNatureLandscapeCategory(category)) {
    return RESTRICTIONS_MINIMAL_LANDSCAPE;
  }
  if (isAbstractArtStyle(style)) return RESTRICTIONS_ABSTRACT;
  return RESTRICTIONS_BLOCK;
}

function getSafeFramingMeta(category, style) {
  const botanical = isBotanicalCategory(category) && !isAbstractArtStyle(style) && !isMinimalismArtStyle(style);
  const abstractStyle = isAbstractArtStyle(style);
  const minimalLandscape = isMinimalismArtStyle(style) && isNatureLandscapeCategory(category);
  const minimalStyle = isMinimalismArtStyle(style);
  const margin = getSafeMarginPercent();
  const scale = getSubjectScaleRange(category, style);
  let block = 'GENERAL';
  let logLabel = 'GENERAL / inner 90% / outer 5% background-only';
  if (minimalLandscape) {
    block = 'MINIMAL_LANDSCAPE';
    logLabel = 'MINIMAL LANDSCAPE / inner 90% / outer 5% background-only';
  } else if (abstractStyle) {
    block = 'ABSTRACT';
    logLabel = 'ABSTRACT / inner 90% / outer 5% background-only';
  } else if (botanical) {
    block = 'BOTANICAL';
    logLabel = 'BOTANICAL / inner 90% / outer 5% background-only';
  } else if (minimalStyle) {
    block = 'MINIMAL';
    logLabel = 'MINIMAL / inner 90% / outer 5% background-only';
  }
  return {
    enabled: isSafeFramingEnabled(),
    botanical,
    abstractStyle,
    minimalStyle,
    minimalLandscape,
    block,
    logLabel,
    styleNorm: normalizeArtStyle(style),
    marginPercent: margin,
    innerSafePercent: 1 - margin * 2,
    subjectScaleMin: scale.min,
    subjectScaleMax: scale.max,
  };
}

/** Ephemeral pre-upscale file next to final PNG; always deleted after upscale. */
function tempGenerationPathFromFinal(finalPngPath) {
  const final = String(finalPngPath || '').trim();
  const dir = path.dirname(final);
  const base = path.basename(final, path.extname(final));
  return path.join(dir, `.${base}.gen.tmp.png`);
}

/** @deprecated Use tempGenerationPathFromFinal */
function masterPathFromFinalPath(finalPngPath) {
  return tempGenerationPathFromFinal(finalPngPath);
}

function isExcludedLibraryImageFileName(fileName) {
  const lower = String(fileName || '').toLowerCase();
  return lower.endsWith('_master.png') || lower.includes('.gen.tmp.');
}

/**
 * Placeholder — logs border zones; later: detect sharp subject matter in outer 5%.
 * @returns {Promise<'PASS'|'FAIL'>}
 */
async function validateSafeEdges(imagePath) {
  const meta = await sharp(imagePath).metadata();
  const W = Number(meta.width || 0);
  const H = Number(meta.height || 0);
  const marginPct = getSafeMarginPercent();
  const marginX = Math.round(W * marginPct);
  const marginY = Math.round(H * marginPct);
  const zones = {
    left: { x0: 0, x1: marginX },
    right: { x0: W - marginX, x1: W },
    top: { y0: 0, y1: marginY },
    bottom: { y0: H - marginY, y1: H },
  };
  console.log(
    `    -> validateSafeEdges: ${W}x${H} margin ${(marginPct * 100).toFixed(1)}% ` +
      `(L/R ${marginX}px, T/B ${marginY}px) — PASS (placeholder)`
  );
  console.log(`    -> Border zones (px): ${JSON.stringify(zones)}`);
  return 'PASS';
}

module.exports = {
  SAFE_PRINT_FRAMING,
  SAFE_PRINT_FRAMING_BOTANICAL,
  COMPOSITION_GENERAL,
  COMPOSITION_BOTANICAL,
  COMPOSITION_ABSTRACT,
  COMPOSITION_MINIMAL,
  SAFE_PRINT_FRAMING_ABSTRACT,
  SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE,
  RESTRICTIONS_BLOCK,
  RESTRICTIONS_ABSTRACT,
  RESTRICTIONS_MINIMAL_LANDSCAPE,
  normalizeArtStyle,
  isAbstractArtStyle,
  isMinimalismArtStyle,
  isNatureLandscapeCategory,
  getCompositionBlock,
  getRestrictionsBlock,
  isSafeFramingEnabled,
  isMasterSaveEnabled,
  getSafeMarginPercent,
  getSubjectScaleRange,
  isBotanicalCategory,
  resolveSafePrintFramingForCategory,
  getSafeFramingMeta,
  tempGenerationPathFromFinal,
  masterPathFromFinalPath,
  isExcludedLibraryImageFileName,
  validateSafeEdges,
};
