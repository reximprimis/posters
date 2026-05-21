const fs = require('fs');
const path = require('path');
const ContentGenerator = require('./contentGenerator');
const DalleImageGenerator = require('./dalleImageGenerator');
const PDFGenerator = require('./pdfGenerator');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

const projectRoot = path.join(__dirname, '..');
const { applyMatFrameFromBuffer } = require('./posterMatFrame');
const { compositeLifestyleMockupFromBuffer } = require('./lifestyleMockup');
const sharp = require('sharp');
const { getSafeFramingMeta, validateSafeEdges, tempGenerationPathFromFinal } = require('./safePrintFraming');
const {
  getAllowedStylesForCategory,
  assertCategoryStyleAllowed,
  getBatchStyles,
  isKnownCategory,
  getRoomCollectionsForCategory,
} = require('./categoryStyles');
const { getPosterOutputDir } = require('./posterPaths');
const { buildPosterMetadataRecord, writePosterMetadataFile } = require('./posterMetadata');
const { getRoutingPathLabel, getPromptRouteKind } = require('./promptRouter');
const DALLE_RATIO_PORTRAIT = 2 / 3;
const DALLE_RATIO_LANDSCAPE = 3 / 2;
const DALLE_RATIO_TOLERANCE = 0.015;
const PRINT_UPSCALE_SHORT_EDGE = 5906;
const PRINT_UPSCALE_LONG_EDGE = 8268;

function isPrintUpscaleEnabled() {
  const raw = String(process.env.POSTER_UPSCALE_ON_SAVE || '1').trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(raw);
}

function resolvePrintUpscaleTarget(width, height) {
  const shortEdge = parseInt(process.env.POSTER_UPSCALE_SHORT_EDGE || `${PRINT_UPSCALE_SHORT_EDGE}`, 10);
  const longEdge = parseInt(process.env.POSTER_UPSCALE_LONG_EDGE || `${PRINT_UPSCALE_LONG_EDGE}`, 10);
  const safeShort = Number.isFinite(shortEdge) && shortEdge >= 1000 ? shortEdge : PRINT_UPSCALE_SHORT_EDGE;
  const safeLong = Number.isFinite(longEdge) && longEdge >= safeShort ? longEdge : PRINT_UPSCALE_LONG_EDGE;
  return Number(width || 0) > Number(height || 0)
    ? { width: safeLong, height: safeShort }
    : { width: safeShort, height: safeLong };
}

/**
 * @param {{ printLayout?: string, matStyle?: string, matFrame?: boolean }} options
 * @returns {'uniform' | 'gallery' | null}
 */
function resolveMatStyleFromOptions(options) {
  const pl = options.printLayout != null ? String(options.printLayout).trim().toLowerCase() : '';
  if (pl === 'gallery') return 'gallery';
  if (pl === 'uniform') return 'uniform';
  const ms = options.matStyle != null ? String(options.matStyle).trim().toLowerCase() : '';
  if (ms === 'gallery' || ms === 'uniform') return ms;
  if (options.matFrame === true) return 'uniform';
  return null;
}

function posterOutputDir(category, style) {
  return getPosterOutputDir(category, style);
}

function makeSafeFileBase(title) {
  const raw = String(title || '').trim();
  const slug = raw
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || 'poster';
}

class PosterBatchGenerator {
  constructor() {
    this.contentGen = new ContentGenerator();
    try {
      this.imageGen = new DalleImageGenerator();
    } catch (error) {
      console.warn('⚠️  Image generator not configured:', error.message);
      throw error;
    }
    this.pdfGen = new PDFGenerator();
    this.dbFile = path.join(projectRoot, 'posters_inventory.json');
    this.db = this.loadDatabase();
  }

  loadDatabase() {
    if (fs.existsSync(this.dbFile)) {
      return JSON.parse(fs.readFileSync(this.dbFile, 'utf-8'));
    }
    return { posters: [], createdAt: new Date().toISOString() };
  }

