/**
 * Salon (wersja lifestyle) dla ZESTAWU SCIENNEGO (kind: 'gallery') — przez
 * GPT Image, NIE przez sklejanie sharp w staly plik assets/set_rooms/*.png.
 *
 * Powod istnienia: buildGalleryInterior (src/galleryVisuals.js) wkleja gotowy
 * packshot w JEDNO stale zdjecie pokoju — plaski fotomontaz, zawsze ten sam
 * pokoj bez wzgledu na kategorie/styl zestawu. Dokladnie ten sam problem, ktory
 * galleryFramedInteriorAI.js juz rozwiazal dla "zestaw plus ramka" — to jest
 * analogiczne rozwiazanie dla zestawow BEZ ramy w cenie: referencja to packshot
 * (buildGalleryPackshot — realne ramy tylko do wizualizacji efektu, bez cienia
 * wlasnego bo cien dorabia model), model fotografuje go w pokoju dobranym pod
 * kategorie/styl zestawu (roomCollections[0] -> SCENY, tak jak przy ramkach).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const OpenAI = require('openai');
const sharp = require('sharp');

const API_SIZE = '1024x1536'; // pion, najblizsze 2:3 wspierane przez gpt-image
const OUTPUT_W = 1000;
const OUTPUT_H = 1500;

// Ta sama mapa scen co galleryFramedInteriorAI.js — jeden slownik pokoi dla
// obu rodzajow zestawow, zeby "living-room" znaczylo to samo wszedzie.
const SCENY = {
  'living-room': 'Scandinavian modern living room — light oak console, soft linen sofa edge visible, simple ceramic decor, natural daylight from a side window. Calm, warm, premium atmosphere.',
  'home-office': 'modern home office — clean desk with laptop closed, ergonomic chair, bookshelf with neutral objects, large window light. Professional, focused, minimal clutter.',
  'bedroom': 'calm contemporary bedroom — upholstered headboard, layered linen bedding, small bedside lamp, soft morning light. Restful, airy, premium hotel-like calm.',
  'hallway': 'bright entryway or hallway — narrow console table, simple mirror out of frame, light wood floor, soft ambient light. Welcoming and tidy.',
  'kitchen': 'modern European kitchen wall — matte or light wood cabinets nearby, clean backsplash, warm natural window light. Tidy, no readable packaging or labels.',
  'kids-room': 'gentle child room wall — soft neutral walls, light wood furniture nearby, warm daylight. Playful but calm, not chaotic.',
  'dining-room': 'warm dining room wall — edge of a wooden dining table visible, simple pendant light out of frame, natural daylight. Inviting, understated.',
  'bathroom': 'bright modern bathroom wall — clean tile just out of focus, soft natural light, no fixtures overlapping the artwork. Calm, spa-like.',
  'study': 'quiet study nook — edge of a bookshelf, warm reading-lamp light, wooden desk corner. Focused, literary, premium calm.',
};

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' pobierajac salon'));
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

function budujPrompt(pieceCount, scena) {
  return `Use the uploaded image as the EXACT reference. It shows ${pieceCount} independently framed prints arranged together as one fixed wall-set composition — a large hero piece plus smaller pieces grouped beside it. Do not change the artwork inside any frame, do not change the frame color or material, do not change the arrangement, relative sizes, or spacing between the frames — reproduce this exact set pixel-accurately.

Photograph this exact framed arrangement hanging on a wall in a ${scena}

Requirements:
- Camera straight-on, eye level, correct perspective for a wall-mounted piece — not tilted, not angled.
- Real photograph look: natural window light, soft realistic contact shadow under each frame, subtle realistic reflections on glass if any — shot with professional camera equipment, not illustrated or painted.
- The wall is clean, smooth, neutral (warm light gray or warm white). The arrangement is centered and straight, realistically sized relative to the room (medium scale, clearly visible but not oversized).
- No text, no logo, no watermark, no other artwork or photos on the wall.
- Photorealistic result suitable for a Shopify product image gallery.`;
}

/**
 * @param {Buffer} referenceBuffer  Packshot (buildGalleryPackshot) — realne ramy jako wizualizacja efektu.
 * @param {{ pieceCount: number, roomSlug?: string, model?: string }} opts
 * @param {string} outputPath
 */
async function buildGalleryInteriorAI(referenceBuffer, opts, outputPath) {
  const { pieceCount, roomSlug, model } = opts || {};
  if (!pieceCount) throw new Error('buildGalleryInteriorAI: brak pieceCount');

  const scena = SCENY[roomSlug] || SCENY['living-room'];
  const prompt = budujPrompt(pieceCount, scena);

  const refBuffer = await sharp(referenceBuffer)
    .flatten({ background: '#ffffff' })
    .resize(1024, 1536, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 7 })
    .toBuffer();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { toFile } = require('openai');
  const imageInput = await toFile(refBuffer, 'packshot.png', { type: 'image/png' });

  const response = await client.images.edit({
    model: model || 'gpt-image-2',
    image: imageInput,
    prompt,
    size: API_SIZE,
    n: 1,
  });

  if (!response.data || !response.data[0]) throw new Error('buildGalleryInteriorAI: API nie zwrocilo obrazu');
  const img = response.data[0];
  const rawBuffer = img.b64_json ? Buffer.from(img.b64_json, 'base64') : await downloadBuffer(img.url);

  if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(rawBuffer)
    .resize(OUTPUT_W, OUTPUT_H, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 92 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = { buildGalleryInteriorAI, SCENY };
