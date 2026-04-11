const axios = require('axios');
const config = require('../config');
const fs = require('fs');

class CanvaGenerator {
  constructor() {
    this.apiKey = config.canvaKey;
    this.apiSecret = config.canvaSecret;
    this.baseUrl = 'https://api.canva.com/v1';

    if (!this.apiKey || !this.apiSecret) {
      console.warn('Canva API credentials not configured. Will use fallback image generation.');
      this.client = null;
      return;
    }

    // Create axios instance with basic auth
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.apiKey,
        password: this.apiSecret
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async createAndExportDesign(title, category, style, outputPath) {
    // If no Canva credentials, use fallback
    if (!this.client) {
      return await this.createFallbackImage(title, category, outputPath);
    }

    try {
      // Step 1: Create a blank design
      const designResponse = await this.client.post('/designs', {
        title: title,
        width: 3543, // 30cm at 300 DPI in pixels
        height: 4724, // 40cm at 300 DPI in pixels (using 30x40 as base)
        unit: 'px'
      });

      const designId = designResponse.data.id;
      console.log(`    ✓ Created Canva design: ${designId}`);

      // Step 2: Add title text to design
      await this.addTitleText(designId, title, category);

      // Step 3: Export design as PNG
      const imageBuffer = await this.exportDesignAsPng(designId);

      // Step 4: Save image to file
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`    ✓ Exported to: ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.error(`    ⚠ Canva error: ${error.message}`);
      // Return a fallback if Canva fails
      return await this.createFallbackImage(title, category, outputPath);
    }
  }

  async addTitleText(designId, title, category) {
    const textColor = this.getColorForCategory(category);

    try {
      await this.client.post(`/designs/${designId}/elements`, {
        type: 'text',
        content: title,
        x: 100,
        y: 100,
        width: 3343,
        height: 500,
        fontSize: 72,
        fontFamily: 'Montserrat',
        color: textColor,
        textAlign: 'center',
        fontWeight: 'bold'
      });
    } catch (error) {
      console.warn(`    Could not add text to design: ${error.message}`);
    }
  }

  async exportDesignAsPng(designId) {
    const exportResponse = await this.client.post(`/designs/${designId}/exports`, {
      fileType: 'png',
      scale: 1
    });

    const exportId = exportResponse.data.id;

    // Poll for export completion (max 30 seconds)
    let attempts = 0;
    while (attempts < 30) {
      const statusResponse = await this.client.get(`/designs/${designId}/exports/${exportId}`);

      if (statusResponse.data.status === 'success') {
        // Download the image
        const downloadUrl = statusResponse.data.download_url;
        const imageResponse = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        return imageResponse.data;
      }

      if (statusResponse.data.status === 'failed') {
        throw new Error('Canva export failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Canva export timeout');
  }

  getColorForCategory(category) {
    // Color map for different categories
    const categoryColors = {
      'Botanika': '#2D5016',
      'Pory roku': '#E67E22',
      'Natura i krajobrazy': '#27AE60',
      'Obrazy do kuchni': '#E74C3C',
      'Plakaty z napisami': '#2C3E50',
      'Zwierzęta': '#8E44AD',
      'Plakaty dla dzieci': '#3498DB',
      'Mapy i miasta': '#34495E',
      'Moda': '#E91E63',
      'Retro': '#F39C12',
      'Kultowe zdjęcia': '#C0392B',
      'Złoto i srebro': '#D4AF37',
      'Kosmos i astronomia': '#1A1A2E',
      'Sporty': '#16A085',
      'Muzyka': '#8B0000',
      'Plakaty planery': '#7F8C8D'
    };

    return categoryColors[category] || '#2C3E50';
  }

  async createFallbackImage(title, category, outputPath) {
    // Fallback to SVG-based image if Canva fails
    const sharp = require('sharp');
    const color = this.getColorForCategory(category);

    const svgImage = `<svg width="3543" height="4724" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="3543" height="4724" fill="url(#grad)"/>
      <text x="1771" y="2362" font-size="96" text-anchor="middle" font-weight="bold" fill="white" font-family="Arial">
        ${title}
      </text>
    </svg>`;

    const buffer = await sharp(Buffer.from(svgImage))
      .png()
      .toBuffer();

    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }
}

module.exports = CanvaGenerator;
