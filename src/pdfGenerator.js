const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

/**
 * Raster dokładnie tw×th — Sharp `cover` + `centre` (pełna grafika do formatu, bez pasów).
 * Dla PDF bez ramki stosujemy pełny bleed i ewentualne kadrowanie do proporcji strony.
 */
async function rasterForPdfPage(imagePath, tw, th) {
  return sharp(imagePath)
    .resize(tw, th, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({
      quality: 96,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();
}

/**
 * Jednolita grubość passe-partout liczona per format PDF.
 * Domyślnie: dokładnie 5% krótszego boku strony.
 */
function resolveFramePxForSize(tw, th, options = {}) {
  const ratioRaw = Number(options.marginRatio);
  const ratio = Number.isFinite(ratioRaw) && ratioRaw > 0 && ratioRaw < 0.25 ? ratioRaw : 0.05;
  return Math.max(4, Math.round(Math.min(tw, th) * ratio));
}

async function rasterWithFrameForPdfPage(imagePath, tw, th, framePx) {
  const f = Math.max(0, Math.floor(framePx || 0));
  const innerW = Math.max(8, tw - 2 * f);
  const innerH = Math.max(8, th - 2 * f);
  const art = await sharp(imagePath)
    .resize(innerW, innerH, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({
      quality: 96,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();
  return sharp({
    create: { width: tw, height: th, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([{ input: art, left: f, top: f }])
    .jpeg({
      quality: 96,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();
}

async function resolveTargetGeometry(imagePath, sizeConfig, options = {}) {
  const [widthCmBase, heightCmBase] = sizeConfig.cm;
  const [twBase, thBase] = sizeConfig.px;
  const preserveOrientation = options.preserveImageOrientation !== false;
  const target = {
    widthCm: widthCmBase,
    heightCm: heightCmBase,
    tw: twBase,
    th: thBase,
  };
  if (!preserveOrientation) return target;
  if (!imagePath || !fs.existsSync(imagePath)) return target;
  try {
    const meta = await sharp(imagePath).metadata();
    const iw = Number(meta.width || 0);
    const ih = Number(meta.height || 0);
    if (!iw || !ih) return target;
    const imageLandscape = iw > ih;
    const pageLandscape = twBase > thBase;
    if (imageLandscape !== pageLandscape) {
      target.widthCm = heightCmBase;
      target.heightCm = widthCmBase;
      target.tw = thBase;
      target.th = twBase;
    }
  } catch (_) {
    // Fallback to configured orientation when metadata is unavailable.
  }
  return target;
}

class PDFGenerator {
  /**
   * Create a print-ready PDF from an image
   * @param {string} imagePath - Path to the image file
   * @param {string} sizeKey - Size key like '21x30' (in cm)
   * @param {string} title - Poster title (for metadata)
   * @param {string} outputPath - Path to save PDF
   */
  async createPosterPDF(imagePath, sizeKey, title, outputPath, options = {}) {
    const sizeConfig = config.posterSizes[sizeKey];
    if (!sizeConfig) {
      throw new Error(`Unknown size: ${sizeKey}`);
    }

    const geom = await resolveTargetGeometry(imagePath, sizeConfig, options);
    const widthCm = geom.widthCm;
    const heightCm = geom.heightCm;
    const tw = geom.tw;
    const th = geom.th;
    const widthPt = widthCm * 28.35;
    const heightPt = heightCm * 28.35;

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let imageBuffer = null;
    if (fs.existsSync(imagePath)) {
      if (options.frameSpec && options.frameSpec.enabled) {
        const framePx = resolveFramePxForSize(tw, th, options.frameSpec);
        imageBuffer = await rasterWithFrameForPdfPage(imagePath, tw, th, framePx);
      } else {
        imageBuffer = await rasterForPdfPage(imagePath, tw, th);
      }
    }

    await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [widthPt, heightPt],
          margin: 0,
          title: title,
          author: 'reximprimis.com',
          creator: 'Poster Generator',
        });

        const writeStream = fs.createWriteStream(outputPath);

        doc.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', () => resolve());

        doc.pipe(writeStream);

        doc.rect(0, 0, widthPt, heightPt).fill('#ffffff');

        if (imageBuffer) {
          // Bitmapa ma dokładnie proporcje strony (tw:th == widthPt:heightPt) — skala jednolita.
          doc.image(imageBuffer, 0, 0, {
            width: widthPt,
            height: heightPt,
          });
        } else {
          doc.fillColor('#ccc').rect(0, 0, widthPt, heightPt).fill();
          doc.fillColor('black').fontSize(12).text(title, 20, 20);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });

    return outputPath;
  }

  /**
   * Generate PDFs for all 6 sizes from a single image
   * @param {string} imagePath - Path to the image
   * @param {string} title - Poster title
   * @param {string} outputDir - Directory to save PDFs
   * @param {{ nameInfix?: string, frameSpec?: { enabled?: boolean, refWidth?: number, refHeight?: number, refPx?: number } }} [options]
   * @returns {Promise<Object>} - Map of size to output path
   */
  async createMultisizePDF(imagePath, title, outputDir, options = {}) {
    const results = {};
    const slug = String(title || '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'poster';
    const infixRaw = options.nameInfix != null ? String(options.nameInfix).trim() : '';
    const infix = infixRaw ? `_${infixRaw.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}` : '';

    for (const [sizeKey] of Object.entries(config.posterSizes)) {
      const fileName = `${slug}${infix}_${sizeKey}.pdf`;
      const outputPath = path.join(outputDir, fileName);

      try {
        await this.createPosterPDF(imagePath, sizeKey, title, outputPath, options);
        results[sizeKey] = outputPath;
        console.log(`✓ Created ${sizeKey}: ${outputPath}`);
      } catch (error) {
        results[sizeKey] = `ERROR: ${error.message}`;
        console.error(`✗ Failed ${sizeKey}: ${error.message}`);
      }
    }

    return results;
  }
}

module.exports = PDFGenerator;
