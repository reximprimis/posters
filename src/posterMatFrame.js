const fs = require('fs').promises;
const sharp = require('sharp');

const DEFAULT_MARGIN_RATIO = 0.116;
const DEFAULT_BOTTOM_WEIGHT = 1.82;
const DEFAULT_MAT_HEX = '#ffffff';

function parseEnvFloat(name, min, max, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback;
  const n = parseFloat(String(raw).trim());
  if (Number.isNaN(n) || n < min || n > max) return fallback;
  return n;
}

function resolveMatColor(opts) {
  if (opts.matColor != null && String(opts.matColor).trim() !== '') {
    return String(opts.matColor).trim();
  }
  const env = process.env.POSTER_MAT_COLOR && String(process.env.POSTER_MAT_COLOR).trim();
  return env || DEFAULT_MAT_HEX;
}

function resolveMarginRatio(opts) {
  if (typeof opts.marginRatio === 'number' && opts.marginRatio > 0 && opts.marginRatio < 0.25) {
    return opts.marginRatio;
  }
  return parseEnvFloat('POSTER_MAT_MARGIN_RATIO', 0.02, 0.22, DEFAULT_MARGIN_RATIO);
}

/**
 * Passe-partout o równej grubości w pikselach ze wszystkich stron: M = round(min(W,H) × marginRatio).
 * (Poprzednia wersja skalowała innerW i innerH osobno — przy pionowym pliku góra/dół były wizualnie grubsze niż boki.)
 * Otwór ma inny aspect niż canvas; grafika: fit cover + centrum.
 * @param {Buffer} input
 * @param {{ marginRatio?: number, matColor?: string }} opts
 */
async function composeUniformMat(input, opts) {
  const marginRatio = resolveMarginRatio(opts);
  const matColor = resolveMatColor(opts);
  const meta = await sharp(input).metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H) {
    throw new Error('Nie można odczytać wymiarów obrazu pod ramkę');
  }

  const M = Math.max(4, Math.round(Math.min(W, H) * marginRatio));
  const innerW = W - 2 * M;
  const innerH = H - 2 * M;
  if (innerW < 2 || innerH < 2) {
    throw new Error('Za mały obraz na passe-partout — zmniejsz margines lub rozmiar DALL-E');
  }

  const resized = await sharp(input)
    .resize(innerW, innerH, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  return sharp({
    create: { width: W, height: H, channels: 3, background: matColor },
  })
    .composite([{ input: resized, left: M, top: M }])
    .png()
    .toBuffer();
}

/**
 * Passe-partout galeria: ten sam M od góry i boków, szerszy dół.
 */
async function composeGalleryMat(input, opts) {
  const marginRatio = resolveMarginRatio(opts);
  let bottomWeight =
    typeof opts.bottomWeight === 'number' && opts.bottomWeight > 1 && opts.bottomWeight < 3
      ? opts.bottomWeight
      : parseEnvFloat('POSTER_MAT_BOTTOM_WEIGHT', 1.15, 2.5, DEFAULT_BOTTOM_WEIGHT);
  const matColor = resolveMatColor(opts);

  const meta = await sharp(input).metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H) {
    throw new Error('Nie można odczytać wymiarów obrazu pod ramkę');
  }

  const M = Math.max(4, Math.round(Math.min(W, H) * marginRatio));
  const B = Math.max(M + 4, Math.round(M * bottomWeight));
  const innerW = W - 2 * M;
  const innerH = H - M - B;
  if (innerW < 2 || innerH < 2) {
    throw new Error('Za mały obraz na passe-partout — zmniejsz margines lub rozmiar DALL-E');
  }

  const resized = await sharp(input)
    .resize(innerW, innerH, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  return sharp({
    create: { width: W, height: H, channels: 3, background: matColor },
  })
    .composite([{ input: resized, left: M, top: M }])
    .png()
    .toBuffer();
}

/**
 * @param {Buffer} input
 * @param {{ style?: 'uniform' | 'gallery', marginRatio?: number, bottomWeight?: number, matColor?: string }} [opts]
 * @returns {Promise<Buffer>}
 */
async function applyMatFrameFromBuffer(input, opts = {}) {
  const style = opts.style === 'gallery' ? 'gallery' : 'uniform';
  if (style === 'gallery') {
    return composeGalleryMat(input, opts);
  }
  return composeUniformMat(input, opts);
}

async function applyMatFrameToPngFile(filePath, opts = {}) {
  const input = await fs.readFile(filePath);
  const out = await applyMatFrameFromBuffer(input, opts);
  await fs.writeFile(filePath, out);
}

module.exports = {
  applyMatFrameFromBuffer,
  applyMatFrameToPngFile,
  DEFAULT_MARGIN_RATIO,
  DEFAULT_BOTTOM_WEIGHT,
  DEFAULT_MAT_HEX,
};
