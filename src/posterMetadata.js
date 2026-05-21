const fs = require('fs');
const path = require('path');
const { getRoomCollectionsForCategory } = require('./categoryStyles');
const { getPosterOutputDir } = require('./posterPaths');
const { getSafeFramingMeta, isSafeFramingEnabled } = require('./safePrintFraming');

const projectRoot = path.join(__dirname, '..');

const CATEGORY_SCHEMA_VERSION = '2026-05-18-v1';
const PROMPT_BUILDER_VERSION = '2026-05-18-safe-framing-routing-v1';

const PRINT_UPSCALE_SHORT_EDGE = 5906;
const PRINT_UPSCALE_LONG_EDGE = 8268;

function getImageModel() {
  return String(process.env.IMAGE_GENERATION_MODEL || 'gpt-image-2').trim() || 'gpt-image-2';
}

function relProjectPath(absPath) {
  if (!absPath) return null;
  return path.relative(projectRoot, path.resolve(absPath)).replace(/\\/g, '/');
}

/**
 * Sidecar JSON next to PNG: {base}.meta.json
 * @param {string} imagePathAbs
 */
function posterMetadataPathFromImage(imagePathAbs) {
  const abs = path.resolve(String(imagePathAbs || ''));
  const dir = path.dirname(abs);
  const base = path.basename(abs, path.extname(abs));
  return path.join(dir, `${base}.meta.json`);
}

/**
 * @param {object} params
 * @returns {object}
 */
function buildPosterMetadataRecord({
  title,
  category,
  style,
  imagePathAbs,
  imagePathRel,
  temporaryMasterImagePathAbs,
  temporaryMasterImageRemoved = true,
  inventoryPathAbs,
  model,
  safeFramingMeta,
  routingPath,
  usedFallbackPromptBuilder,
  titlePrompt,
  imagePrompt,
  finalPromptSentToModel,
  startedAt,
  completedAt,
}) {
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const titleText = String(title || '').trim();
  const outputDirAbs = getPosterOutputDir(categoryKey, styleKey);
  const framing =
    safeFramingMeta ||
    getSafeFramingMeta(categoryKey, styleKey);

  const started =
    startedAt != null
      ? startedAt instanceof Date
        ? startedAt.toISOString()
        : String(startedAt)
      : null;
  const completed =
    completedAt != null
      ? completedAt instanceof Date
        ? completedAt.toISOString()
        : String(completedAt)
      : null;
  let durationMs = null;
  if (started && completed) {
    const t0 = Date.parse(started);
    const t1 = Date.parse(completed);
    if (Number.isFinite(t0) && Number.isFinite(t1) && t1 >= t0) {
      durationMs = t1 - t0;
    }
  }

  const finalRel = imagePathRel || relProjectPath(imagePathAbs);
  const metaAbs = imagePathAbs ? posterMetadataPathFromImage(imagePathAbs) : null;
  const imagePromptText = String(imagePrompt || '').trim();
  const finalPromptText = String(finalPromptSentToModel || imagePromptText || '').trim();

  return {
    categorySchemaVersion: CATEGORY_SCHEMA_VERSION,
    promptBuilderVersion: PROMPT_BUILDER_VERSION,
    routingPath: routingPath || null,
    usedFallbackPromptBuilder: Boolean(usedFallbackPromptBuilder),
    title: titleText,
    category: categoryKey,
    style: styleKey,
    roomCollections: getRoomCollectionsForCategory(categoryKey),
    outputDir: relProjectPath(outputDirAbs),
    imagePath: finalRel,
    prompt: {
      titlePrompt: titlePrompt != null && String(titlePrompt).trim() ? String(titlePrompt).trim() : null,
      imagePrompt: imagePromptText || null,
      finalPromptSentToModel: finalPromptText || null,
    },
    generation: {
      model: model || getImageModel(),
      style: styleKey,
      category: categoryKey,
      title: titleText,
      startedAt: started,
      completedAt: completed,
      durationMs,
    },
    assets: {
      temporaryMasterImagePath: relProjectPath(temporaryMasterImagePathAbs),
      temporaryMasterImageRemoved: Boolean(temporaryMasterImageRemoved),
      finalImagePath: finalRel,
      metadataPath: relProjectPath(metaAbs),
      inventoryPath: relProjectPath(inventoryPathAbs || path.join(projectRoot, 'posters_inventory.json')),
    },
    safeFraming: {
      enabled: isSafeFramingEnabled(),
      innerSafeArea: '90%',
      outerBorder: '5%',
      outerBorderRule: 'background-only',
      block: framing.block,
      subjectScaleMin: framing.subjectScaleMin,
      subjectScaleMax: framing.subjectScaleMax,
    },
    safeFramingValidation: {
      enabled: isSafeFramingEnabled(),
      status: 'NOT_CHECKED',
      note: 'Prompt-level safe framing only; visual edge validation not implemented yet.',
    },
    upscale: {
      temporaryMasterBeforeUpscale: true,
      masterStored: false,
      targetSize: `${PRINT_UPSCALE_SHORT_EDGE}x${PRINT_UPSCALE_LONG_EDGE}`,
    },
    createdAt: completed || new Date().toISOString(),
  };
}

/**
 * @param {string} imagePathAbs
 * @param {object} record
 */
function writePosterMetadataFile(imagePathAbs, record) {
  const metaPath = posterMetadataPathFromImage(imagePathAbs);
  fs.writeFileSync(metaPath, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
  return metaPath;
}

module.exports = {
  CATEGORY_SCHEMA_VERSION,
  PROMPT_BUILDER_VERSION,
  buildPosterMetadataRecord,
  writePosterMetadataFile,
  posterMetadataPathFromImage,
  relProjectPath,
};
