/**
 * Resize poster PNGs to print canvas without cropping the artwork (fit inside + pad).
 */

'use strict';

const sharp = require('sharp');

function envFlag(name, defaultOn = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultOn;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** Median RGB from four corner patches (~8% each). */
async function sampleCornerBackground(input, meta) {
  const W = meta.width || 1;
  const H = meta.height || 1;
  const pw = Math.max(4, Math.round(W * 0.08));
  const ph = Math.max(4, Math.round(H * 0.08));
  const patches = [
    { left: 0, top: 0, width: pw, height: ph },
    { left: W - pw, top: 0, width: pw, height: ph },
    { left: 0, top: H - ph, width: pw, height: ph },
    { left: W - pw, top: H - ph, width: pw, height: ph },
  ];
  const rs = [];
  const gs = [];
  const bs = [];
  for (const region of patches) {
    const { data, info } = await sharp(input)
      .extract(region)
      .resize(24, 24, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = info.channels || 3;
    for (let i = 0; i < data.length; i += ch) {
      rs.push(data[i]);
      gs.push(data[i + 1]);
      bs.push(data[i + 2]);
    }
  }
  const median = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 255;
  };
  return {
    r: median(rs),
    g: median(gs),
    b: median(bs),
    alpha: 255,
  };
}

/**
 * Fit image inside targetWxH, pad with sampled background — never crops subject.
 * @param {string|Buffer} input
 * @param {number} targetW
 * @param {number} targetH
 * @returns {Promise<Buffer>} PNG buffer
 */
async function resizeToPrintCanvas(input, targetW, targetH) {
  const useTrim = envFlag('IMAGE_RESIZE_TRIM', false);
  let base = sharp(input).rotate();
  if (useTrim) base = base.trim({ threshold: 12 });

  // Clone before metadata so the resize pipeline is not consumed.
  const meta = await base.clone().metadata();
  const bg = await sampleCornerBackground(input, {
    width: meta.width || 1,
    height: meta.height || 1,
  });

  const fitted = await base
    .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });

  const w = fitted.info.width;
  const h = fitted.info.height;
  if (w === targetW && h === targetH) return fitted.data;

  const padLeft = Math.floor((targetW - w) / 2);
  const padTop = Math.floor((targetH - h) / 2);
  const padRight = targetW - w - padLeft;
  const padBottom = targetH - h - padTop;

  // fitted.data is an encoded PNG — decode it; do NOT pass { raw: ... } (that caused
  // "VipsImage: memory area too small" when PNG byte length ≠ w*h*channels).
  return sharp(fitted.data)
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: bg,
    })
    .png()
    .toBuffer();
}

/**
 * Write resized PNG to disk.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {number} targetW
 * @param {number} targetH
 */
async function resizePngFileToPrintCanvas(inputPath, outputPath, targetW, targetH) {
  const buf = await resizeToPrintCanvas(inputPath, targetW, targetH);
  await sharp(buf).toFile(outputPath);
}

module.exports = {
  resizeToPrintCanvas,
  resizePngFileToPrintCanvas,
  sampleCornerBackground,
};
