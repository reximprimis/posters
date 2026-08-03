/**
 * Category-specific prompt modes for STYLE_GENERIC routes — keeps each category visually distinct.
 */

'use strict';

const { getCategoryDescription } = require('./categoryStyles');
const {
  SAFE_PRINT_FRAMING,
  SAFE_PRINT_FRAMING_ABSTRACT,
  COMPOSITION_GENERAL,
  COMPOSITION_ABSTRACT,
  RESTRICTIONS_BLOCK,
  RESTRICTIONS_ABSTRACT,
  resolveSafePrintFramingForCategory,
  getCompositionBlock,
  getRestrictionsBlock,
} = require('./safePrintFraming');
const { buildTitleBriefBlock } = require('./titleSubjectConsistency');
const { SPORT_HOBBY_MODE } = require('./salesCategoryPrompts');

function joinPromptBlocks(blocks) {
  return blocks
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildStyledCategoryPrompt({
  title,
  category,
  style,
  categoryMode,
  styleDirection,
  useAbstractFraming = false,
}) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const safeBlock =
    useAbstractFraming || styleKey === 'Abstract'
      ? SAFE_PRINT_FRAMING_ABSTRACT
      : resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  const compositionBlock =
    styleKey === 'Abstract' ? COMPOSITION_ABSTRACT : getCompositionBlock(categoryKey, styleKey);
  const restrictions =
    styleKey === 'Abstract'
      ? RESTRICTIONS_ABSTRACT
      : getRestrictionsBlock(styleKey, categoryKey);

  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey }),
    `Category focus (${categoryKey}): ${getCategoryDescription(categoryKey)}`,
    categoryMode,
    `Style direction: ${styleDirection}`,
    compositionBlock,
    safeBlock,
    restrictions,
    'Ultra-detailed, print-ready.',
  ]);
}

const COMMERCIAL_SAFETY = `
No readable text, letters, numbers, logos, watermarks, brand names, or product packaging copy in the artwork.
`.trim();

const CATEGORY_PROMPT_MODES = {
  Abstrakcja: `
Abstract category mode: nonfigurative color fields, geometry, texture, rhythm — emotional but controlled premium wall art.
Forbidden: faces, objects, landscapes, text, logos, mockup frames.
`.trim(),
  'Natura i krajobrazy': `
Nature & landscape mode: mountains, forests, lakes, rivers, meadows, mist, horizons — real outdoor atmosphere.
Forbidden: cities, people, buildings, roads, signs, vehicles, text, logos.
`.trim(),
  Zwierzęta: `
Animals category mode: one clear animal hero — wildlife or domestic, natural or gently stylized, expressive but premium.
Forbidden: cartoon logos, brand mascots, text, cages, pet product ads, scary gore.
`.trim(),
  Pojazdy: `
Vehicles category mode: cars, motorcycles, aircraft, boats — engineered transport forms, full silhouette visible.
Forbidden: brand logos, readable badges, license plates, dealership ads.
`.trim(),
  'Kawa i herbata': `
Coffee & tea mode: cups, steam, beans, tea leaves, teapot, café calm — unbranded ceramics only.
Forbidden: logos on cups, menus, readable packaging, brand names.
`.trim(),
  'Kuchnia i jedzenie': `
Kitchen & food mode: lemons, tomatoes, olive oil, pasta, herbs, bread, fruit, spices — Mediterranean editorial still-life.
Forbidden: packaging with text, labels, brands, plastic stock-food look, cluttered commercial ads.
`.trim(),
  Architektura: `
Architecture mode: facades, arches, stairs, columns, modernism, brutalism, light on walls.
Forbidden: street signs, building names, logos, house numbers, people as main subject.
`.trim(),
  'Morze i plaża': `
Sea & beach mode: waves, shoreline, dunes, shells, lighthouses, calm coastal horizons.
Forbidden: crowds, hotels, ads, signs, cheesy tourist stock look.
`.trim(),
  'Sport i hobby': SPORT_HOBBY_MODE,
  Japonia: `
Japan category mode: one clear Japanese motif — torii gate, Mount Fuji, cherry blossom branch, koi carp, crane, bamboo, zen garden, stone lantern, or stylised wave.
Treat it as calm fine art with restraint and generous empty space, never as a tourist souvenir or festival collage.
Forbidden: kanji or any lettering, anime and manga characters, ninja and samurai kitsch, national flag, brand logos, crowded street scenes, neon signage.
`.trim(),
  'Podróże i plakaty vintage': `
Travel poster mode: one iconic destination motif — national park vista, canyon, alpine peak, desert arch, coastal cliff, or lighthouse.
Use retro travel-poster graphic language: bold simplified shapes, flat layered color bands, confident silhouettes, gentle grain.
Forbidden: ALL lettering and place names (the poster must work without text), brand logos, tourists and crowds, hotels, road signs, modern vehicles, stock-photo look.
`.trim(),
  'Grzyby i las': `
Mushroom & forest mode: mushrooms, toadstools, ferns, moss, bark, forest floor detail — cottagecore woodland calm.
Botanical accuracy with soft damp light; intimate close view rather than a wide landscape.
Forbidden: text and field-guide labels, human hands, baskets and foraging props, psychedelic or drug references, cartoon faces on mushrooms.
`.trim(),
};

