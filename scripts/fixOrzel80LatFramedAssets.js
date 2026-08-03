/**
 * Jednorazowa naprawa Orzel_80_Lat — ramka i PDF-y z wersją ramki bez przycinania złotego obrysu.
 * Przyczyna: composeUniformMat + rasterWithFrameForPdfPage używały fit:cover i kadrowały krawędź.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

const projectRoot = path.join(__dirname, '..');
const dir = path.join(projectRoot, 'posters', 'Sport i hobby', 'Photography');
const masterAbs = path.join(dir, 'Orzel_80_Lat.png');
const ramkaAbs = path.join(dir, 'Orzel_80_Lat_ramka.png');
const title = 'Orzel 80 Lat';
const marginRatio = 0.05;

async function composeUniformMatInside(input, opts = {}) {
  const marginRatioLocal =
    typeof opts.marginRatio === 'number' && opts.marginRatio > 0 && opts.marginRatio < 0.25
      ? opts.marginRatio
      : marginRatio;
  const matColor = opts.matColor || '#ffffff';
  const meta = await sharp(input).metadata();
  const W = meta.width;
  const H = meta.height;
  const M = Math.max(4, Math.round(Math.min(W, H) * marginRatioLocal));
  const innerW = W - 2 * M;
  const innerH = H - 2 * M;

  const resized = await sharp(input)
    .resize(innerW, innerH, { fit: 'inside', position: 'centre' })
    .png()
    .toBuffer();
  const innerMeta = await sharp(resized).metadata();
  const left = M + Math.max(0, Math.floor((innerW - innerMeta.width) / 2));
  const top = M + Math.max(0, Math.floor((innerH - innerMeta.height) / 2));

  return sharp({
    create: { width: W, height: H, channels: 3, background: matColor },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function rasterContainForPdfPage(imagePath, tw, th) {
  const resized = await sharp(imagePath)
    .resize(tw, th, { fit: 'inside', position: 'centre' })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const left = Math.max(0, Math.floor((tw - meta.width) / 2));
  const top = Math.max(0, Math.floor((th - meta.height) / 2));
  return sharp({
    create: { width: tw, height: th, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([{ input: resized, left, top }])
    .jpeg({
      quality: 96,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();
}

async function createFramedPdfContain(imagePath, sizeKey, titleLabel, outputPath) {
  const PDFDocument = require('pdfkit');
  const sizeConfig = config.posterSizes[sizeKey];
  const [widthCm, heightCm] = sizeConfig.cm;
  const [tw, th] = sizeConfig.px;
  const widthPt = widthCm * 28.35;
  const heightPt = heightCm * 28.35;
  const imageBuffer = await rasterContainForPdfPage(imagePath, tw, th);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [widthPt, heightPt],
      margin: 0,
      title: titleLabel,
      author: 'reximprimis.com',
      creator: 'Poster Generator',
    });
    const writeStream = fs.createWriteStream(outputPath);
    doc.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    doc.pipe(writeStream);
    doc.rect(0, 0, widthPt, heightPt).fill('#ffffff');
    doc.image(imageBuffer, 0, 0, { width: widthPt, height: heightPt });
    doc.end();
  });
}

async function main() {
  if (!fs.existsSync(masterAbs)) {
    throw new Error(`Brak mastera: ${masterAbs}`);
  }

  console.log('→ Naprawiam Orzel_80_Lat_ramka.png (inside, bez crop)...');
  const ramkaBuf = await composeUniformMatInside(await fs.promises.readFile(masterAbs));
  await fs.promises.writeFile(ramkaAbs, ramkaBuf);

  console.log('→ Miniatury...');
  for (const abs of [masterAbs, ramkaAbs]) {
    const parsed = path.parse(abs);
    const thumbAbs = path.join(parsed.dir, `${parsed.name}_thumb.jpg`);
    await sharp(abs)
      .rotate()
      .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(thumbAbs);
    console.log(`  ✓ ${path.basename(thumbAbs)}`);
  }

  console.log('→ PDF-y ramka (contain, bez drugiej ramki)...');
  for (const sizeKey of Object.keys(config.posterSizes)) {
    const out = path.join(dir, `Orzel_80_Lat_ramka_${sizeKey}.pdf`);
    await createFramedPdfContain(ramkaAbs, sizeKey, title, out);
    console.log(`  ✓ ${path.basename(out)}`);
  }

  const shopThumbDir = path.join(projectRoot, 'shopify_thumbs', 'Sport i hobby', 'Photography');
  if (fs.existsSync(shopThumbDir)) {
    for (const name of ['Orzel_80_Lat_ramka_thumb.jpg', 'Orzel_80_Lat_thumb.jpg']) {
      const src = path.join(dir, name);
      const dest = path.join(shopThumbDir, name);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ shopify_thumbs/${name}`);
      }
    }
  }

  console.log('\n✓ Gotowe — Orzel_80_Lat ramka + PDF-y bez przyciętego obrysu.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
