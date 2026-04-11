const fs = require('fs');
const path = require('path');
const ContentGenerator = require('./contentGenerator');
const ImageGenerator = require('./imageGenerator');
const PDFGenerator = require('./pdfGenerator');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class PosterBatchGenerator {
  constructor() {
    this.contentGen = new ContentGenerator();
    this.imageGen = new ImageGenerator();
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

  addPosterToDb(category, title, artStyle, imagePath, pdfPaths, prompt) {
    const poster = {
      id: `${category}_${title.replace(/\s+/g, '_')}_${uuidv4().slice(0, 8)}`,
      category,
      title,
      artStyle,
      imagePath,
      pdfPaths,
      prompt,
      createdAt: new Date().toISOString(),
      status: 'ready',
    };

    this.db.posters.push(poster);
    this.saveDatabase();
    return poster.id;
  }

  getCategoryCount(category) {
    return this.db.posters.filter((p) => p.category === category).length;
  }

  async generateCategory(category, count = 5) {
    console.log('\n' + '='.repeat(60));
    console.log(`Generating ${count} posters for: ${category}`);
    console.log('='.repeat(60) + '\n');

    const categoryDir = path.join(config.outputDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    // Generate titles
    console.log(`📝 Generating ${count} poster titles...`);
    const titles = await this.contentGen.generatePosterTitles(category, count);
    console.log(`✓ Generated titles: ${titles.join(', ')}\n`);

    // Generate posters
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      console.log(`[${i + 1}/${count}] Processing "${title}"...`);

      const style = config.artStyles[i % config.artStyles.length];

      // Generate image prompt
      console.log(`  → Generating image prompt...`);
      const imagePrompt = await this.contentGen.generateImagePrompt(title, category, style);
      console.log(`  → Prompt: ${imagePrompt}`);

      // Generate image
      console.log(`  → Generating image...`);
      const imagePath = path.join(categoryDir, `${title.replace(/\s+/g, '_')}.png`);
      await this.imageGen.generateImage(imagePrompt, imagePath);

      // Create PDFs for all sizes
      console.log(`  → Creating PDFs (6 sizes)...`);
      const pdfPaths = await this.pdfGen.createMultisizePDF(imagePath, title, categoryDir);

      // Add to database
      this.addPosterToDb(category, title, style, imagePath, pdfPaths, imagePrompt);
      console.log(`  ✓ Complete\n`);
    }

    const countNow = this.getCategoryCount(category);
    console.log(`✓ ${category}: ${countNow} posters total\n`);
  }

  async generateAllCategories(perCategory = 5) {
    console.log('\n' + '='.repeat(60));
    console.log(
      `BATCH GENERATION: ${Object.keys(config.categories).length} categories × ${perCategory} posters`
    );
    console.log('='.repeat(60) + '\n');

    for (const category of Object.keys(config.categories)) {
      try {
        await this.generateCategory(category, perCategory);
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
