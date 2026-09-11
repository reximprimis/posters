/**
 * Jednorazowy skrypt: 5 przykladowych prezentacji zestawow sciennych w
 * INNYCH kolorach ram (nie czarny aluminium) i w bardziej charakterystycznych
 * wnetrzach (nie jednolicie skandynawskich). Referencja to GOLY uklad (bez
 * ramy, buildGalleryMaster) — model sam dodaje rame w zadanym kolorze i
 * materiale, wiec nie trzeba tego symulowac lokalnie w sharp.
 *
 * Zapisuje do proponowane_ramki/ — NIE dotyka posters_inventory.json ani
 * zadnego zatwierdzonego produktu.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const sharp = require('sharp');
const { buildGalleryMaster } = require('../src/galleryVisuals');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'proponowane_ramki');
fs.mkdirSync(OUT, { recursive: true });

const cm = (r) => r.split('x').map(Number);
function it(size, imagePath) {
  const [w, h] = cm(size);
  return { absPath: path.join(ROOT, imagePath), widthCm: w, heightCm: h };
}

const PRZYKLADY = [
  {
    nazwa: 'srebrna-moody-gabinet',
    rama: 'brushed silver aluminum frame, cool metallic sheen',
    scena: 'moody dark study with deep charcoal-green painted wall, a tall dark wood bookshelf partly in frame, warm brass reading lamp light, rich and atmospheric — not bright, not minimal Scandinavian',
    items: [
      it('40x50', 'posters/symbols-sacred-geometry/Line art/Sri_Yantra_Triangles/Sri_Yantra_Triangles.png'),
      it('21x30', 'posters/symbols-sacred-geometry/Line art/Flower_of_Life_Grid/Flower_of_Life_Grid.png'),
      it('21x30', 'posters/symbols-sacred-geometry/Line art/Metatron_Cube_Lines/Metatron_Cube_Lines.png'),
      it('30x40', 'posters/symbols-sacred-geometry/Line art/Sacred_Geometry_Gold/Sacred_Geometry_Gold.png'),
    ],
  },
  {
    nazwa: 'miedziana-domowy-bar',
    rama: 'polished copper / rose-gold metal frame, warm reflective glow',
    scena: 'warm home bar corner with terracotta-orange painted wall, a dark walnut bar cart with glassware visible at the edge, dramatic warm evening light — rich, characterful, not neutral',
    items: [
      it('40x50', 'posters/bar-cocktails/Photography/Coupe_Glass_Reflection/Coupe_Glass_Reflection.png'),
      it('21x30', 'posters/bar-cocktails/Photography/Ice_Cube_Close/Ice_Cube_Close.png'),
      it('21x30', 'posters/bar-cocktails/Photography/Martini_Olive_Skewer/Martini_Olive_Skewer.png'),
      it('30x40', 'posters/bar-cocktails/Photography/Copper_Jigger_Shine/Copper_Jigger_Shine.png'),
    ],
  },
  {
    nazwa: 'debowa-cieply-jadalnia',
    rama: 'natural light oak wood frame, visible warm wood grain',
    scena: 'warm dining nook with a mustard-ochre painted wall, edge of a rattan chair and a wooden table with dried flowers visible, soft golden-hour light — inviting, characterful, not sterile',
    items: [
      it('50x70', 'posters/botanical/Illustration/Elderflower_Umbel/Elderflower_Umbel.png'),
      it('21x30', 'posters/botanical/Line art/Meadowsweet_Froth/Meadowsweet_Froth.png'),
      it('21x30', 'posters/botanical/Line art/Comfrey_Root_Drawing/Comfrey_Root_Drawing.png'),
      it('13x18', 'posters/botanical/line_art/Soft_Botanical_Branch/Soft_Botanical_Branch.png'),
    ],
  },
  {
    nazwa: 'zlota-elegancka-sypialnia',
    rama: 'slim brushed gold metal frame, warm luxurious glint',
    scena: 'elegant bedroom with a deep navy blue painted wall, edge of a velvet headboard and a brass sconce light visible, moody sophisticated evening atmosphere — not bright, not generic',
    items: [
      it('40x50', 'posters/space-astronomy/illustration/Cosmic_Star_Map/Cosmic_Star_Map.png'),
      it('21x30', 'posters/space-astronomy/Illustration/Saturn_Rings_Glow/Saturn_Rings_Glow.png'),
      it('21x30', 'posters/space-astronomy/Illustration/Nebula_Color_Cloud/Nebula_Color_Cloud.png'),
      it('30x40', 'posters/space-astronomy/Illustration/Star_Cluster_Night/Star_Cluster_Night.png'),
    ],
  },
  {
    nazwa: 'biala-drewniana-czytelnia',
    rama: 'matte white wood frame, soft clean profile',
    scena: 'cozy reading nook with a dusty blush-pink painted wall, edge of a boucle armchair and a small round side table with a cup of tea, soft afternoon light through a sheer curtain — warm and characterful, not sterile white-box',
    items: [
      it('40x50', 'posters/typography-quotes/Minimalism/Good_Morning_Lettering/Good_Morning_Lettering.png'),
      it('21x30', 'posters/typography-quotes/Minimalism/Do_Less_Better/Do_Less_Better.png'),
      it('21x30', 'posters/typography-quotes/Minimalism/Coffee_First_Lettering/Coffee_First_Lettering.png'),
      it('30x40', 'posters/typography-quotes/Minimalism/Hello_Sunshine_Type/Hello_Sunshine_Type.png'),
      it('13x18', 'posters/typography-quotes/Abstract/One_Word_Breathe/One_Word_Breathe.png'),
    ],
  },
];

function budujPrompt(pieceCount, rama, scena) {
  return `Use the uploaded image as the EXACT reference for the artwork inside each of the ${pieceCount} pieces — do not change the artwork, its arrangement, relative sizes, or spacing. Add a ${rama} around EACH piece individually (each print gets its own separate frame with real spacing between frames, not one shared frame).

Photograph this exact framed arrangement hanging on a wall in a ${scena}

Requirements:
- Camera straight-on, eye level, correct perspective for a wall-mounted piece.
- Real photograph look: natural light, soft realistic contact shadow under each frame — shot with professional camera equipment, not illustrated.
- Each frame is a separate physical object with real spacing between frames (3-5 cm), not touching, not merged into one shared frame.
- Photorealistic result suitable for a premium home-decor product listing.`;
}

(async () => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { toFile } = require('openai');

  for (const ex of PRZYKLADY) {
    process.stdout.write(ex.nazwa + '... ');
    const masterPath = path.join(OUT, ex.nazwa + '_master.jpg');
    await buildGalleryMaster(ex.items, masterPath);

    const refBuffer = await sharp(masterPath)
      .resize(1024, 1536, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    const imageInput = await toFile(refBuffer, 'master.png', { type: 'image/png' });
    const prompt = budujPrompt(ex.items.length, ex.rama, ex.scena);

    try {
      const response = await client.images.edit({
        model: 'gpt-image-2.5-sunburst',
        image: imageInput,
        prompt,
        size: '1024x1536',
        n: 1,
      });
      const img = response.data[0];
      const rawBuffer = img.b64_json ? Buffer.from(img.b64_json, 'base64') : null;
      const outPath = path.join(OUT, ex.nazwa + '.jpg');
      await sharp(rawBuffer).resize(1000, 1500, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(outPath);
      console.log('OK -> ' + outPath);
    } catch (e) {
      console.log('BLAD: ' + e.message);
    }
  }
})();