const CATEGORY_STYLE_DIRECTIONS = {
  Abstrakcja: {
    Abstract:
      'Large color fields and geometric rhythm edge-to-edge; disciplined palette, gallery-grade abstract print.',
    Minimalism:
      'Quiet abstract forms, restrained palette, generous negative space, premium calm composition.',
  },
  'Natura i krajobrazy': {
    Photography:
      'Editorial landscape photography, natural light, believable atmosphere, no HDR exaggeration.',
    Minimalism:
      'Simplified mountain, forest, or horizon forms — muted tones, large sky, Scandinavian calm.',
  },
  Zwierzęta: {
    Photography:
      'Naturalistic animal portrait or wildlife scene, sharp subject, soft background, editorial tone.',
    Illustration:
      'Refined animal illustration, gentle character, premium print — not cartoon clipart.',
    'Line art':
      'Elegant animal contour drawing, delicate lines on cream, full silhouette visible.',
    Minimalism:
      'Simplified animal silhouette or shape study, muted palette, strong negative space.',
  },
  Pojazdy: {
    Illustration:
      'Stylized vehicle illustration, clean lines, dynamic but premium — no logos.',
    Minimalism:
      'Minimal vehicle silhouette, single hero car or bike form, large negative space.',
    'Line art':
      'Precise vehicle contour drawing, engineering elegance, no badges or text.',
  },
  'Kawa i herbata': {
    Minimalism:
      'Single cup or teapot hero, warm neutral palette, calm morning ritual, lots of breathing room.',
    Illustration:
      'Soft editorial coffee/tea illustration, steam and ceramics, cozy café mood.',
    'Line art':
      'Delicate cup, spoon, or teapot line drawing on cream — no logos on ceramics.',
  },
  'Kuchnia i jedzenie': {
    Minimalism:
      'Minimal food still-life: one ingredient hero on linen or stone, Mediterranean tones, editorial calm.',
    Illustration:
      'Soft watercolor or gouache food illustration — lemons, herbs, pasta, warm kitchen mood.',
    'Line art':
      'Fine kitchen line art: citrus, herbs, olive branch, pasta nest — elegant contour on cream.',
  },
  Architektura: {
    Minimalism:
      'Reduced architectural form — facade lines, arch, or stair silhouette, muted concrete and sky tones.',
    Abstract:
      'Architectural abstraction: geometric facade rhythm, shadow planes, modern gallery print.',
    'Line art':
      'Precise architectural line drawing: arches, columns, facade geometry — no signage.',
  },
  'Morze i plaża': {
    Minimalism:
      'Simplified coastal forms — horizon line, dune curve, or wave silhouette, soft pastel palette.',
    Abstract:
      'Abstract coastal color fields — sea tones, sand texture, calm horizontal rhythm.',
    Illustration:
      'Gentle coastal illustration — shells, lighthouse, or soft waves, airy premium mood.',
  },
  'Sport i hobby': {
    Photography:
      'Editorial sports still-life or lifestyle object, natural light, believable materials — not stadium ads.',
    Illustration:
      'Clean sports/hobby illustration, dynamic but calm, no team logos or brand gear.',
    Minimalism:
      'Minimal sports object silhouette — ball, racket, or hobby item as single hero form.',
    'Line art':
      'Elegant sports equipment line drawing, full object visible, no brand markings.',
  },
  Japonia: {
    Minimalism:
      'One Japanese motif reduced to its essence — few shapes, muted ink tones, very generous empty space, sumi-e restraint.',
    'Line art':
      'Fine single-weight ink contour of a Japanese motif on warm paper, confident uninterrupted stroke, nothing cropped.',
    Illustration:
      'Soft washed Japanese scene with layered flat tones and gentle gradient mist, ukiyo-e influence without lettering or seals.',
    Photography:
      'Quiet editorial photograph of a Japanese subject in soft diffused light, calm depth, believable natural materials.',
  },
  'Podróże i plakaty vintage': {
    Illustration:
      'Retro travel-poster illustration: bold simplified landforms, flat layered color bands, confident silhouette, subtle print grain — no lettering.',
    Minimalism:
      'Destination reduced to a few clean geometric bands and one recognisable landform, muted retro palette.',
    Abstract:
      'Landscape abstracted into overlapping color planes and arcs suggesting a place rather than depicting it.',
    Photography:
      'Editorial destination photograph with clean horizon and no people, poster-like clarity, natural light.',
  },
  'Grzyby i las': {
    Photography:
      'Close editorial macro of mushrooms or forest floor, soft damp light, shallow depth, believable woodland detail.',
    Illustration:
      'Botanical-plate style mushroom or fern illustration, accurate forms, muted earthy palette, no labels.',
    Minimalism:
      'Single simplified mushroom or fern form, restrained earthy tones, large calm negative space.',
    'Line art':
      'Delicate ink contour of mushroom caps, gills, or fern fronds on cream, full form visible.',
  },
};

function resolveCategoryStyleDirection(category, style) {
  const cat = String(category || '').trim();
  const st = String(style || '').trim();
  const map = CATEGORY_STYLE_DIRECTIONS[cat];
  if (map && map[st]) return map[st];
  return `Premium ${st} execution faithful to ${cat}; category-consistent subject from title; no mixed-style drift.`;
}

/**
 * Build category-aware prompt for STYLE_GENERIC routes. Returns null if category has no mode.
 */
function buildCategoryStylePrompt({ title, category, style }) {
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const categoryMode = CATEGORY_PROMPT_MODES[categoryKey];
  if (!categoryMode) return null;

  return buildStyledCategoryPrompt({
    title,
    category: categoryKey,
    style: styleKey,
    categoryMode: `${categoryMode}\n${COMMERCIAL_SAFETY}`,
    styleDirection: resolveCategoryStyleDirection(categoryKey, styleKey),
    useAbstractFraming: styleKey === 'Abstract',
  });
}

module.exports = {
  CATEGORY_PROMPT_MODES,
  CATEGORY_STYLE_DIRECTIONS,
  buildCategoryStylePrompt,
  buildStyledCategoryPrompt,
  resolveCategoryStyleDirection,
};
