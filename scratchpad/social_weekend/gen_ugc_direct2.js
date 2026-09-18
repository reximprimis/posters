'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { toFile } = require('openai');

const PRODUCT_PATH = path.join(__dirname, '..', '..', 'posters', 'nature-landscapes', 'photography', 'Golden_Autumn_Forest_Path', 'Golden_Autumn_Forest_Path_thumb.jpg');
const PERSONA_PATH = path.join(__dirname, 'lena_bauer_v1.png');

const ART_DESC = 'a golden-lit autumn forest path, tall trees with orange and amber leaves arching overhead, warm dappled sunlight filtering through the canopy, a leaf-covered path leading into the distance';

const SHOTS = [
  {
    name: 'autumn_forest_flat_direct_v1',
    prompt: `Photorealistic overhead lifestyle product photo, viewed from slightly above at an angle. A poster print lies completely FLAT on a soft cream-colored rug — no curl, no rolling, no bending anywhere, fully flat from edge to edge as if freshly placed down. NO frame of any kind. A woman's hand (matching the hands of the woman in the second reference image, no face needed) rests gently on one corner of the print, fingertips just touching the surface. The print is a modest 30x40cm size. No other props, no books, no plants, no extra styling — just the rug, the flat print, and the hand. Reproduce the artwork exactly as in the first reference image — ${ART_DESC} — do not invent a different scene or lighting. The artwork is full-bleed, edge-to-edge, with NO white border or margin around it at all. CRITICAL paper quality: genuine thick 220gsm fine-art poster paper, visible slight thickness at the edge, matte non-reflective surface, completely flat and rigid — NOT thin flimsy copy paper, NOT curling, NOT rolled. Soft warm daylight from a window, authentic photography look, no text, no watermark.`,
  },
  {
    name: 'autumn_forest_angle_direct_v1',
    prompt: `Photorealistic UGC-style photo of the woman from the second reference image, at home, standing at a slight three-quarter angle to the camera (not straight-on), holding up a SMALL framed poster print with both hands, angled slightly toward the camera, looking down at the frame with a soft genuine smile rather than looking at the camera. IMPORTANT SIZE: the poster is a modest 30x40cm print — about the size of a large magazine, clearly smaller than her torso, held comfortably close to her body. Do NOT make it large or oversized. Reproduce the artwork inside the frame exactly as in the first reference image — ${ART_DESC} — do not invent a different scene or lighting. Do not add a mat board. Do not add a passe-partout. Do not add any cream, white, off-white or paper-colored border strip between the artwork and the inside of the frame — the print is face-mounted flush to the glass, edge-to-edge, full bleed, zero gap, zero visible paper margin, zero border of any color. CRITICAL paper quality: genuine thick 220gsm fine-art poster print, rigid, flat, substantial weight, matte non-reflective surface — NOT thin copy paper. Natural indoor daylight, cozy modern living room background different from a straight-on shot (different furniture angle visible), authentic phone-camera look, candid genuine expression. No text, no watermark.`,
  },
];

async function genOne(client, productFile, personaFile, shot) {
  console.log('Generuje:', shot.name);
  const response = await client.images.edit({
    model: 'gpt-image-2.5-sunburst',
    image: [productFile, personaFile],
    prompt: shot.prompt,
    size: '1024x1536',
    quality: 'high',
    n: 1,
  });
  if (!response.data || !response.data[0]) throw new Error('Brak obrazu w odpowiedzi API dla ' + shot.name);
  const img = response.data[0];
  const buf = img.b64_json ? Buffer.from(img.b64_json, 'base64') : null;
  if (!buf) throw new Error('Brak b64_json dla ' + shot.name);
  const outPath = path.join(__dirname, shot.name + '.png');
  fs.writeFileSync(outPath, buf);
  console.log('Zapisano:', outPath);
}

async function main() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const productBuf = fs.readFileSync(PRODUCT_PATH);
  const personaBuf = fs.readFileSync(PERSONA_PATH);
  const productFile = await toFile(productBuf, 'product.jpg', { type: 'image/jpeg' });
  const personaFile = await toFile(personaBuf, 'persona.png', { type: 'image/png' });

  for (const shot of SHOTS) {
    await genOne(client, productFile, personaFile, shot);
  }
}

main().catch((err) => {
  console.error('BLAD:', err.message);
  process.exit(1);
});
