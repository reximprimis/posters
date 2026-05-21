const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

/** Bazowy „pokój” przed kompozycją plakatu (gdy brak własnego szablonu). */
const SYNTHETIC_W = 2400;
const SYNTHETIC_H = 3000;

function resolveTemplateAbs() {
  const raw = (config.lifestyleMockupTemplate || '').trim();
  if (!raw) return '';
  return path.isAbsolute(raw) ? raw : path.join(__dirname, '..', raw);
}

/**
 * Ściana z gradientem, listwa, podłoga — czytelny kontekst (nie jednolity szary prostokąt).
 */
async function buildSyntheticRoomPng(W, H) {
  const hb = Math.round(H * 0.78);
  const hm = Math.round(H * 0.82);
  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ebe7e1"/>
      <stop offset="45%" stop-color="#ddd8d0"/>
      <stop offset="78%" stop-color="#cfc9bf"/>
      <stop offset="100%" stop-color="#c4beb4"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9c968c"/>
      <stop offset="100%" stop-color="#7a756c"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#wall)"/>
  <rect y="${hb}" width="100%" height="${hm - hb}" fill="#efede8"/>
  <line x1="0" y1="${hb}" x2="${W}" y2="${hb}" stroke="#d8d4cc" stroke-width="2"/>
  <rect y="${hm}" width="100%" height="${H - hm}" fill="url(#floor)"/>
  <rect y="${hm}" width="100%" height="4" fill="#5c5852" opacity="0.35"/>
</svg>`.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Kompozycja: szablon lub syntetyczny pokój + cień + plakat.
 * Na końcu — dopasowanie do proporcji 7:10 (jak plakat 21×30), żeby PDF druku nie „rozjeżdżał” mockupu.
 *
 * @param {Buffer} posterBuf
 * @returns {Promise<Buffer>} PNG
 */
async function compositeLifestyleMockupFromBuffer(posterBuf) {
  const inset = config.lifestyleInset;
  const templateAbs = resolveTemplateAbs();
  let baseInput;
  let meta;

  if (templateAbs && fs.existsSync(templateAbs)) {
    baseInput = fs.readFileSync(templateAbs);
    meta = await sharp(baseInput).metadata();
  } else {
    baseInput = await buildSyntheticRoomPng(SYNTHETIC_W, SYNTHETIC_H);
    meta = { width: SYNTHETIC_W, height: SYNTHETIC_H };
  }

  const W = meta.width || SYNTHETIC_W;
  const H = meta.height || SYNTHETIC_H;
  const slotL = Math.max(0, Math.round(W * inset.left));
  const slotT = Math.max(0, Math.round(H * inset.top));
  const slotW = Math.max(2, Math.round(W * inset.width));
  const slotH = Math.max(2, Math.round(H * inset.height));

  const posterLayer = await sharp(posterBuf)
    .resize(slotW, slotH, {
      fit: 'contain',
      position: 'centre',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  const pm = await sharp(posterLayer).metadata();
  const pw = pm.width || slotW;
  const ph = pm.height || slotH;
  const px = slotL + Math.max(0, Math.floor((slotW - pw) / 2));
  const py = slotT + Math.max(0, Math.floor((slotH - ph) / 2));

  const pad = 48;
  const sw = pw + pad * 2;
  const sh = ph + pad * 2;
  const shadowSvg = `
<svg width="${sw}" height="${sh}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="18"/>
    </filter>
  </defs>
  <rect x="${pad}" y="${pad + 10}" width="${pw}" height="${ph}" fill="rgba(0,0,0,0.28)" filter="url(#blur)"/>
</svg>`.trim();
  const shadowBuf = await sharp(Buffer.from(shadowSvg)).png().toBuffer();

  let composed = await sharp(baseInput)
    .composite([
      { input: shadowBuf, left: px - pad, top: py - pad },
      { input: posterLayer, left: px, top: py },
    ])
    .png()
    .toBuffer();

  if (config.lifestyleNormalizeToPosterAspect && config.posterSizes && config.posterSizes['21x30']) {
    const [tw, th] = config.posterSizes['21x30'].px;
    composed = await sharp(composed)
      .resize(tw, th, {
        fit: 'contain',
        position: 'centre',
        background: { r: 235, g: 231, b: 225, alpha: 1 },
      })
      .png()
      .toBuffer();
  }

  return composed;
}

module.exports = {
  compositeLifestyleMockupFromBuffer,
  resolveTemplateAbs,
};
