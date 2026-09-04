/**
 * Master (packshot na czystym tle) dla ZESTAWU PLAKATOW I RAMEK — przez
 * GPT Image 2, nie przez sklejany lokalnie cien.
 *
 * Powod istnienia: sklad ramek (real frame photos, patrz src/frameMockups.js)
 * byl dobry, ale cien pod kazda ramka byl rysowany recznie w
 * src/galleryFramedVisuals.js (rozmyty prostokat w SVG) i wygladal plasko —
 * "cienie sa problemem, zrob realistycznie jakby fotograf to zrobil".
 * Ten sam model, ktory juz poprawil salon (src/galleryFramedInteriorAI.js),
 * dostaje jako referencje TA SAMA siatke (bez cienia, na przezroczystym tle)
 * i ma ja sfotografowac na czystym studyjnym tle z naturalnym, miekkim
 * cieniem kontaktowym — nie wymyslic ramki/artworku od nowa.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');
const sharp = require('sharp');

const API_SIZE = '1024x1536';
const OUTPUT_W = 1600;
const OUTPUT_H = 2000;

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' pobierajac packshot'));
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

function budujPrompt(pieceCount, opisRamy) {
  return `Use the uploaded image as the EXACT reference. It shows ${pieceCount} framed prints already arranged together as one fixed grid, each in a ${opisRamy}. Do not change the artwork inside any frame, do not change the frame material, color, or wood/metal grain, do not change the arrangement or spacing between the frames — reproduce this exact set pixel-accurately.

Photograph this exact framed grid arrangement as a premium product packshot:
- Background: pure white or very light neutral studio background, no gradient, no pattern, no room, no furniture.
- Camera straight-on, eye level, correct perspective — not tilted, not angled, not distorted.
- Real photograph look: soft, natural, physically correct contact shadow beneath each frame (frames sit slightly off the surface, consistent single light source from above), subtle realistic material reflections — shot with professional studio camera equipment, not illustrated, not a flat drawn shadow.
- The whole grid is centered with equal margin on all sides.
- No text, no logo, no watermark.
- Photorealistic result suitable for a Shopify product image gallery.`;
}

/**
 * @param {Buffer} referenceBuffer  Siatka bez cienia, real frame photos, transparentne tlo (PNG).
 * @param {{ pieceCount: number, opisRamy: string }} opts
 * @param {string} outputPath
 */
async function buildFramedMasterAI(referenceBuffer, opts, outputPath) {
  const { pieceCount, opisRamy } = opts;
  if (!pieceCount) throw new Error('buildFramedMasterAI: brak pieceCount');
  if (!opisRamy) throw new Error('buildFramedMasterAI: brak opisRamy');

  const prompt = budujPrompt(pieceCount, opisRamy);

  const refResized = await sharp(referenceBuffer)
    .flatten({ background: '#ffffff' })
    .resize(1024, 1536, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 7 })
    .toBuffer();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { toFile } = require('openai');
  const imageInput = await toFile(refResized, 'grid.png', { type: 'image/png' });

  const response = await client.images.edit({
    model: 'gpt-image-2',
    image: imageInput,
    prompt,
    size: API_SIZE,
    n: 1,
  });

  if (!response.data || !response.data[0]) throw new Error('buildFramedMasterAI: API nie zwrocilo obrazu');
  const img = response.data[0];
  const rawBuffer = img.b64_json ? Buffer.from(img.b64_json, 'base64') : await downloadBuffer(img.url);

  if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(rawBuffer)
    .resize(OUTPUT_W, OUTPUT_H, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 92 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = { buildFramedMasterAI };
