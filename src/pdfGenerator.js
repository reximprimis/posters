const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

/**
 * Raster dokładnie tw×th — Sharp `contain` + `centre` + białe tło (jeden pipeline).
 * Daje symetryczne paski: lewo = prawo, góra = dół (w pikselach strony PDF).
 * Uwaga: „grafika” w sensie kompozycji DALL‑E (pasy, gradient) może wizualnie
 * nie pokrywać się z krawędzią bitmapy — wtedy oko widzi nierówność mimo poprawnej geometrii.
 */
async function rasterForPdfPage(imagePath, tw, th) {
  return sharp(imagePath)
    .resize(tw, th, {
      fit: 'contain',
      position: 'centre',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
}

class PDFGenerator {
  /**
   * Create a print-ready PDF from an image
   * @param {string} imagePath - Path to the image file
   * @param {string} sizeKey - Size key like '21x30' (in cm)
   * @param {string} title - Poster title (for metadata)
   * @param {string} outputPath - Path to save PDF
   */
  async createPosterPDF(imagePath, sizeKey, title, outputPath) {
    const sizeConfig = config.posterSizes[sizeKey];
    if (!sizeConfig) {
      throw new Error(`Unknown size: ${sizeKey}`);
    }

    const [widthCm, heightCm] = sizeConfig.cm;
    const [tw, th] = sizeConfig.px;
    const widthPt = widthCm * 28.35;
    const heightPt = heightCm * 28.35;

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let imageBuffer = null;
    if (fs.existsSync(imagePath)) {
      imageBuffer = await rasterForPdfPage(imagePath, tw, th);
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
   * @returns {Promise<Object>} - Map of size to output path
   */
  async createMultisizePDF(imagePath, title, outputDir) {
    const results = {};

    for (const [sizeKey] of Object.entries(config.posterSizes)) {
      const fileName = `${title.replace(/\s+/g, '_')}_${sizeKey}.pdf`;
      const outputPath = path.join(outputDir, fileName);

      try {
        await this.createPosterPDF(imagePath, sizeKey, title, outputPath);
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