  saveDatabase() {
    fs.writeFileSync(this.dbFile, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  resolveRoutingMeta(category, style, overrides = {}) {
    const categoryKey = String(category || '').trim();
    const styleKey = String(style || '').trim();
    return {
      routingPath:
        overrides.routingPath != null
          ? overrides.routingPath
          : getRoutingPathLabel(categoryKey, styleKey),
      usedFallbackPromptBuilder:
        overrides.usedFallbackPromptBuilder != null
          ? Boolean(overrides.usedFallbackPromptBuilder)
          : getPromptRouteKind(categoryKey, styleKey) === 'core_fallback',
    };
  }

  writePosterSidecarMetadata(metaInput = {}) {
    try {
      const record = buildPosterMetadataRecord(metaInput);
      const imagePathAbs = metaInput.imagePathAbs;
      const metaPath = writePosterMetadataFile(imagePathAbs, record);
      console.log(`  → Saved metadata JSON: ${path.relative(projectRoot, metaPath).replace(/\\/g, '/')}`);
      if (record.usedFallbackPromptBuilder) {
        console.warn(
          `  ⚠ CORE_FALLBACK recorded in metadata for: ${record.category} + ${record.style}`
        );
      }
      return record;
    } catch (e) {
      console.warn(`  ⚠ metadata sidecar: ${e.message}`);
      return null;
    }
  }

  addPosterToDb(category, title, artStyle, imagePath, pdfPaths, prompt, promptLlmMeta = {}, layoutOpts = {}) {
    let printLayout = 'full';
    if (layoutOpts.printLayout === 'uniform' || layoutOpts.printLayout === 'gallery') {
      printLayout = layoutOpts.printLayout;
    } else if (layoutOpts.matFrame === true) {
      printLayout = 'uniform';
    }
    const matFrame = printLayout !== 'full';
    const shopDesc =
      typeof layoutOpts.shopDescription === 'string' ? layoutOpts.shopDescription.trim() : '';

    const roomCollections = getRoomCollectionsForCategory(category);

    const poster = {
      id: `${category}_${title.replace(/\s+/g, '_')}_${uuidv4().slice(0, 8)}`,
      category,
      title,
      artStyle,
      roomCollections,
      imagePath,
      pdfPaths,
      prompt,
      ...promptLlmMeta,
      printLayout,
      matFrame,
      ...(shopDesc ? { shopDescription: shopDesc } : {}),
      createdAt: new Date().toISOString(),
      status: 'ready',
      /** Ręczne zatwierdzenie do druku — domyślnie false dla nowych / wygenerowanych. */
      approvedForPrint: false,
      /** Shopify flow state: pending_assets -> ready -> legacy_blocked */
      shopifyState: 'pending_assets',
      shopifyIssues: [],
    };

    this.db.posters.push(poster);
    this.saveDatabase();
    return poster.id;
  }

  getCategoryCount(category) {
    return this.db.posters.filter((p) => p.category === category).length;
  }

  getStagingDir() {
    return path.join(__dirname, '..', '.preview-staging');
  }

  isValidPreviewId(id) {
    return typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id.trim());
  }

  /**
   * Generator obrazów → tylko plik w .preview-staging (bez biblioteki i bez PDF).
   */
  async generateStagingPreview(category, title, style, imagePrompt, opts = {}) {
    const dir = this.getStagingDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const previewId = uuidv4();
    const stagingAbs = path.join(dir, `${previewId}.png`);
    await this.imageGen.generateImage(title, category, style, stagingAbs, {
      customPrompt: imagePrompt,
    });
    return { previewId, stagingAbs };
  }

  /**
   * Manual studio flow: accept already prepared image buffer and stage it for review.
   * Input image is normalized to PNG and autorotated from EXIF when present.
   */
  async generateStagingPreviewFromImageBuffer(imageBuffer) {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new Error('Brak danych obrazu do podglądu ręcznego');
    }
    const dir = this.getStagingDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const previewId = uuidv4();
    const stagingAbs = path.join(dir, `${previewId}.png`);
    const out = await sharp(imageBuffer)
      .rotate()
      .png()
      .toBuffer();
    fs.writeFileSync(stagingAbs, out);
    return { previewId, stagingAbs };
  }

