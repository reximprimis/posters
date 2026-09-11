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
 * kategorie/styl zestawu (roomCollections[0] -> SCENY).
 *
 * KOLOR RAMY i WARIANT SCENY: patrz FRAME_STYLES / SCENY nizej — jeden slownik
 * realnych kolorow ram (7 SKU sklepowych, frames/products/<kolor>/) i kilka
 * wariantow wnetrza na kazdy pokoj, zeby produkty w tej samej kategorii nie
 * wygladaly identycznie (patrz proponowane_ramki/ — pierwsza runda przykladow
 * zaakceptowana przez uzytkownika, std tych "charakternych", nie-skandynawskich
 * wnetrz).
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

// Realne kolory ram ze sklepu (src/ramkiKatalog.js, frames/products/<kolor>/) —
// domyslny 'czarny-mat' zachowuje dotychczasowy wyglad (czarne aluminium),
// reszta to opcje do swiadomego wyboru przy nowych/odswiezanych zestawach.
const FRAME_STYLES = {
  'czarny-mat': 'matte black aluminum frame, thin clean profile',
  'srebrny': 'brushed silver aluminum frame, cool metallic sheen',
  'miedziany': 'polished copper / rose-gold metal frame, warm reflective glow',
  'zloty': 'slim brushed gold metal frame, warm luxurious glint',
  'dab': 'natural light oak wood frame, visible warm wood grain',
  'bialy': 'matte white wood frame, soft clean profile',
  'czarny': 'black wood frame, deep matte finish, slightly more substantial than aluminum',
};
const DEFAULT_FRAME = 'czarny-mat';

