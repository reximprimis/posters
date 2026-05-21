const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');
const sharp = require('sharp');
const { buildFullDallePrompt, DALLE3_PROMPT_MAX, MAX_DALLE_OVERHEAD_CHARS } = require('./posterPromptLayers');
const { resolveSafePrintFramingForCategory, getSafeFramingMeta } = require('./safePrintFraming');
const { resolveConcreteSubject, logStyleSubjectResolution } = require('./titleSubjectConsistency');
const { applyMatFrameToPngFile } = require('./posterMatFrame');

const GPT_IMAGE_PROMPT_MAX = 32000;
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 520, 522, 524]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getImageRetryConfig() {
  const maxAttempts = parseInt(process.env.IMAGE_GENERATION_MAX_ATTEMPTS || '4', 10);
  const baseDelayMs = parseInt(process.env.IMAGE_GENERATION_RETRY_DELAY_MS || '4000', 10);
  return {
    maxAttempts: Number.isFinite(maxAttempts) && maxAttempts >= 1 ? maxAttempts : 4,
    baseDelayMs: Number.isFinite(baseDelayMs) && baseDelayMs >= 0 ? baseDelayMs : 4000,
  };
}

function extractHttpStatus(error) {
  if (error == null) return null;
  const direct = error.status ?? error.statusCode;
  if (direct != null) return Number(direct);
  const fromResponse = error.response?.status;
  if (fromResponse != null) return Number(fromResponse);
  const match = String(error.message || '').match(/\b(408|409|429|500|502|503|504|520|522|524)\b/);
  return match ? Number(match[1]) : null;
}

function isRetryableImageError(error) {
  const status = extractHttpStatus(error);
  if (status != null && RETRYABLE_STATUS.has(status)) return true;
  const msg = String(error?.message || error?.code || '').toLowerCase();
  return /timeout|timed out|econnreset|etimedout|socket hang up|network|rate limit|overloaded|temporarily unavailable|520|502|503|504/.test(msg);
}

