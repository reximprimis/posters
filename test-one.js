#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ContentGenerator = require('./src/contentGenerator');
const DalleImageGenerator = require('./src/dalleImageGenerator');
const PDFGenerator = require('./src/pdfGenerator');
const config = require('./config');

async function testOnePost(title, category = 'Botanika', style = 'photography') {
  console.log('\n' + '='.repeat(60));
  console.log(`Testing: "${title}" (${category})`);
  console.log('='.repeat(60) + '\n');

  try {
    const contentGen = new ContentGenerator();
    const imageGen = new DalleImageGenerator();
    const pdfGen = new PDFGenerator();

    // Generate image
    console.log('📸 Generating image with DALL-E 3...');
    const imagePath = path.join('posters', category, `${title.replace(/\s+/g, '_')}.png`);
    const dir = path.dirname(imagePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const prompt = imageGen.buildImagePrompt(title, category, style);
    console.log(`\n📝 Prompt being sent to DALL-E:\n${prompt}\n`);

    await imageGen.generateImage(title, category, style, imagePath);
    console.log(`✅ Image saved to: ${imagePath}\n`);

    // Generate PDFs
    console.log('📄 Creating print-ready PDFs (300 DPI, CMYK)...');
    for (const sizeName of Object.keys(config.posterSizes)) {
      const pdfPath = path.join(dir, `${title.replace(/\s+/g, '_')}_${sizeName}.pdf`);
      await pdfGen.createPosterPDF(imagePath, sizeName, title, pdfPath);
      console.log(`✓ ${sizeName}: ${pdfPath}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Test complete! Check the image and PDFs.');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Test Summer Garden
testOnePost('Summer Garden', 'Botanika', 'photography');
