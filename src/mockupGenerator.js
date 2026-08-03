/**
 * Mockup Generator — generates two product mockup images per poster:
 *   1. mockup_frame.jpg   — packshot in black gallery frame, clean bg, 800×1200
 *   2. mockup_interior.jpg — same frame on wall in Scandinavian interior, 800×1200
 *
 * Uses GPT Image 2 image-editing API with the master PNG as reference.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');
const sharp = require('sharp');
const { buildInteriorMockupPrompt, resolveMockupInteriorScene } = require('./mockupInteriorScenes');

const MOCKUP_W = 800;
const MOCKUP_H = 1200;
const MOCKUP_API_SIZE = '1024x1536'; // closest 2:3 supported by gpt-image-2

const PROMPTS = {
  frame: `Use the uploaded image as the exact poster artwork. Do not alter, redraw, recolor, rotate, stretch, crop, or distort it in any way. Reproduce the artwork pixel-accurately inside the frame.

Create a premium front-facing product packshot of this artwork:
- Black gallery frame: thin, matte black, modern, straight edges, fully visible, sharp corners. The frame surrounds the artwork on all four sides evenly.
- The artwork fills the entire inner area of the frame edge-to-edge — NO mat, NO passe-partout, NO white border between artwork and frame.
- The artwork must be in portrait orientation (taller than wide) inside the frame.
- Background: pure white or very light neutral gray. No gradient, no pattern.
- Shadow: a single soft, subtle drop shadow underneath and slightly to the right of the frame — like a real hanging frame.
- The frame must be fully centered in the composition with equal space on all sides.
- No text, no logo, no watermark, no furniture, no lifestyle elements.
- Photorealistic result suitable for a Shopify product image gallery.`,

  interior: `Use the uploaded image as the exact poster artwork. Do not alter, redraw, recolor, rotate, stretch, or distort it in any way. Reproduce the artwork pixel-accurately inside the frame.

Create a premium lifestyle mockup: this poster artwork in a black gallery frame hanging on a wall in a modern living room.
- Black gallery frame: same thin matte black profile as a standard gallery frame. The artwork fills the inner area edge-to-edge, no mat border.
- The framed poster hangs on a clean, smooth neutral wall (warm light gray or warm white). It is centered and straight.
- The frame is in portrait orientation (taller than wide) and realistically sized — medium to large scale, clearly visible.
- Room: Scandinavian or modern minimalist interior — light oak sideboard or console, soft linen sofa, simple ceramic decor, natural daylight from a side window. Calm, warm, premium atmosphere.
- The framed poster is the clear focal point of the scene.
- No text, no logo, no watermark, no other artwork or photos on the walls.
- Photorealistic result suitable for a Shopify product image gallery.`,
};

/** @deprecated Use buildInteriorMockupPrompt(category, title) — kept as salon fallback. */
const DEFAULT_INTERIOR_PROMPT = PROMPTS.interior;

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} downloading mockup`));
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

class MockupGenerator {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Generate both mockups for a poster.
   * @param {string} masterPngPath  Absolute path to master PNG
   * @param {string} outputDir      Directory to save mockup_frame.jpg / mockup_interior.jpg
   * @returns {{ frame: string, interior: string }}  Absolute paths of saved files
   */
  /**
   * @param {string} masterPngPath  Absolute path to master PNG
   * @param {string} outputDir      Directory to save mockups
   * @param {string} titleSlug      Poster title slug, e.g. "Waves_Crashing_on_Dunes"
   * @param {{ category?: string, title?: string }} [options]
   */
  async generate(masterPngPath, outputDir, titleSlug, options = {}) {
    if (!fs.existsSync(masterPngPath)) {
      throw new Error(`Master PNG not found: ${masterPngPath}`);
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const prefix = titleSlug ? `${titleSlug}_` : '';

    console.log(`  [mockup] Generating frame packshot…`);
    const framePath = await this._generateOne(masterPngPath, PROMPTS.frame, path.join(outputDir, `${prefix}mockup_frame.jpg`));
    console.log(`  [mockup] OK → ${framePath}`);

    console.log(`  [mockup] Generating interior lifestyle…`);
    const category = options.category != null ? String(options.category).trim() : '';
    const title = options.title != null ? String(options.title).trim() : '';
    const interiorPrompt = category
      ? buildInteriorMockupPrompt(category, title)
      : DEFAULT_INTERIOR_PROMPT;
    if (category) {
      const scene = resolveMockupInteriorScene(category, title);
      console.log(`  [mockup] Interior scene: ${scene.roomLabel} (${scene.roomKey})`);
    }
    const interiorPath = await this._generateOne(
      masterPngPath,
      interiorPrompt,
      path.join(outputDir, `${prefix}mockup_interior.jpg`)
    );
    console.log(`  [mockup] OK → ${interiorPath}`);

    return { frame: framePath, interior: interiorPath };
  }

  async _generateOne(masterPngPath, prompt, outputPath) {
    // Resize master to max 1024×1536 before sending — API limit is 50 MB
    // High-res masters can exceed that limit as raw pixel data
    const imgBuffer = await sharp(masterPngPath)
      .resize(1024, 1536, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 7 })
      .toBuffer();

    // Build a form-data-compatible File object for the SDK
    let imageInput;
    try {
      const { toFile } = require('openai');
      imageInput = await toFile(imgBuffer, 'poster.png', { type: 'image/png' });
    } catch (_) {
      // Fallback: readable stream (older SDK versions)
      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(imgBuffer);
      stream.push(null);
      stream.path = 'poster.png';
      imageInput = stream;
    }

    const response = await this.client.images.edit({
      model: 'gpt-image-2',
      image: imageInput,
      prompt,
      size: MOCKUP_API_SIZE,
      n: 1,
    });

    if (!response.data || !response.data[0]) {
      throw new Error('No image returned by API');
    }

    const img = response.data[0];
    let rawBuffer;

    if (img.b64_json) {
      rawBuffer = Buffer.from(img.b64_json, 'base64');
    } else if (img.url) {
      rawBuffer = await downloadBuffer(img.url);
    } else {
      throw new Error('API returned neither b64_json nor url');
    }

    // Resize to exactly 800×1200, save as JPEG q92
    await sharp(rawBuffer)
      .resize(MOCKUP_W, MOCKUP_H, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 92, mozjpeg: false })
      .toFile(outputPath);

    return outputPath;
  }
}

module.exports = MockupGenerator;
