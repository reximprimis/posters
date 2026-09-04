/**
 * Salon (wersja lifestyle) dla ZESTAWU PLAKATOW I RAMEK — przez GPT Image 2,
 * NIE przez sklejanie sharp w statyczne zdjecie pokoju.
 *
 * Powod istnienia tego pliku: pierwsza wersja (patrz historia
 * galleryFramedVisuals.js) wklejala gotowa siatke w assets/set_rooms/*.png
 * lokalnie przez sharp — plaski wklejony prostokat na tle cudzego zdjecia
 * wygladal jak fotomontaz, nie jak zdjecie produktowe. Master (packshot na
 * czystym tle) zostaje sklejany lokalnie — TO dziala dobrze, bo tlo jest
 * neutralne i nie trzeba niczego udawac. Ale scena "wisi w prawdziwym salonie"
 * wymaga realnego oswietlenia/perspektywy/cieni, ktorych plaski sklejacz nie
 * potrafi — dlatego jedzie tym samym modelem, ktory juz generuje wiarygodne
 * mockup_interior.jpg dla pojedynczych plakatow (src/mockupGenerator.js).
 *
 * Referencja wyslana do modelu to gotowy packshot (buildFramedMaster) — model
 * ma go POWIELIC na scianie, nie wymyslic ramki od nowa, zeby faktura drewna/
 * metalu i uklad elementow zgadzaly sie z tym, co klient faktycznie dostanie.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');
const sharp = require('sharp');

const API_SIZE = '1024x1536'; // pion, najblizsze 2:3 wspierane przez gpt-image-2
const OUTPUT_W = 1000;
const OUTPUT_H = 1500;

// Angielskie slugi pomieszczen (te same, ktorych uzywamy w tagu room:) ->
// opis sceny wstrzykiwany w prompt. Brak wpisu spada na 'living-room'.
const SCENY = {
  'living-room': 'Scandinavian modern living room — light oak console, soft linen sofa edge visible, simple ceramic decor, natural daylight from a side window. Calm, warm, premium atmosphere.',
  'home-office': 'modern home office — clean desk with laptop closed, ergonomic chair, bookshelf with neutral objects, large window light. Professional, focused, minimal clutter.',
  'bedroom': 'calm contemporary bedroom — upholstered headboard, layered linen bedding, small bedside lamp, soft morning light. Restful, airy, premium hotel-like calm.',
  'hallway': 'bright entryway or hallway — narrow console table, simple mirror out of frame, light wood floor, soft ambient light. Welcoming and tidy.',
  'kitchen': 'modern European kitchen wall — matte or light wood cabinets nearby, clean backsplash, warm natural window light. Tidy, no readable packaging or labels.',
  'kids-room': 'gentle child room wall — soft neutral walls, light wood furniture nearby, warm daylight. Playful but calm, not chaotic.',
};

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' pobierajac mockup'));
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

function budujPrompt(pieceCount, opisRamy, scena) {
  return `Use the uploaded image as the EXACT reference. It shows ${pieceCount} framed prints already arranged together as one fixed grid, each in a ${opisRamy}. Do not change the artwork inside any frame, do not change the frame material, color, or wood/metal grain, do not change the arrangement or spacing between the frames — reproduce this exact set pixel-accurately.

Photograph this exact framed grid arrangement hanging on a wall in a ${scena}

Requirements:
- Camera straight-on, eye level, correct perspective for a wall-mounted piece — not tilted, not angled.
- Real photograph look: natural window light, soft realistic contact shadow under each frame, subtle realistic reflections on glass if any — shot with professional camera equipment, not illustrated or painted.
- The wall is clean, smooth, neutral (warm light gray or warm white). The frame grid is centered and straight, realistically sized relative to the room (medium scale, clearly visible but not oversized).
- No text, no logo, no watermark, no other artwork or photos on the wall.
- Photorealistic result suitable for a Shopify product image gallery.`;
}

/**
 * @param {string} masterPath  Sciezka do juz zbudowanego packshotu (buildFramedMaster) — referencja dla modelu.
 * @param {{ pieceCount: number, kolorRamy: string, opisRamy: string, roomSlug?: string }} opts
 * @param {string} outputPath
 */
async function buildFramedInteriorAI(masterPath, opts, outputPath) {
  if (!fs.existsSync(masterPath)) throw new Error('buildFramedInteriorAI: brak pliku ' + masterPath);
  const { pieceCount, opisRamy, roomSlug } = opts;
  if (!pieceCount) throw new Error('buildFramedInteriorAI: brak pieceCount');
  if (!opisRamy) throw new Error('buildFramedInteriorAI: brak opisRamy');

  const scena = SCENY[roomSlug] || SCENY['living-room'];
  const prompt = budujPrompt(pieceCount, opisRamy, scena);

  const refBuffer = await sharp(masterPath)
    .resize(1024, 1536, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 7 })
    .toBuffer();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { toFile } = require('openai');
  const imageInput = await toFile(refBuffer, 'master.png', { type: 'image/png' });

  const response = await client.images.edit({
    model: 'gpt-image-2',
    image: imageInput,
    prompt,
    size: API_SIZE,
    n: 1,
  });

  if (!response.data || !response.data[0]) throw new Error('buildFramedInteriorAI: API nie zwrocilo obrazu');
  const img = response.data[0];
  const rawBuffer = img.b64_json ? Buffer.from(img.b64_json, 'base64') : await downloadBuffer(img.url);

  if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(rawBuffer)
    .resize(OUTPUT_W, OUTPUT_H, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 92 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = { buildFramedInteriorAI };
