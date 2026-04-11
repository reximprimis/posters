const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class PDFGenerator {
  /**
   * Create a print-ready PDF from an image
   * @param {string} imagePath - Path to the image file
   * @param {string} sizeKey - Size key like '21x30' (in cm)
   * @param {string} title - Poster title (for metadata)
   * @param {string} outputPath - Path to save PDF
   */
  async createPosterPDF(imagePath, sizeKey, title, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const sizeConfig = config.posterSizes[sizeKey];
        if (!sizeConfig) {
          return reject(new Error(`Unknown size: ${sizeKey}`));
        }

        const [widthCm, heightCm] = sizeConfig.cm;
        // Convert cm to points (1 cm = 28.35 points)
        const widthPt = widthCm * 28.35;
        const heightPt = heightCm * 28.35;

        // Create PDF with specified dimensions
        const doc = new PDFDocument({
          size: [widthPt, heightPt],
          margin: 0,
          title: title,
          author: 'reximprimis.com',
          creator: 'Poster Generator',
        });

        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const writeStream = fs.createWriteStream(outputPath);

        doc.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', () => resolve(outputPath));

        doc.pipe(writeStream);

        // Add image to fill the entire page
        if (fs.existsSync(imagePath)) {
          doc.image(imagePath, 0, 0, {
            width: widthPt,
            height: heightPt,
          });
        } else {
          // Fallback: solid color background if image doesn't exist
          doc.fillColor('#ccc').rect(0, 0, widthPt, heightPt).fill();
          doc.fillColor('black').fontSize(12).text(title, 20, 20);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
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
