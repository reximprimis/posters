/**
 * Trzy kierunki plakatu rocznicowego dla Orla Myslakowice.
 *
 * DLACZEGO GRAFIKA BEZ TEKSTU: generator obrazu nie napisze poprawnie
 * "MYSLAKOWICE" — gubi Ł i przy dluzszej nazwie zmyśla litery. Jedyna rzecz,
 * ktora obecny plakat robi dobrze, to wlasnie bezbledny napis. Dlatego AI
 * robi sama grafike, a napisy skladamy programowo przez SVG, gdzie polskie
 * znaki wychodza zawsze poprawnie.
 *
 * Kompozycja musi zostawic pas u gory (na "80 LAT") i u dolu (na nazwe).
 *
 *   node scripts/orzelWarianty.js
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const DalleImageGenerator = require('../src/dalleImageGenerator');

const KAT = path.join(__dirname, '..', 'zestawy_robocze', 'orzel');

const WSPOLNE =
  'Heraldic eagle emblem for a Polish sports club anniversary poster. ' +
  'Deep forest green background, heraldic gold and warm brass as the only accent metals. ' +
  'The eagle faces left, wings spread, holding a heraldic shield at its chest. ' +
  'STRICTLY NO TEXT, no letters, no numbers, no banner scrolls with writing, no watermark, no signature — ' +
  'lettering will be added later by hand. ' +
  'Leave a clean, calm horizontal band across the TOP quarter and the BOTTOM quarter of the composition, ' +
  'free of any detail, so titles can be placed there. ' +
  'The emblem sits in the middle half of the canvas, centered, with even margins.';

const WARIANTY = [
  {
    id: 'A_rytowany',
    opis: 'Rytowniczy — jak grawiura na banknocie',
    prompt:
      WSPOLNE +
      ' Rendered as a fine intaglio engraving: dense parallel hatching, crisp burin lines, ' +
      'the precision of an old banknote or a bookplate. Gold linework on deep green, subtle paper tooth. ' +
      'Dignified, archival, restrained — no glossy plastic vector look, no flat clipart, no drop shadows.',
  },
  {
    id: 'B_nowoczesny',
    opis: 'Nowoczesny — płaska forma, dużo powietrza',
    prompt:
      WSPOLNE +
      ' Rendered as a modern flat heraldic mark: bold simplified silhouette, confident geometry, ' +
      'solid unmodulated gold on deep green, hard clean edges, generous empty space. ' +
      'Contemporary sports-crest design language — no gradients, no shading, no 3D, no texture noise.',
  },
  {
    id: 'C_vintage',
    opis: 'Vintage sportowy — sitodruk',
    prompt:
      WSPOLNE +
      ' Rendered as a vintage screen-printed sports poster from the 1950s: limited ink palette, ' +
      'slight registration offset, visible paper grain and ink texture, matte flat inks. ' +
      'Nostalgic club-pennant character — no digital gloss, no photorealism, no gradients.',
  },
];

(async () => {
  fs.mkdirSync(KAT, { recursive: true });
  const gen = new DalleImageGenerator();

  for (const w of WARIANTY) {
    const cel = path.join(KAT, w.id + '.png');
    console.log('');
    console.log('=== ' + w.id + ' — ' + w.opis);
    try {
      await gen.generateImage('Orzel 80 Lat', 'sports-hobbies', 'Illustration', cel, {
        customPrompt: w.prompt,
        orientation: 'portrait',
      });
      console.log('   -> ' + cel);
    } catch (e) {
      console.error('   x ' + e.message);
    }
  }
  console.log('');
  console.log('Gotowe. Warianty w: zestawy_robocze/orzel/');
})().catch((e) => { console.error(e); process.exit(1); });
