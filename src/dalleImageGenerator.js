const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');
const { buildFullDallePrompt, DALLE3_PROMPT_MAX, MAX_DALLE_OVERHEAD_CHARS } = require('./posterPromptLayers');
const { applyMatFrameToPngFile } = require('./posterMatFrame');

class DalleImageGenerator {
  /** Max długość „środkowej” części (przed sanityzacją) — budżet pod prefix+suffix serwera. */
  static get USER_PROMPT_MAX() {
    return DALLE3_PROMPT_MAX - MAX_DALLE_OVERHEAD_CHARS;
  }

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  buildImagePrompt(title, category, style) {
    // Photorealistic prompts optimized for professional wall art prints
    const photoPrompts = {
      'Botanika': `Ultra-detailed professional garden photography for wall art titled "${title}".
      Scene: A lush, vibrant botanical garden in golden hour lighting with soft warm sunlight.
      Features: Diverse blooming flowers (roses, peonies, lavender, sunflowers, daisies), green foliage, garden paths, natural lighting.
      Style: Magazine-quality nature photography, sharp focus, rich colors, professional composition.
      Lighting: Natural golden hour glow creating warm tones and soft shadows.
      Quality: Museum-quality photo print, 4K resolution, perfect for high-end wall decor.
      No text, no watermarks, no artificial elements.`,

      'Paisaje': `Stunning landscape photography for wall art titled "${title}".
      Scene: Majestic natural landscape with mountains, valleys, or scenic views in perfect lighting.
      Style: National Geographic quality photography with dramatic composition.
      Lighting: Golden hour or dramatic sky lighting creating depth and atmosphere.
      Quality: Professional print-ready landscape photography, sharp details, vibrant colors.`,

      'Cocina': `Professional food photography for wall art titled "${title}".
      Scene: Beautifully styled culinary dishes with fresh ingredients in natural lighting.
      Style: High-end magazine food photography with professional plating.
      Lighting: Soft natural light with warm, appetizing tones.
      Quality: Professional culinary photography suitable for kitchen decor.`,

      'Verano': `Vibrant summer photography for wall art titled "${title}".
      Scene: Beach, tropical, or warm sunny landscape with bright colors and vacation vibes.
      Style: Travel magazine quality photography with warm sunny tones.
      Lighting: Bright natural sunlight creating energetic, warm atmosphere.
      Quality: Professional vacation-inspired wall art photography.`
    };

    return photoPrompts[category] || `Professional wall art poster for "${title}".
    High-quality photorealistic image perfect for home decoration and printing.
    Gallery-quality photography with professional composition and vibrant colors.`;
  }

  async generateImage(title, category, style, outputPath, options = {}) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      console.log(`    → Generating image with DALL-E 3...`);
      const custom = options.customPrompt != null ? String(options.customPrompt).trim() : '';
      const basePrompt = (custom || this.buildImagePrompt(title, category, style)).trim();
      const prompt = buildFullDallePrompt(basePrompt, category, style);
      console.log(`    → Prompt: ${prompt.substring(0, 80)}...`);

      // vivid: często mniej „foto-mockupów wnętrza”; natural zostaw przez DALLE_IMAGE_STYLE=natural
      const dalleStyle =
        String(process.env.DALLE_IMAGE_STYLE || 'vivid').trim().toLowerCase() === 'natural' ? 'natural' : 'vivid';

      const sizeRaw = String(process.env.DALLE_IMAGE_SIZE || '1024x1792').trim().toLowerCase();
      const allowedSizes = new Set(['1024x1024', '1024x1792', '1792x1024']);
      const dalleSize = allowedSizes.has(sizeRaw) ? sizeRaw : '1024x1792';

      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: dalleSize,
        quality: 'hd',
        style: dalleStyle,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No image generated from DALL-E');
      }

      const imageUrl = response.data[0].url;
      console.log(`    → Downloaded from DALL-E`);

      // Download image from URL
      await this.downloadImage(imageUrl, outputPath);
      const matStyle = options.matStyle;
      if (matStyle === 'uniform' || matStyle === 'gallery') {
        console.log(`    → Passe-partout (${matStyle})…`);
        await applyMatFrameToPngFile(outputPath, { style: matStyle });
      }
      return outputPath;
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
      throw error;
    }
  }

  downloadImage(imageUrl, outputPath) {
    return new Promise((resolve, reject) => {
      https.get(imageUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          return this.downloadImage(redirectUrl, outputPath)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`    ✓ Image generated`);
          resolve(outputPath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(outputPath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = DalleImageGenerator;