// Kilka wariantow sceny na kazdy pokoj — nie tylko jednolity skandynawski
// minimalizm. Wybor deterministyczny (hash handle'a), zeby ten sam produkt
// zawsze trafial w ten sam wariant przy regeneracji, ale rozne produkty w tej
// samej kategorii nie wygladaly identycznie.
const SCENY = {
  'living-room': [
    'Scandinavian modern living room — light oak console, soft linen sofa edge visible, simple ceramic decor, natural daylight from a side window. Calm, warm, premium atmosphere.',
    'moody living room with a deep charcoal-green painted wall, edge of a dark velvet sofa, brass floor lamp light. Rich and atmospheric, not bright or minimal.',
    'warm living room with a terracotta-orange accent wall, edge of a rattan chair, golden-hour light. Inviting, characterful, sun-drenched.',
  ],
  'home-office': [
    'modern home office — clean desk with laptop closed, ergonomic chair, bookshelf with neutral objects, large window light. Professional, focused, minimal clutter.',
    'moody dark study with a deep charcoal-green painted wall, a tall dark wood bookshelf partly in frame, warm brass reading lamp light. Rich and atmospheric, literary.',
    'elegant home office with a deep navy blue painted wall, leather chair edge, brass desk lamp glow. Sophisticated, focused, premium.',
  ],
  'bedroom': [
    'calm contemporary bedroom — upholstered headboard, layered linen bedding, small bedside lamp, soft morning light. Restful, airy, premium hotel-like calm.',
    'elegant bedroom with a deep navy blue painted wall, edge of a velvet headboard, brass sconce light. Moody, sophisticated evening atmosphere.',
    'cozy bedroom with a dusty blush-pink painted wall, boucle armchair edge, soft afternoon light through a sheer curtain. Warm and characterful.',
  ],
  'hallway': [
    'bright entryway or hallway — narrow console table, simple mirror out of frame, light wood floor, soft ambient light. Welcoming and tidy.',
    'warm entryway with a deep forest-green painted wall, brass wall hooks partly in frame, soft ambient light. Characterful, welcoming.',
  ],
  'kitchen': [
    'modern European kitchen wall — matte or light wood cabinets nearby, clean backsplash, warm natural window light. Tidy, no readable packaging or labels.',
    'warm farmhouse kitchen wall with a sage-green cabinet edge, woven basket, morning light. Inviting, characterful.',
  ],
  'kids-room': [
    'gentle child room wall — soft neutral walls, light wood furniture nearby, warm daylight. Playful but calm, not chaotic.',
    'cheerful child room with a soft mustard-yellow painted wall, light wood toy shelf edge, warm daylight. Playful, warm, not chaotic.',
  ],
  'dining-room': [
    'warm dining room wall — edge of a wooden dining table visible, simple pendant light out of frame, natural daylight. Inviting, understated.',
    'warm dining nook with a mustard-ochre painted wall, edge of a rattan chair and a wooden table with dried flowers visible, soft golden-hour light. Inviting, characterful.',
  ],
  'bathroom': [
    'bright modern bathroom wall — clean tile just out of focus, soft natural light, no fixtures overlapping the artwork. Calm, spa-like.',
    'warm bathroom wall with a deep clay-terracotta tile edge, soft natural light, brass fixture glint. Calm, spa-like, characterful.',
  ],
  'study': [
    'quiet study nook — edge of a bookshelf, warm reading-lamp light, wooden desk corner. Focused, literary, premium calm.',
    'moody study nook with a deep bottle-green painted wall, leather chair edge, warm brass lamp light. Literary, atmospheric.',
  ],
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function wybierzScene(roomSlug, seed) {
  const warianty = SCENY[roomSlug] || SCENY['living-room'];
  if (!seed) return warianty[0];
  return warianty[hashSeed(seed) % warianty.length];
}

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

function budujPrompt(pieceCount, scena, rama, zmienRame) {
  const ramaInstrukcja = zmienRame
    ? `Add a ${rama} around EACH piece individually (each print gets its own separate frame with real spacing between frames, not one shared frame).`
    : `Do not change the frame color or material (${rama}) — reproduce the frames exactly as shown.`;
  return `Use the uploaded image as the EXACT reference for the artwork inside each of the ${pieceCount} pieces AND for their exact arrangement (whether that is one large anchor piece with smaller pieces beside it, or a wall grid of similarly-sized pieces) — do not change the artwork, the arrangement, relative sizes, or spacing between the frames. Reproduce this exact set pixel-accurately. ${ramaInstrukcja}

Photograph this exact framed arrangement hanging on a wall in a ${scena}

Requirements:
- Camera straight-on, eye level, correct perspective for a wall-mounted piece — not tilted, not angled.
- Real photograph look: natural light, soft realistic contact shadow under each frame, subtle realistic reflections on glass if any — shot with professional camera equipment, not illustrated or painted.
- Each frame is a separate physical object with real spacing between frames (3-5 cm), not touching, not merged into one shared frame.
- The arrangement is centered and straight, realistically sized relative to the room (medium scale, clearly visible but not oversized).
- No text, no logo, no watermark, no other artwork or photos on the wall.
- Photorealistic result suitable for a Shopify product image gallery.`;
}

/**
 * @param {Buffer} referenceBuffer  Packshot (buildGalleryPackshot) — realne ramy jako wizualizacja efektu.
 * @param {{ pieceCount: number, roomSlug?: string, model?: string, frameColorSlug?: string, seed?: string }} opts
 *   frameColorSlug: klucz z FRAME_STYLES (domyslnie 'czarny-mat' — dotychczasowy wyglad, referencja juz ma ta rame).
 *   seed: np. handle produktu — dobiera wariant sceny deterministycznie z SCENY[roomSlug].
 * @param {string} outputPath
 */
async function buildGalleryInteriorAI(referenceBuffer, opts, outputPath) {
  const { pieceCount, roomSlug, model, frameColorSlug, seed } = opts || {};
  if (!pieceCount) throw new Error('buildGalleryInteriorAI: brak pieceCount');

  const scena = wybierzScene(roomSlug, seed);
  const kolorRamy = frameColorSlug || DEFAULT_FRAME;
  const rama = FRAME_STYLES[kolorRamy] || FRAME_STYLES[DEFAULT_FRAME];
  const zmienRame = kolorRamy !== DEFAULT_FRAME;
  const prompt = budujPrompt(pieceCount, scena, rama, zmienRame);

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

module.exports = { buildGalleryInteriorAI, SCENY, FRAME_STYLES };