function getImageModel() {
  return String(process.env.IMAGE_GENERATION_MODEL || process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim() || DEFAULT_IMAGE_MODEL;
}

function isGptImageModel(model) {
  return /^gpt-image-/i.test(model) || /^chatgpt-image-/i.test(model);
}

function isGptImage2Model(model) {
  return /^gpt-image-2/i.test(model) || /^chatgpt-image-2/i.test(model);
}

function isValidGptImage2Size(size) {
  const m = String(size).match(/^(\d+)x(\d+)$/);
  if (!m) return false;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (w % 16 !== 0 || h % 16 !== 0) return false;
  const pixels = w * h;
  if (pixels < 655360 || pixels > 8294400) return false;
  const ratio = w / h;
  return ratio >= 1 / 3 && ratio <= 3;
}

class DalleImageGenerator {
  // Max length for the user prompt before the server adds the fixed print rules.
  static get USER_PROMPT_MAX() {
    const model = getImageModel();
    const promptMax = isGptImageModel(model) ? GPT_IMAGE_PROMPT_MAX : DALLE3_PROMPT_MAX;
    return promptMax - MAX_DALLE_OVERHEAD_CHARS;
  }

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async normalizeOutputSize(outputPath) {
    const targetW = parseInt(process.env.IMAGE_TARGET_WIDTH || process.env.DALLE_TARGET_WIDTH || '2000', 10);
    const targetH = parseInt(process.env.IMAGE_TARGET_HEIGHT || process.env.DALLE_TARGET_HEIGHT || '2857', 10);
    if (!Number.isFinite(targetW) || !Number.isFinite(targetH) || targetW < 256 || targetH < 256) {
      return;
    }
    const src = await fs.promises.readFile(outputPath);
    const normalized = await sharp(src)
      .trim({ threshold: 12 })
      .resize(targetW, targetH, {
        fit: 'cover',
        position: 'centre',
      })
      .png()
      .toBuffer();
    await fs.promises.writeFile(outputPath, normalized);
  }

  buildImagePrompt(title, category, style) {
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

  resolveImageSize(model) {
    const sizeRaw = String(process.env.IMAGE_GENERATION_SIZE || process.env.DALLE_IMAGE_SIZE || '1024x1536').trim().toLowerCase();
    const gptAliases = {
      vertical: '1024x1536',
      portrait: '1024x1536',
      horizontal: '1536x1024',
      landscape: '1536x1024',
      '1024x1792': '1024x1536',
      '1792x1024': '1536x1024',
    };
    const dalleAliases = {
      vertical: '1024x1792',
      portrait: '1024x1792',
      horizontal: '1792x1024',
      landscape: '1792x1024',
      '1024x1536': '1024x1792',
      '1536x1024': '1792x1024',
    };

    if (isGptImageModel(model)) {
      const sizeNormalized = gptAliases[sizeRaw] || sizeRaw;
      if (isGptImage2Model(model)) {
        if (sizeNormalized === 'auto') return 'auto';
        if (isValidGptImage2Size(sizeNormalized)) return sizeNormalized;
      }
      const allowedSizes = new Set(['auto', '1024x1024', '1024x1536', '1536x1024']);
      return allowedSizes.has(sizeNormalized) ? sizeNormalized : '1024x1536';
    }

    const sizeNormalized = dalleAliases[sizeRaw] || sizeRaw;
    const allowedSizes = new Set(['1024x1024', '1024x1792', '1792x1024']);
    return allowedSizes.has(sizeNormalized) ? sizeNormalized : '1024x1792';
  }

  async saveGeneratedImage(image, outputPath, model) {
    if (image && image.b64_json) {
      await fs.promises.writeFile(outputPath, Buffer.from(image.b64_json, 'base64'));
      console.log(`    -> Saved image from ${model}`);
      return;
    }
    if (image && image.url) {
      await this.downloadImage(image.url, outputPath);
      return;
    }
    throw new Error(`No image data returned from ${model}`);
  }

  buildGenerationRequest(model, prompt, style) {
    const request = {
      model,
      prompt,
      n: 1,
      size: this.resolveImageSize(model),
    };

    if (isGptImageModel(model)) {
      request.quality = String(process.env.IMAGE_GENERATION_QUALITY || 'high').trim().toLowerCase();
      request.output_format = String(process.env.IMAGE_GENERATION_FORMAT || 'png').trim().toLowerCase();
      let background = String(process.env.IMAGE_GENERATION_BACKGROUND || 'opaque').trim().toLowerCase();
      if (isGptImage2Model(model) && background === 'transparent') {
        console.warn('    -> gpt-image-2: transparent background not supported, using opaque');
        background = 'opaque';
      }
      request.background = background;
      request.moderation = String(process.env.IMAGE_GENERATION_MODERATION || 'auto').trim().toLowerCase();
    } else {
      request.quality = 'hd';
      request.style = this.resolveDalleStyle(style);
    }

    return request;
  }

  async generateImage(title, category, style, outputPath, options = {}) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      const model = getImageModel();
      const categoryKey = options.category != null ? String(options.category).trim() : String(category || '').trim();
      const styleKey = options.style != null ? String(options.style).trim() : String(style || '').trim();
      console.log(`    -> Generating image with ${model}...`);
      const subjectResolved = resolveConcreteSubject(title, categoryKey, styleKey);
      logStyleSubjectResolution(subjectResolved, styleKey, categoryKey);
      const framingMeta = getSafeFramingMeta(categoryKey, styleKey);
      if (framingMeta.enabled) {
        console.log(`    -> Safe framing: ${framingMeta.logLabel}`);
        console.log(
          `    -> Subject scale target: ${Math.round(framingMeta.subjectScaleMin * 100)}–${Math.round(framingMeta.subjectScaleMax * 100)}%`
        );
      }
      const custom = options.customPrompt != null ? String(options.customPrompt).trim() : '';
      const basePrompt = (custom || this.buildImagePrompt(title, category, style)).trim();
      const looksLikeFullPrompt = /^Premium fine-art artwork for print\./i.test(basePrompt);
      let prompt = looksLikeFullPrompt ? basePrompt : buildFullDallePrompt(basePrompt, category, style);
      const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey);
      if (safeBlock && !/SAFE PRINT FRAMING/i.test(prompt)) {
        prompt = `${prompt.trim()} ${safeBlock}`.replace(/\s{2,}/g, ' ').trim();
      }
      console.log(`    -> Prompt: ${prompt.substring(0, 80)}...`);

      const request = this.buildGenerationRequest(model, prompt, style);
      const { maxAttempts, baseDelayMs } = getImageRetryConfig();
      let response;
      let lastError;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) {
            const waitMs = baseDelayMs * Math.pow(2, attempt - 2);
            console.log(
              `    -> Retry ${attempt}/${maxAttempts} in ${Math.round(waitMs / 1000)}s (${lastError?.message || 'transient error'})...`
            );
            await sleep(waitMs);
          }
          response = await this.client.images.generate(request);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (attempt >= maxAttempts || !isRetryableImageError(error)) {
            throw error;
          }
        }
      }

      if (!response.data || response.data.length === 0) {
        throw new Error(`No image generated from ${model}`);
      }

      await this.saveGeneratedImage(response.data[0], outputPath, model);
      await this.normalizeOutputSize(outputPath);
      const matStyle = options.matStyle;
      if (matStyle === 'uniform' || matStyle === 'gallery') {
        console.log(`    -> Passe-partout (${matStyle})...`);
        await applyMatFrameToPngFile(outputPath, { style: matStyle });
      }
      return {
        outputPath,
        finalPromptSentToModel: prompt,
        model,
      };
    } catch (error) {
      console.error(`    x Failed: ${error.message}`);
      throw error;
    }
  }

  downloadImage(imageUrl, outputPath) {
    return new Promise((resolve, reject) => {
      https.get(imageUrl, (response) => {
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
          console.log('    OK Image generated');
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
