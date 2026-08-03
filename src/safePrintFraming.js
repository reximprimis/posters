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

function envInt(name, fallback) {
  const n = parseInt(process.env[name], 10);
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

/**
 * Ochrona przed naruszeniem praw — wbudowana w KAZDY blok restrykcji.
 *
 * Powod: sprzedajemy wydruki komercyjnie, wiec rozpoznawalna twarz sportowca,
 * herb klubu czy koszulka reprezentacji to nie kwestia estetyki, tylko ryzyko
 * prawne (prawo do wizerunku, znaki towarowe).
 *
 * Doklejane do samych STALYCH, nie do getRestrictionsBlock(), bo osiem plikow
 * siega po te stale bezposrednio z pominieciem funkcji — m.in. sciezka Abstract.
 */
const IP_SAFETY_LINES = `
Rights safety — mandatory:
No recognisable real person, no portrait or likeness of any public figure, athlete, musician, actor, or historical person.
No real club crests, team kits, national team jerseys, sponsor markings, competition trophies, or event branding.
No copyrighted characters, mascots, film or game imagery, album covers, or recognisable branded product designs.
Any human presence must be anonymous and incidental: distant, turned away, or reduced to an unidentifiable silhouette.
`;

const RESTRICTIONS_ABSTRACT = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, packaging copy, watermark, frame, mockup, border, mat, passe-partout, UI, or product presentation.
No realistic photography still-life, no physical table scene, no object-on-surface product shot.
No faces.
Single flat 2D image only.
Premium fine-art artwork for print.
${IP_SAFETY_LINES}
`);

const RESTRICTIONS_BLOCK = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, packaging copy, watermark, frame, mockup, border, mat, passe-partout, or product presentation.
Single flat 2D image only.
Premium fine-art artwork for print.
${IP_SAFETY_LINES}
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
${IP_SAFETY_LINES}
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

const COMPOSITION_LINE_ART = normalizeBlock(`
Composition:
Single cohesive line-art composition with one clear focal subject.
The entire subject must be fully visible — no part cut off at top, bottom, left, or right.
Tall vertical subjects (rackets, tools, bottles, figures) need clear margin above and below the full silhouette.
Subject occupies around 60–75% of the canvas with generous breathing room on all sides.
`);

function getCompositionBlock(category, style) {
  if (normalizeArtStyle(style) === 'line_art') return COMPOSITION_LINE_ART;
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
 * Detect non-background pixels in outer margin bands (subject touching / crossing border).
 * Background is sampled from the four corners — never from the image center (that is usually
 * the subject and caused false FAIL rates of 50–100% on still-life photography).
 * @returns {Promise<{ status: 'PASS'|'FAIL', reasons: string[], bands: object }>}
 */
async function validateSafeEdges(imagePath, style) {
  const meta = await sharp(imagePath).metadata();
  const W = Number(meta.width || 0);
  const H = Number(meta.height || 0);
  if (!W || !H) {
    return { status: 'PASS', reasons: [], bands: {} };
  }

  const styleNorm = normalizeArtStyle(style);

  // Photography / soft full-bleed scenes (sand, sky, table texture) legitimately fill
  // the outer 5% — pixel "clean margin" checks are prompt-only for those styles.
  // Hard edge checks remain for line art / illustration on flat backgrounds.
  if (styleNorm === 'photography' || styleNorm === 'abstract' || styleNorm === 'minimalism') {
    console.log(
      `    -> validateSafeEdges: ${W}x${H} — PASS (prompt-level only for ${styleNorm}; pixel border check skipped)`
    );
    return { status: 'PASS', reasons: [], bands: {}, skippedPixelCheck: true, styleNorm };
  }

  const marginPct = getSafeMarginPercent();
  const marginX = Math.max(2, Math.round(W * marginPct));
  const marginY = Math.max(2, Math.round(H * marginPct));

  const analyzeW = Math.min(W, 720);
  const analyzeH = Math.max(2, Math.round((analyzeW / W) * H));
  const raw = await sharp(imagePath)
    .resize(analyzeW, analyzeH, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const ch = 4;
  const scaleX = analyzeW / W;
  const scaleY = analyzeH / H;
  const bandX = Math.max(2, Math.round(marginX * scaleX));
  const bandY = Math.max(2, Math.round(marginY * scaleY));

  // Corner patches (~8% of analyze size) — true background / pad color.
  const pw = Math.max(4, Math.round(analyzeW * 0.08));
  const ph = Math.max(4, Math.round(analyzeH * 0.08));
  const cornerRegions = [
    { x0: 0, y0: 0, w: pw, h: ph },
    { x0: analyzeW - pw, y0: 0, w: pw, h: ph },
    { x0: 0, y0: analyzeH - ph, w: pw, h: ph },
    { x0: analyzeW - pw, y0: analyzeH - ph, w: pw, h: ph },
  ];
  const rs = [];
  const gs = [];
  const bs = [];
  for (const region of cornerRegions) {
    for (let y = region.y0; y < region.y0 + region.h; y += 2) {
      for (let x = region.x0; x < region.x0 + region.w; x += 2) {
        const i = (y * analyzeW + x) * ch;
        rs.push(raw[i]);
        gs.push(raw[i + 1]);
        bs.push(raw[i + 2]);
      }
    }
  }
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] || 240;
  };
  const br = median(rs);
  const bg = median(gs);
  const bb = median(bs);

  const colorDelta = envFloat('SAFE_EDGE_COLOR_DELTA', 36);
  const ratioMax = envFloat('SAFE_EDGE_SUBJECT_RATIO_MAX_LINE', 0.01);

  function isSubjectPixel(i) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const dist = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const bgLum = 0.299 * br + 0.587 * bg + 0.114 * bb;
    return dist > colorDelta && Math.abs(lum - bgLum) > 22;
  }

  function bandRatio(x0, y0, w, h, step = 1) {
    let subject = 0;
    let total = 0;
    const xEnd = Math.min(analyzeW, x0 + w);
    const yEnd = Math.min(analyzeH, y0 + h);
    for (let y = Math.max(0, y0); y < yEnd; y += step) {
      for (let x = Math.max(0, x0); x < xEnd; x += step) {
        total += 1;
        const i = (y * analyzeW + x) * ch;
        if (isSubjectPixel(i)) subject += 1;
      }
    }
    return total ? subject / total : 0;
  }

  const bands = {
    top: bandRatio(0, 0, analyzeW, bandY),
    bottom: bandRatio(0, analyzeH - bandY, analyzeW, bandY),
    left: bandRatio(0, 0, bandX, analyzeH),
    right: bandRatio(analyzeW - bandX, 0, bandX, analyzeH),
  };

  const reasons = [];
  for (const [edge, ratio] of Object.entries(bands)) {
    if (ratio > ratioMax) {
      reasons.push(`${edge} margin ${(ratio * 100).toFixed(1)}% subject (max ${(ratioMax * 100).toFixed(1)}%)`);
    }
  }

  const status = reasons.length ? 'FAIL' : 'PASS';
  console.log(
    `    -> validateSafeEdges: ${W}x${H} margin ${(marginPct * 100).toFixed(1)}% ` +
      `(L/R ${marginX}px, T/B ${marginY}px) — ${status}` +
      (reasons.length ? ` (${reasons.join('; ')})` : '')
  );
  if (reasons.length) {
    console.log(`    -> Border subject ratios: ${JSON.stringify(bands)}`);
  }
  return { status, reasons, bands };
}

function getSafeFramingMaxRetries() {
  const n = envInt('SAFE_FRAMING_MAX_RETRIES', 2);
  return Number.isFinite(n) && n >= 0 ? n : 2;
}

const FRAMING_RETRY_PROMPT_SUFFIX = normalizeBlock(`
CRITICAL RE-FRAME: Previous attempt clipped the subject at the image border — unacceptable for print.
Show the COMPLETE subject with every part fully visible: nothing cut off at top, bottom, left, or right.
Pull the camera back. Subject must occupy only 60–70% of canvas height with clear empty margin on all four sides.
The outer 8% of the canvas must be clean background only — no subject lines, shapes, or shadows touching edges.
`);

module.exports = {
  SAFE_PRINT_FRAMING,
  SAFE_PRINT_FRAMING_BOTANICAL,
  COMPOSITION_GENERAL,
  COMPOSITION_BOTANICAL,
  COMPOSITION_ABSTRACT,
  COMPOSITION_MINIMAL,
  COMPOSITION_LINE_ART,
  SAFE_PRINT_FRAMING_ABSTRACT,
  SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE,
  RESTRICTIONS_BLOCK,
  RESTRICTIONS_ABSTRACT,
  RESTRICTIONS_MINIMAL_LANDSCAPE,
  IP_SAFETY_LINES,
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
  getSafeFramingMaxRetries,
  FRAMING_RETRY_PROMPT_SUFFIX,
};
