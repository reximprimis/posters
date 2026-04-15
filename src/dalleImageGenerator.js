const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');
const sharp = require('sharp');
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

  /**
   * DALL-E 3 zwraca tylko kilka natywnych rozdzielczości.
   * Po pobraniu normalizujemy finalny PNG do docelowej proporcji druku.
   */
  async normalizeOutputSize(outputPath) {
    const targetW = parseInt(process.env.DALLE_TARGET_WIDTH || '2000', 10);
    const targetH = parseInt(process.env.DALLE_TARGET_HEIGHT || '2857', 10);
    if (!Number.isFinite(targetW) || !Number.isFinite(targetH) || targetW < 256 || targetH < 256) {
      return;
    }
    const src = await fs.promises.readFile(outputPath);
    const normalized = await sharp(src)
      // Remove generated black/white letterbox bars if model adds them.
      .trim({ threshold: 12 })
      // Full-bleed output without synthetic/blurred edge extensions.
      .resize(targetW, targetH, {
        fit: 'cover',
        position: 'centre',
      })
      .png()
      .toBuffer();
    await fs.promises.writeFile(outputPath, normalized);
  }

  buildImagePrompt(title, category, style) {
    // Fallback prompt only when higher-level generator did not provide a custom prompt.
    return `Literal subject from the title: "${title}". Category: ${category}. Style: ${style}. Premium print-ready composition with one clear focal subject.`;
  }

  resolveDalleStyle(style) {
    const envStyle = String(process.env.DALLE_IMAGE_STYLE || '').trim().toLowerCase();
    if (envStyle === 'natural' || envStyle === 'vivid') {
      return envStyle;
    }

    const s = String(style || '').trim().toLowerCase();
    if (s === 'photography' || s === 'minimalism') {
      return 'natural';
    }
    return 'vivid';
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
      const looksLikeFullPrompt = /^Premium fine-art artwork for print\./i.test(basePrompt);
      const prompt = looksLikeFullPrompt ? basePrompt : buildFullDallePrompt(basePrompt, category, style);
      console.log(`    → Prompt: ${prompt.substring(0, 80)}...`);

      const dalleStyle = this.resolveDalleStyle(style);

      const sizeRaw = String(process.env.DALLE_IMAGE_SIZE || '1024x1792').trim().toLowerCase();
      const sizeAliases = {
        vertical: '1024x1792',
        portrait: '1024x1792',
        horizontal: '1792x1024',
        landscape: '1792x1024',
        '1024x1536': '1024x1792',
      };
      const sizeNormalized = sizeAliases[sizeRaw] || sizeRaw;
      const allowedSizes = new Set(['1024x1024', '1024x1792', '1792x1024']);
      const dalleSize = allowedSizes.has(sizeNormalized) ? sizeNormalized : '1024x1792';

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
      await this.normalizeOutputSize(outputPath);
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
