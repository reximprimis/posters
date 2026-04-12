const fs = require('fs');
const path = require('path');
const ContentGenerator = require('./contentGenerator');
const DalleImageGenerator = require('./dalleImageGenerator');
const PDFGenerator = require('./pdfGenerator');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

const projectRoot = path.join(__dirname, '..');
const { applyMatFrameFromBuffer } = require('./posterMatFrame');

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

/**
 * Segment nazwy katalogu dla stylu: posters/Kategoria/styl/
 * (bez znaków niedozwolonych w ścieżkach).
 */
function styleFolderSegment(style) {
  const raw = String(style || 'style').trim();
  const slug = raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || 'style';
}

function posterOutputDir(category, style) {
  return path.join(config.outputDir, category, styleFolderSegment(style));
}

class PosterBatchGenerator {
  constructor() {
    this.contentGen = new ContentGenerator();
    try {
      this.imageGen = new DalleImageGenerator();
    } catch (error) {
      console.warn('⚠️  DALL-E not configured:', error.message);
      throw error;
    }
    this.pdfGen = new PDFGenerator();
    this.dbFile = 'posters_inventory.json';
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

    const poster = {
      id: `${category}_${title.replace(/\s+/g, '_')}_${uuidv4().slice(0, 8)}`,
      category,
      title,
      artStyle,
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
   * DALL-E → tylko plik w .preview-staging (bez biblioteki i bez PDF).
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

  /**
   * Zatwierdzenie podglądu: tylko PNG (full bleed) w posters/{kategoria}/{styl}/, wpis do inventory. PDF i ramka — osobno w bibliotece / CLI.
   */
  async commitPreview(previewId, category, title, style, imagePrompt, promptLlmMeta = {}, commitOpts = {}) {
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
    const safeFileBase = title.replace(/\s+/g, '_');
    const finalAbs = path.join(outputDir, `${safeFileBase}.png`);

    if (fs.existsSync(finalAbs)) {
      fs.unlinkSync(finalAbs);
    }

    const rawBuf = fs.readFileSync(stagingAbs);
    fs.writeFileSync(finalAbs, rawBuf);
    try {
      fs.unlinkSync(stagingAbs);
    } catch (_) {}

    const pdfPaths = {};
    const imagePathForDb = path.relative(projectRoot, finalAbs);

    const shopDesc =
      typeof commitOpts.shopDescription === 'string' ? commitOpts.shopDescription.trim() : '';
    const rowId = this.addPosterToDb(category, title, style, imagePathForDb, pdfPaths, imagePrompt, promptLlmMeta, {
      printLayout: 'full',
      ...(shopDesc ? { shopDescription: shopDesc } : {}),
    });
    return { id: rowId, imagePath: finalAbs, pdfPaths };
  }

  /**
   * Jeden plakat: jeden obraz DALL-E z podanego promptu + wpis do inventory.
   * @param {{ generatePdf?: boolean }} [options] — jeśli true, dodatkowo 6 PDF-ów (wszystkie formaty); domyślnie false (tylko podgląd PNG).
   */
  async generateOnePoster(category, title, style, imagePrompt, options = {}) {
    const { generatePdf = false, promptLlm } = options;

    const outputDir = posterOutputDir(category, style);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const safeFileBase = title.replace(/\s+/g, '_');
    const imagePath = path.join(outputDir, `${safeFileBase}.png`);

    const matStyle = resolveMatStyleFromOptions(options);
    await this.imageGen.generateImage(title, category, style, imagePath, {
      customPrompt: imagePrompt,
      ...(matStyle ? { matStyle } : {}),
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

    return { id, imagePath, pdfPaths, previewOnly: !generatePdf };
  }

  async generateCategory(category, count = 5, options = {}) {
    const { llmProvider: llmProviderOpt, artStyle: fixedArtStyle } = options;
    const useFixedStyle =
      typeof fixedArtStyle === 'string' && config.artStyles.includes(fixedArtStyle);

    const nStyles = config.artStyles.length;
    const totalPlanned = useFixedStyle ? count : count * nStyles;

    console.log('\n' + '='.repeat(60));
    console.log(`Category: ${category}`);
    if (useFixedStyle) {
      console.log(`Mode: fixed style "${fixedArtStyle}" — ${count} poster(s) total`);
    } else {
      console.log(
        `Mode: all styles — ${count} poster(s) per style × ${nStyles} styles = ${totalPlanned} total`
      );
    }
    console.log('='.repeat(60) + '\n');

    const withPdf = options.withPdf === true;

    /**
     * @param {string} title
     * @param {string} style
     * @param {number} idx 1-based
     * @param {number} total
     */
    const generateOneInCategory = async (title, style, idx, total) => {
      console.log(`[${idx}/${total}] "${title}" · ${style}`);

      const outputDir = posterOutputDir(category, style);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`  → Generating image prompt...`);
      const { text: imagePrompt, promptLlm } = await this.contentGen.generateImagePrompt(title, category, style, {
        llmProvider: llmProviderOpt,
      });
      console.log(`  → Prompt: ${imagePrompt}`);

      console.log(`  → Generating image...`);
      const imagePath = path.join(outputDir, `${title.replace(/\s+/g, '_')}.png`);
      const matStyle = resolveMatStyleFromOptions(options);
      await this.imageGen.generateImage(title, category, style, imagePath, {
        customPrompt: imagePrompt,
        ...(matStyle ? { matStyle } : {}),
      });

      const imagePathForDb = path.relative(projectRoot, path.resolve(imagePath));
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
            category,
            style,
            imagePrompt,
            llmProvider: llmProviderOpt,
          });
        } catch (e) {
          console.warn(`  ⚠ opis sklepowy: ${e.message}`);
        }
      }

      this.addPosterToDb(category, title, style, imagePathForDb, pdfPaths, imagePrompt, promptLlm, {
        printLayout: pl,
        ...(shopDescription ? { shopDescription } : {}),
      });
      console.log(`  ✓ Complete\n`);
    };