  discardPreview(previewId) {
    if (!this.isValidPreviewId(previewId)) return false;
    const p = path.join(this.getStagingDir(), `${previewId.trim()}.png`);
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        return true;
      }
    } catch (_) {}
    return false;
  }

  async readImageDimensions(imageAbs) {
    const meta = await sharp(imageAbs).metadata();
    return {
      width: Number(meta.width || 0),
      height: Number(meta.height || 0),
    };
  }

  /**
   * Tymczasowy PNG z API → validate safe edges → upscale → jeden finalny PNG w bibliotece; temp usuwany.
   */
  async finalizeMasterImageForPrint(tempAbs, finalAbs, logCtx = {}) {
    const { category, style } = logCtx;
    const framing = getSafeFramingMeta(category, style);
    const preDims = await this.readImageDimensions(tempAbs);

    if (framing.enabled) {
      await validateSafeEdges(tempAbs);
    }

    console.log(`    → Generated temporary image for upscale`);

    const up = await this.upscalePosterImageForPrint(tempAbs, finalAbs);
    if (up.skipped && tempAbs !== finalAbs) {
      fs.copyFileSync(tempAbs, finalAbs);
    }

    const finalRel = path.relative(projectRoot, path.resolve(finalAbs)).replace(/\\/g, '/');
    console.log(`    → Saved final PNG: ${finalRel}`);

    let temporaryMasterImageRemoved = false;
    if (tempAbs !== finalAbs && fs.existsSync(tempAbs)) {
      try {
        fs.unlinkSync(tempAbs);
        temporaryMasterImageRemoved = true;
        console.log(`    → Removed temporary image after upscale`);
      } catch (_) {}
    }

    const finalDims = await this.readImageDimensions(finalAbs);
    return { preDims, finalDims, upscale: up, temporaryMasterImageRemoved };
  }

  /**
   * @param {string} sourceAbs — tymczasowy PNG przed upscale (nie modyfikowany gdy destAbs ≠ sourceAbs)
   * @param {string} [destAbs] — final print PNG; defaults to in-place upscale of sourceAbs
   */
  async upscalePosterImageForPrint(sourceAbs, destAbs) {
    const outAbs = destAbs || sourceAbs;
    if (!isPrintUpscaleEnabled()) {
      if (outAbs !== sourceAbs && fs.existsSync(sourceAbs)) {
        fs.copyFileSync(sourceAbs, outAbs);
      }
      return { skipped: true, reason: 'disabled' };
    }
    if (!sourceAbs || typeof sourceAbs !== 'string' || !fs.existsSync(sourceAbs)) {
      return { skipped: true, reason: 'missing_file' };
    }

    const meta = await sharp(sourceAbs).metadata();
    const width = Number(meta.width || 0);
    const height = Number(meta.height || 0);
    if (!width || !height) {
      return { skipped: true, reason: 'missing_dimensions' };
    }

    const target = resolvePrintUpscaleTarget(width, height);
    if (width >= target.width && height >= target.height) {
      if (outAbs !== sourceAbs) {
        fs.copyFileSync(sourceAbs, outAbs);
      }
      return { skipped: true, reason: 'already_large_enough', width, height };
    }

    const tmpAbs = `${outAbs}.upscale.tmp.png`;
    await sharp(sourceAbs)
      .rotate()
      .resize(target.width, target.height, {
        fit: 'cover',
        position: 'centre',
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen({
        sigma: 0.7,
        m1: 0.35,
        m2: 0.12,
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toFile(tmpAbs);
    if (fs.existsSync(outAbs)) {
      fs.unlinkSync(outAbs);
    }
    fs.renameSync(tmpAbs, outAbs);
    console.log(`    → Upscaled for print: ${width}x${height} -> ${target.width}x${target.height}`);
    return { skipped: false, fromWidth: width, fromHeight: height, width: target.width, height: target.height };
  }

  /**
   * Zatwierdzenie podglądu: PNG (full bleed) w posters/{kategoria}/{styl}/ + opcjonalnie PDF pełnej strony, wpis do inventory.
   */
  async commitPreview(previewId, category, title, style, imagePrompt, promptLlmMeta = {}, commitOpts = {}) {
    assertCategoryStyleAllowed(category, style);
    if (!this.isValidPreviewId(previewId)) {
      throw new Error('Nieprawidłowy identyfikator podglądu');
    }
    const id = previewId.trim();
    const stagingAbs = path.join(this.getStagingDir(), `${id}.png`);
    if (!fs.existsSync(stagingAbs)) {
      throw new Error('Plik podglądu nie istnieje — wygeneruj podgląd ponownie');
    }

    const outputDir = posterOutputDir(category, style);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const safeFileBase = makeSafeFileBase(title);
    const finalAbs = path.join(outputDir, `${safeFileBase}.png`);

    if (fs.existsSync(finalAbs)) {
      fs.unlinkSync(finalAbs);
    }

    const rawBuf = fs.readFileSync(stagingAbs);
    const tempAbs = tempGenerationPathFromFinal(finalAbs);
    fs.writeFileSync(tempAbs, rawBuf);
    const framingMeta = getSafeFramingMeta(category, style);
    const printFinalize = await this.finalizeMasterImageForPrint(tempAbs, finalAbs, { category, style });
    try {
      fs.unlinkSync(stagingAbs);
    } catch (_) {}

    const generatePdf = commitOpts.generatePdf === true;
    const generateVariants = commitOpts.generateVariants === true;
    const generatePrintPdfs = commitOpts.generatePrintPdfs === true;
    let pdfPaths = {};
    if (generatePdf) {
      try {
        const pdfAbsMap = await this.pdfGen.createMultisizePDF(finalAbs, title, outputDir);
        for (const [sizeKey, p] of Object.entries(pdfAbsMap)) {
          if (typeof p === 'string' && p.startsWith('ERROR:')) {
            pdfPaths[sizeKey] = p;
          } else {
            pdfPaths[sizeKey] = path.relative(projectRoot, path.resolve(p));
          }
        }
      } catch (e) {
        console.warn('commitPreview PDF:', e.message || e);
        pdfPaths = {};
      }
    }

    const imagePathForDb = path.relative(projectRoot, finalAbs);
    const routingMeta = this.resolveRoutingMeta(category, style, commitOpts);
    const completedAt = new Date();
    this.writePosterSidecarMetadata({
      title,
      category,
      style,
      imagePathAbs: finalAbs,
      imagePathRel: imagePathForDb,
      temporaryMasterImagePathAbs: tempAbs,
      temporaryMasterImageRemoved: printFinalize.temporaryMasterImageRemoved,
      inventoryPathAbs: this.dbFile,
      framingMeta,
      routingPath: routingMeta.routingPath,
      usedFallbackPromptBuilder: routingMeta.usedFallbackPromptBuilder,
      titlePrompt: commitOpts.titlePrompt,
      imagePrompt: commitOpts.imagePrompt || imagePrompt,
      finalPromptSentToModel: commitOpts.finalPromptSentToModel || imagePrompt,
      startedAt: commitOpts.startedAt || completedAt,
      completedAt: commitOpts.completedAt || completedAt,
      model: commitOpts.model,
    });

    const shopDesc =
      typeof commitOpts.shopDescription === 'string' ? commitOpts.shopDescription.trim() : '';
    const rowId = this.addPosterToDb(category, title, style, imagePathForDb, pdfPaths, imagePrompt, promptLlmMeta, {
      printLayout: 'full',
      ...(shopDesc ? { shopDescription: shopDesc } : {}),
    });
    if (generateVariants) {
      try {
        await this.applyUniformFrameForPosterId(rowId);
      } catch (e) {
        console.warn('commitPreview frame variant:', e.message || e);
      }
      try {
        await this.applyShopThumbnailsForPosterId(rowId);
      } catch (e) {
        console.warn('commitPreview shop thumbnails:', e.message || e);
      }
    }
    if (generatePrintPdfs) {
      try {
        if (!generatePdf) {
          await this.applyFullPrintPdfsForPosterId(rowId);
        }
      } catch (e) {
        console.warn('commitPreview full PDFs:', e.message || e);
      }
      try {
        await this.applyFramedPrintPdfsForPosterId(rowId);
      } catch (e) {
        console.warn('commitPreview framed PDFs:', e.message || e);
      }
    }
    return { id: rowId, imagePath: finalAbs, pdfPaths };
  }

  /**
   * Jeden plakat: jeden obraz z generatora z podanego promptu + wpis do inventory.
   * @param {{ generatePdf?: boolean }} [options] — jeśli false, bez PDF (tylko PNG); domyślnie true (6 formatów).
   */
  async generateOnePoster(category, title, style, imagePrompt, options = {}) {
    const { generatePdf = true, promptLlm } = options;
    const generateVariants = options.generateVariants === true;
    const generatePrintPdfs = options.generatePrintPdfs === true;
    assertCategoryStyleAllowed(category, style);

    const outputDir = posterOutputDir(category, style);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const safeFileBase = makeSafeFileBase(title);
    const imagePath = path.join(outputDir, `${safeFileBase}.png`);
    const tempPath = tempGenerationPathFromFinal(imagePath);

    const startedAt = new Date();
    const routingMeta = this.resolveRoutingMeta(category, style, options);
    const matStyle = resolveMatStyleFromOptions(options);
    const gen = await this.imageGen.generateImage(title, category, style, tempPath, {
      customPrompt: imagePrompt,
      category,
      style,
      ...(matStyle ? { matStyle } : {}),
    });
    const framingMeta = getSafeFramingMeta(category, style);
    const printFinalize = await this.finalizeMasterImageForPrint(tempPath, imagePath, { category, style });
    const completedAt = new Date();
    const imagePathForDbEarly = path.relative(projectRoot, path.resolve(imagePath));
    this.writePosterSidecarMetadata({
      title,
      category,
      style,
      imagePathAbs: imagePath,
      imagePathRel: imagePathForDbEarly,
      temporaryMasterImagePathAbs: tempPath,
      temporaryMasterImageRemoved: printFinalize.temporaryMasterImageRemoved,
      inventoryPathAbs: this.dbFile,
      framingMeta,
      routingPath: routingMeta.routingPath,
      usedFallbackPromptBuilder: routingMeta.usedFallbackPromptBuilder,
      titlePrompt: options.titlePrompt,
      imagePrompt,
      finalPromptSentToModel: gen.finalPromptSentToModel,
      startedAt,
      completedAt,
      model: gen.model,
    });

    let pdfPaths = {};
    if (generatePdf) {
      const pdfAbs = await this.pdfGen.createMultisizePDF(imagePath, title, outputDir);
      for (const [sizeKey, p] of Object.entries(pdfAbs)) {
        if (typeof p === 'string' && p.startsWith('ERROR:')) {
          pdfPaths[sizeKey] = p;
        } else {
          pdfPaths[sizeKey] = path.relative(projectRoot, path.resolve(p));
        }
      }
    }

    const llmMeta = promptLlm || this.contentGen.describeManualPrompt();
    const imagePathForDb = path.relative(projectRoot, path.resolve(imagePath));
    const pl = matStyle || 'full';

    let shopDescription = '';
    const listProv = this.contentGen.resolveLlmProvider(options.llmProvider);
    if (listProv) {
      try {
        shopDescription = await this.contentGen.generateListingDescription({
          title,
          category,
          style,
          imagePrompt,
          llmProvider: options.llmProvider,
        });
      } catch (_) {}
    }

    const id = this.addPosterToDb(category, title, style, imagePathForDb, pdfPaths, imagePrompt, llmMeta, {
      printLayout: pl,
      ...(shopDescription ? { shopDescription } : {}),
    });
    if (generateVariants) {
      try {
        await this.applyUniformFrameForPosterId(id);
      } catch (e) {
        console.warn('generateOnePoster frame variant:', e.message || e);
      }
      try {
        await this.applyShopThumbnailsForPosterId(id);
      } catch (e) {
        console.warn('generateOnePoster shop thumbnails:', e.message || e);
      }
    }
    if (generatePrintPdfs) {
      try {
        if (!generatePdf) {
          await this.applyFullPrintPdfsForPosterId(id);
        }
      } catch (e) {
        console.warn('generateOnePoster full PDFs:', e.message || e);
      }
      try {
        await this.applyFramedPrintPdfsForPosterId(id);
      } catch (e) {
        console.warn('generateOnePoster framed PDFs:', e.message || e);
      }
    }

    return { id, imagePath, pdfPaths, previewOnly: !generatePdf };
  }

  async generateCategory(category, count = 5, options = {}) {
    const categoryKey = String(category || '').trim();
    if (!isKnownCategory(categoryKey)) {
      throw new Error(`Unknown category: ${categoryKey}`);
    }

    const { llmProvider: llmProviderOpt, artStyle: fixedArtStyle } = options;
    const allowedStyles = getAllowedStylesForCategory(categoryKey);
    const fixedTrimmed =
      typeof fixedArtStyle === 'string' && fixedArtStyle.trim() ? fixedArtStyle.trim() : '';
    const useFixedStyle = Boolean(fixedTrimmed);
    const stylesForCategory = getBatchStyles(
      categoryKey,
      useFixedStyle ? 'fixed' : 'all',
      fixedTrimmed || allowedStyles[0]
    );

    const nStyles = stylesForCategory.length;
    const totalPlanned = useFixedStyle ? count : count * nStyles;
    const outputRoot = path.join(config.outputDir, categoryKey);
    const roomCollections = getRoomCollectionsForCategory(categoryKey);

    console.log('\n' + '='.repeat(60));
    console.log(`Category: ${categoryKey}`);
    if (useFixedStyle) {
      console.log(`Mode: fixed style "${fixedTrimmed}" — ${count} poster(s) total`);
      console.log(`Allowed styles for category: ${allowedStyles.join(', ')}`);
      console.log(`Room collections: ${roomCollections.join(', ')}`);
      console.log(`Output folder: ${path.join(outputRoot, fixedTrimmed)}/`);
    } else {
      console.log(
        `Mode: all allowed styles — ${count} poster(s) per style × ${nStyles} styles = ${totalPlanned} total`
      );
      console.log(`Allowed styles: ${allowedStyles.join(', ')}`);
      console.log(`Room collections: ${roomCollections.join(', ')}`);
      console.log(`Output root: ${outputRoot}/`);
    }
    console.log('='.repeat(60) + '\n');

    const withPdf = options.withPdf === true;

    /**
     * @param {string} title
     * @param {string} style
     * @param {number} idx 1-based
     * @param {number} total
     */
    const generateOneInCategory = async (title, style, idx, total, runOpts = {}) => {
      console.log(`[${idx}/${total}] "${title}" · ${style}`);

      const outputDir = posterOutputDir(categoryKey, style);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`  → Generating image prompt...`);
      const startedAt = new Date();
      const {
        text: imagePrompt,
        promptLlm,
        routingPath,
        usedFallbackPromptBuilder,
      } = await this.contentGen.generateImagePrompt(title, categoryKey, style, {
        llmProvider: llmProviderOpt,
      });
      console.log(`  → Prompt: ${imagePrompt}`);

      console.log(`  → Generating image...`);
      const safeFileBase = makeSafeFileBase(title);
      const imagePath = path.join(outputDir, `${safeFileBase}.png`);
      const tempPath = tempGenerationPathFromFinal(imagePath);
      const matStyle = resolveMatStyleFromOptions(options);
      const gen = await this.imageGen.generateImage(title, categoryKey, style, tempPath, {
        customPrompt: imagePrompt,
        category: categoryKey,
        style,
        ...(matStyle ? { matStyle } : {}),
      });
      const framingMeta = getSafeFramingMeta(categoryKey, style);
      const printFinalize = await this.finalizeMasterImageForPrint(tempPath, imagePath, {
        category: categoryKey,
        style,
      });
      const completedAt = new Date();

      const imagePathForDb = path.relative(projectRoot, path.resolve(imagePath));
      this.writePosterSidecarMetadata({
        title,
        category: categoryKey,
        style,
        imagePathAbs: imagePath,
        imagePathRel: imagePathForDb,
        temporaryMasterImagePathAbs: tempPath,
        temporaryMasterImageRemoved: printFinalize.temporaryMasterImageRemoved,
        inventoryPathAbs: this.dbFile,
        framingMeta,
        routingPath,
        usedFallbackPromptBuilder,
        titlePrompt: runOpts.titlePrompt,
        imagePrompt,
        finalPromptSentToModel: gen.finalPromptSentToModel,
        startedAt,
        completedAt,
        model: gen.model,
      });
      let pdfPaths = {};
      if (withPdf) {
        console.log(`  → Creating PDFs (6 sizes)...`);
        const pdfPathsAbs = await this.pdfGen.createMultisizePDF(imagePath, title, outputDir);
        for (const [sizeKey, p] of Object.entries(pdfPathsAbs)) {
          if (typeof p === 'string' && p.startsWith('ERROR:')) {
            pdfPaths[sizeKey] = p;
          } else {
            pdfPaths[sizeKey] = path.relative(projectRoot, path.resolve(p));
          }
        }
      } else {
        console.log(`  → Bez PDF — tylko PNG w bibliotece`);
      }

      const pl = matStyle || 'full';

      let shopDescription = '';
      const listProv = this.contentGen.resolveLlmProvider(llmProviderOpt);
      if (listProv) {
        try {
          shopDescription = await this.contentGen.generateListingDescription({
            title,
            category: categoryKey,
            style,
            imagePrompt,
            llmProvider: llmProviderOpt,
          });
        } catch (e) {
          console.warn(`  ⚠ opis sklepowy: ${e.message}`);
        }
      }

      this.addPosterToDb(categoryKey, title, style, imagePathForDb, pdfPaths, imagePrompt, promptLlm, {
        printLayout: pl,
        ...(shopDescription ? { shopDescription } : {}),
      });
      console.log(`  ✓ Complete\n`);
    };

    if (useFixedStyle) {
      console.log(`📝 Generating ${count} poster title(s)...`);
      const { titles, titlePrompt } = await this.contentGen.generatePosterTitles(categoryKey, count, {
        llmProvider: llmProviderOpt,
        artStyle: fixedTrimmed,
      });
      console.log(`✓ Titles: ${titles.join(', ')}\n`);
      for (let i = 0; i < titles.length; i++) {
        await generateOneInCategory(titles[i], fixedTrimmed, i + 1, titles.length, { titlePrompt });
      }
    } else {
      console.log(`📝 All allowed styles: ${nStyles} separate title batches × ${count} title(s) each\n`);
      let globalIdx = 0;
      for (const style of stylesForCategory) {
        console.log(`—— Styl: ${style} ——`);
        const { titles, titlePrompt } = await this.contentGen.generatePosterTitles(categoryKey, count, {
          llmProvider: llmProviderOpt,
          artStyle: style,
        });
        console.log(`✓ Titles: ${titles.join(', ')}\n`);
        for (const title of titles) {
          globalIdx += 1;
          await generateOneInCategory(title, style, globalIdx, totalPlanned, { titlePrompt });
        }
      }
    }

    const countNow = this.getCategoryCount(categoryKey);
    console.log(`✓ ${categoryKey}: ${countNow} posters total in library\n`);
  }

  async generateAllCategories(perCategory = 5, options = {}) {
    const useFixedStyle = typeof options.artStyle === 'string' && options.artStyle.trim() !== '';
    const categories = Object.keys(config.categories);
    const sumStyles = categories.reduce((acc, c) => acc + getAllowedStylesForCategory(c).length, 0);
    const avgStyles = categories.length ? (sumStyles / categories.length) : 0;
    console.log('\n' + '='.repeat(60));
    console.log(
      `BATCH GENERATION: ${categories.length} categories · ` +
        (useFixedStyle
          ? `${perCategory} poster(s) per category (fixed style)`
          : `${perCategory} per allowed style (avg ${avgStyles.toFixed(2)} style/category)`)
    );
    console.log('='.repeat(60) + '\n');

    for (const category of categories) {
      try {
        if (useFixedStyle) {
          assertCategoryStyleAllowed(category, options.artStyle);
        }
        await this.generateCategory(category, perCategory, options);
      } catch (error) {
        console.error(`❌ ERROR in ${category}: ${error.message}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ GENERATION COMPLETE');
    console.log('='.repeat(60) + '\n');
    console.log(`Inventory location: ${config.outputDir}`);
    console.log(`Inventory database: ${this.dbFile}`);
    console.log(`Total posters: ${this.db.posters.length}\n`);
  }

  normInventoryImageKey(rel) {
    return String(rel || '')
      .replace(/\\/g, '/')
      .replace(/^posters\//i, '');
  }

  reloadDatabase() {
    this.db = this.loadDatabase();
  }

  resolveDalleTargetRatioForDimensions(width, height) {
    if (Number(width || 0) > Number(height || 0)) return DALLE_RATIO_LANDSCAPE;
    return DALLE_RATIO_PORTRAIT;
  }

  async enforceMasterStandardForPosterId(posterId) {
    this.reloadDatabase();
    const id = String(posterId || '').trim();
    const poster = this.db.posters.find((p) => p.id === id);
    if (!poster) throw new Error('Nie znaleziono plakatu o podanym id');
    if (!poster.imagePath || typeof poster.imagePath !== 'string') throw new Error('Brak głównej ścieżki obrazu');
    const abs = path.isAbsolute(poster.imagePath) ? poster.imagePath : path.join(projectRoot, poster.imagePath);
    if (!fs.existsSync(abs)) throw new Error('Brak pliku PNG na dysku');

    const meta = await sharp(abs).metadata();
    const width = Number(meta.width || 0);
    const height = Number(meta.height || 0);
    if (!width || !height) throw new Error('Nie udało się odczytać wymiarów mastera');
    const currentRatio = width / height;
    const targetRatio = this.resolveDalleTargetRatioForDimensions(width, height);
    const delta = Math.abs(currentRatio - targetRatio);

    let adjusted = false;
    let outWidth = width;
    let outHeight = height;
    if (delta > DALLE_RATIO_TOLERANCE) {
      let left = 0;
      let top = 0;
      let extractWidth = width;
      let extractHeight = height;
      if (currentRatio > targetRatio) {
        extractWidth = Math.max(1, Math.round(height * targetRatio));
        left = Math.max(0, Math.floor((width - extractWidth) / 2));
      } else {
        extractHeight = Math.max(1, Math.round(width / targetRatio));
        top = Math.max(0, Math.floor((height - extractHeight) / 2));
      }
      const buf = await sharp(abs)
        .rotate()
        .extract({ left, top, width: extractWidth, height: extractHeight })
        .png()
        .toBuffer();
      fs.writeFileSync(abs, buf);
      adjusted = true;
      outWidth = extractWidth;
      outHeight = extractHeight;
    }

    const finalRatio = Number((outWidth / outHeight).toFixed(5));
    const key = this.normInventoryImageKey(poster.imagePath);
    for (const p of this.db.posters) {
      if (this.normInventoryImageKey(p.imagePath) !== key) continue;
      p.masterAspectRatio = finalRatio;
      p.masterStandard = outWidth > outHeight ? 'dalle_3_2' : 'dalle_2_3';
      p.masterStandardAdjusted = adjusted;
      p.masterStandardAt = new Date().toISOString();
    }
    this.saveDatabase();
    return { adjusted, width: outWidth, height: outHeight, ratio: finalRatio };
  }

  async enforceMasterStandardForPosterIds(ids) {
    const list = Array.isArray(ids) ? ids.map((x) => String(x).trim()).filter(Boolean) : [];
    const results = [];
    for (const pid of list) {
      try {
        const out = await this.enforceMasterStandardForPosterId(pid);
        results.push({ id: pid, ok: true, ...out });
      } catch (e) {
        results.push({ id: pid, ok: false, error: e.message || String(e) });
      }
    }
    return results;
  }

  /**
   * Zapisuje `{base}_ramka.png` obok głównego PNG i ustawia `imagePathFramed` na wpisach z tym samym `imagePath`.
   * @param {string} posterId
   * @returns {Promise<string>}
   */
  async applyUniformFrameForPosterId(posterId) {
    this.reloadDatabase();
    const id = String(posterId || '').trim();
    const poster = this.db.posters.find((p) => p.id === id);
    if (!poster) {
      throw new Error('Nie znaleziono plakatu o podanym id');
    }
    const rel = poster.imagePath;
    if (!rel || typeof rel !== 'string') {
      throw new Error('Brak ścieżki obrazu w bibliotece');
    }
    const abs = path.isAbsolute(rel) ? rel : path.join(projectRoot, rel);
    if (!fs.existsSync(abs)) {
      throw new Error('Brak pliku PNG na dysku');
    }
    const buf = fs.readFileSync(abs);
    const out = await applyMatFrameFromBuffer(buf, { style: 'uniform', marginRatio: 0.05 });
    const parsed = path.parse(abs);
    const framedAbs = path.join(parsed.dir, `${parsed.name}_ramka${parsed.ext}`);
    fs.writeFileSync(framedAbs, out);
    const framedRel = path.relative(projectRoot, framedAbs).replace(/\\/g, '/');
    const thumbMainRel = await this.createShopThumbnailForImageAbs(abs);
    const thumbFramedRel = await this.createShopThumbnailForImageAbs(framedAbs);

    const pdfAbsMap = await this.pdfGen.createMultisizePDF(
      framedAbs,
      poster.title,
      parsed.dir,
      { nameInfix: 'ramka' }
    );
    const pdfPathsFramed = {};
    for (const [sizeKey, pth] of Object.entries(pdfAbsMap)) {
      if (typeof pth !== 'string' || pth.startsWith('ERROR:')) continue;
      pdfPathsFramed[sizeKey] = path.relative(projectRoot, path.resolve(pth)).replace(/\\/g, '/');
    }

    const key = this.normInventoryImageKey(poster.imagePath);
    for (const p of this.db.posters) {
      if (this.normInventoryImageKey(p.imagePath) === key) {
        p.imagePathFramed = framedRel;
        p.imagePathThumb = thumbMainRel;
        p.imagePathFramedThumb = thumbFramedRel;
        p.pdfPathsFramed = { ...pdfPathsFramed };
      }
    }
    this.saveDatabase();
    return framedRel;
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<{ id: string, ok: boolean, imagePathFramed?: string, error?: string }[]>}
   */
  async applyUniformFrameForPosterIds(ids) {
    const list = Array.isArray(ids) ? ids.map((x) => String(x).trim()).filter(Boolean) : [];
    const results = [];
    for (const pid of list) {
      try {
        const rel = await this.applyUniformFrameForPosterId(pid);
        results.push({ id: pid, ok: true, imagePathFramed: rel });
      } catch (e) {
        results.push({ id: pid, ok: false, error: e.message || String(e) });
      }
    }
    return results;
  }

  /**
   * Miniatura e-commerce JPEG: dłuższy bok max 1000 px, bez zmiany proporcji.
   * Dla `poster.png` zapisuje `poster_thumb.jpg`.
   * @param {string} imageAbs
   * @returns {Promise<string>} rel path from project root
   */
  async createShopThumbnailForImageAbs(imageAbs) {
    if (!imageAbs || typeof imageAbs !== 'string') {
      throw new Error('Brak ścieżki obrazu do miniatury');
    }
    if (!fs.existsSync(imageAbs)) {
      throw new Error('Brak pliku obrazu do miniatury');
    }
    const parsed = path.parse(imageAbs);
    const thumbAbs = path.join(parsed.dir, `${parsed.name}_thumb.jpg`);
    await sharp(imageAbs)
      .rotate()
      .resize({
        width: 1000,
        height: 1000,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 88,
        mozjpeg: true,
        chromaSubsampling: '4:4:4',
      })
      .toFile(thumbAbs);
    return path.relative(projectRoot, thumbAbs).replace(/\\/g, '/');
  }

  /**
   * Tworzy miniatury JPG dla wersji master i (jeśli istnieje) framed.
   * @param {string} posterId
   * @returns {Promise<{ imagePathThumb: string, imagePathFramedThumb?: string }>}
   */
  async applyShopThumbnailsForPosterId(posterId) {
    this.reloadDatabase();
    const id = String(posterId || '').trim();
    const poster = this.db.posters.find((p) => p.id === id);
    if (!poster) throw new Error('Nie znaleziono plakatu o podanym id');
    if (!poster.imagePath || typeof poster.imagePath !== 'string') {
      throw new Error('Brak głównej ścieżki obrazu');
    }

    const mainAbs = path.isAbsolute(poster.imagePath)
      ? poster.imagePath
      : path.join(projectRoot, poster.imagePath);
    const imagePathThumb = await this.createShopThumbnailForImageAbs(mainAbs);

    let imagePathFramedThumb = '';
    const framedRel = poster.imagePathFramed;
    if (framedRel && typeof framedRel === 'string') {
      const framedAbs = path.isAbsolute(framedRel) ? framedRel : path.join(projectRoot, framedRel);
      if (fs.existsSync(framedAbs)) {
        imagePathFramedThumb = await this.createShopThumbnailForImageAbs(framedAbs);
      }
    }

    const key = this.normInventoryImageKey(poster.imagePath);
    for (const p of this.db.posters) {
      if (this.normInventoryImageKey(p.imagePath) === key) {
        p.imagePathThumb = imagePathThumb;
        if (imagePathFramedThumb) {
          p.imagePathFramedThumb = imagePathFramedThumb;
        }
        p.shopifyState = p.approvedForPrint === true ? 'ready' : 'pending_assets';
        p.shopifyIssues = [];
      }
    }
    this.saveDatabase();
    return imagePathFramedThumb ? { imagePathThumb, imagePathFramedThumb } : { imagePathThumb };
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<{ id: string, ok: boolean, imagePathThumb?: string, imagePathFramedThumb?: string, error?: string }[]>}
   */
  async applyShopThumbnailsForPosterIds(ids) {
    const list = Array.isArray(ids) ? ids.map((x) => String(x).trim()).filter(Boolean) : [];
    const results = [];
    for (const pid of list) {
      try {
        const out = await this.applyShopThumbnailsForPosterId(pid);
        results.push({ id: pid, ok: true, ...out });
      } catch (e) {
        results.push({ id: pid, ok: false, error: e.message || String(e) });
      }
    }
    return results;
  }

  /**
   * Mockup wnętrza (tylko PNG pod sklep): `{base}_lifestyle.png` — bez PDF druku.
   * Używa głównego `imagePath` (pełna strona).
   * @param {string} posterId
   * @returns {Promise<{ imagePathLifestyle: string }>}
   */
  async applyLifestyleMockupForPosterId(posterId) {
    this.reloadDatabase();
    const id = String(posterId || '').trim();
    const poster = this.db.posters.find((p) => p.id === id);
    if (!poster) {
      throw new Error('Nie znaleziono plakatu o podanym id');
    }
    const rel = poster.imagePath;
    if (!rel || typeof rel !== 'string') {
      throw new Error('Brak ścieżki obrazu w bibliotece');
    }
    const abs = path.isAbsolute(rel) ? rel : path.join(projectRoot, rel);
    if (!fs.existsSync(abs)) {
      throw new Error('Brak pliku PNG na dysku');
    }
    const buf = fs.readFileSync(abs);
    const out = await compositeLifestyleMockupFromBuffer(buf);
    const parsed = path.parse(abs);
    const lifestyleAbs = path.join(parsed.dir, `${parsed.name}_lifestyle${parsed.ext}`);
    fs.writeFileSync(lifestyleAbs, out);
    const lifestyleRel = path.relative(projectRoot, lifestyleAbs).replace(/\\/g, '/');

    const key = this.normInventoryImageKey(poster.imagePath);
    for (const p of this.db.posters) {
      if (this.normInventoryImageKey(p.imagePath) === key) {
        p.imagePathLifestyle = lifestyleRel;
        delete p.pdfPathsLifestyle;
      }
    }
    this.saveDatabase();
    return { imagePathLifestyle: lifestyleRel };
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<{ id: string, ok: boolean, imagePathLifestyle?: string, error?: string }[]>}
   */
  async applyLifestyleMockupForPosterIds(ids) {
    const list = Array.isArray(ids) ? ids.map((x) => String(x).trim()).filter(Boolean) : [];
    const results = [];
    for (const pid of list) {
      try {
        const { imagePathLifestyle } = await this.applyLifestyleMockupForPosterId(pid);
        results.push({ id: pid, ok: true, imagePathLifestyle });
      } catch (e) {
        results.push({ id: pid, ok: false, error: e.message || String(e) });
      }
    }
    return results;
  }

  /**
   * PDF-y druku z głównego PNG (pełna strona), bez infixu w nazwie.
   */
  async applyFullPrintPdfsForPosterId(posterId) {
    this.reloadDatabase();
    const id = String(posterId || '').trim();
    const poster = this.db.posters.find((p) => p.id === id);
    if (!poster) throw new Error('Nie znaleziono plakatu o podanym id');
    const rel = poster.imagePath;
    if (!rel || typeof rel !== 'string') throw new Error('Brak ścieżki obrazu w bibliotece');
    const abs = path.isAbsolute(rel) ? rel : path.join(projectRoot, rel);
    if (!fs.existsSync(abs)) throw new Error('Brak pliku PNG na dysku');
    const parsed = path.parse(abs);
    const pdfAbsMap = await this.pdfGen.createMultisizePDF(abs, poster.title, parsed.dir);
    const pdfPaths = {};
    for (const [sizeKey, pth] of Object.entries(pdfAbsMap)) {
      if (typeof pth !== 'string' || pth.startsWith('ERROR:')) continue;
      pdfPaths[sizeKey] = path.relative(projectRoot, path.resolve(pth)).replace(/\\/g, '/');
    }
    const key = this.normInventoryImageKey(poster.imagePath);
    for (const p of this.db.posters) {
      if (this.normInventoryImageKey(p.imagePath) === key) {
        p.pdfPaths = { ...pdfPaths };
      }
    }
    this.saveDatabase();
    return pdfPaths;
  }

  async applyFullPrintPdfsForPosterIds(ids) {
    const list = Array.isArray(ids) ? ids.map((x) => String(x).trim()).filter(Boolean) : [];
    const results = [];
    for (const pid of list) {
      try {
        await this.applyFullPrintPdfsForPosterId(pid);
        results.push({ id: pid, ok: true });
      } catch (e) {
        results.push({ id: pid, ok: false, error: e.message || String(e) });
      }
    }
    return results;
  }

  /**
   * PDF-y z passe-partout (_ramka_) liczone per format, aby zachować ten sam wygląd ramki.
   */
  async applyFramedPrintPdfsForPosterId(posterId) {
    this.reloadDatabase();
    const id = String(posterId || '').trim();
    const poster = this.db.posters.find((p) => p.id === id);
    if (!poster) throw new Error('Nie znaleziono plakatu o podanym id');
    const mainRel = poster.imagePath;
    if (!mainRel || typeof mainRel !== 'string') throw new Error('Brak głównego PNG plakatu');
    const mainAbs = path.isAbsolute(mainRel) ? mainRel : path.join(projectRoot, mainRel);
    if (!fs.existsSync(mainAbs)) throw new Error('Brak głównego PNG na dysku');
    const parsed = path.parse(mainAbs);
    const pdfAbsMap = await this.pdfGen.createMultisizePDF(mainAbs, poster.title, parsed.dir, {
      nameInfix: 'ramka',
      frameSpec: {
        enabled: true,
        marginRatio: 0.05,
      },
    });
    const pdfPathsFramed = {};
    for (const [sizeKey, pth] of Object.entries(pdfAbsMap)) {
      if (typeof pth !== 'string' || pth.startsWith('ERROR:')) continue;
      pdfPathsFramed[sizeKey] = path.relative(projectRoot, path.resolve(pth)).replace(/\\/g, '/');
    }
    const key = this.normInventoryImageKey(poster.imagePath);
    for (const p of this.db.posters) {
      if (this.normInventoryImageKey(p.imagePath) === key) {
        p.pdfPathsFramed = { ...pdfPathsFramed };
      }
    }
    this.saveDatabase();
    return pdfPathsFramed;
  }

  async applyFramedPrintPdfsForPosterIds(ids) {
    const list = Array.isArray(ids) ? ids.map((x) => String(x).trim()).filter(Boolean) : [];
    const results = [];
    for (const pid of list) {
      try {
        await this.applyFramedPrintPdfsForPosterId(pid);
        results.push({ id: pid, ok: true });
      } catch (e) {
        results.push({ id: pid, ok: false, error: e.message || String(e) });
      }
    }
    return results;
  }

  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('INVENTORY STATISTICS');
    console.log('='.repeat(60) + '\n');

    const byCategory = {};
    for (const poster of this.db.posters) {
      byCategory[poster.category] = (byCategory[poster.category] || 0) + 1;
    }

    for (const [category, count] of Object.entries(byCategory)) {
      console.log(`${category}: ${count} posters`);
    }

    console.log(`\nTotal: ${this.db.posters.length} posters\n`);
  }
}

module.exports = PosterBatchGenerator;