    if (useFixedStyle) {
      console.log(`📝 Generating ${count} poster title(s)...`);
      const titles = await this.contentGen.generatePosterTitles(category, count, { llmProvider: llmProviderOpt });
      console.log(`✓ Titles: ${titles.join(', ')}\n`);
      for (let i = 0; i < titles.length; i++) {
        await generateOneInCategory(titles[i], fixedArtStyle, i + 1, titles.length);
      }
    } else {
      console.log(`📝 All styles: ${nStyles} separate title batches × ${count} title(s) each\n`);
      let globalIdx = 0;
      for (const style of config.artStyles) {
        console.log(`—— Styl: ${style} ——`);
        const titles = await this.contentGen.generatePosterTitles(category, count, { llmProvider: llmProviderOpt });
        console.log(`✓ Titles: ${titles.join(', ')}\n`);
        for (const title of titles) {
          globalIdx += 1;
          await generateOneInCategory(title, style, globalIdx, totalPlanned);
        }
      }
    }

    const countNow = this.getCategoryCount(category);
    console.log(`✓ ${category}: ${countNow} posters total in library\n`);
  }

  async generateAllCategories(perCategory = 5, options = {}) {
    const useFixedStyle =
      typeof options.artStyle === 'string' && config.artStyles.includes(options.artStyle);
    const nStyles = config.artStyles.length;
    const perCatTotal = useFixedStyle ? perCategory : perCategory * nStyles;
    console.log('\n' + '='.repeat(60));
    console.log(
      `BATCH GENERATION: ${Object.keys(config.categories).length} categories · ` +
        (useFixedStyle
          ? `${perCategory} poster(s) per category (fixed style)`
          : `${perCategory} per style × ${nStyles} styles = ${perCatTotal} poster(s) per category`)
    );
    console.log('='.repeat(60) + '\n');

    for (const category of Object.keys(config.categories)) {
      try {
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
    const out = await applyMatFrameFromBuffer(buf, { style: 'uniform' });
    const parsed = path.parse(abs);
    const framedAbs = path.join(parsed.dir, `${parsed.name}_ramka${parsed.ext}`);
    fs.writeFileSync(framedAbs, out);
    const framedRel = path.relative(projectRoot, framedAbs).replace(/\\/g, '/');

    const key = this.normInventoryImageKey(poster.imagePath);
    for (const p of this.db.posters) {
      if (this.normInventoryImageKey(p.imagePath) === key) {
        p.imagePathFramed = framedRel;
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
