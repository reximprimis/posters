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
  'abstract': `
Abstract category mode: nonfigurative color fields, geometry, texture, rhythm — emotional but controlled premium wall art.
Forbidden: faces, objects, landscapes, text, logos, mockup frames.
`.trim(),
  'nature-landscapes': `
Nature & landscape mode: mountains, forests, lakes, rivers, meadows, mist, horizons — real outdoor atmosphere.
Forbidden: cities, people, buildings, roads, signs, vehicles, text, logos.
`.trim(),
  'animals': `
Animals category mode: one clear animal hero — wildlife or domestic, natural or gently stylized, expressive but premium.
Forbidden: cartoon logos, brand mascots, text, cages, pet product ads, scary gore.
`.trim(),
  'vehicles': `
Vehicles category mode: cars, motorcycles, aircraft, boats — engineered transport forms, full silhouette visible.
Forbidden: brand logos, readable badges, license plates, dealership ads.
`.trim(),
  'coffee-tea': `
Coffee & tea mode: cups, steam, beans, tea leaves, teapot, café calm — unbranded ceramics only.
Forbidden: logos on cups, menus, readable packaging, brand names.
`.trim(),
  'kitchen-food': `
Kitchen & food mode: lemons, tomatoes, olive oil, pasta, herbs, bread, fruit, spices — Mediterranean editorial still-life.
Forbidden: packaging with text, labels, brands, plastic stock-food look, cluttered commercial ads.
`.trim(),
  'architecture': `
Architecture mode: facades, arches, stairs, columns, modernism, brutalism, light on walls.
Forbidden: street signs, building names, logos, house numbers, people as main subject.
`.trim(),
  'sea-coast': `
Sea & beach mode: waves, shoreline, dunes, shells, lighthouses, calm coastal horizons.
Forbidden: crowds, hotels, ads, signs, cheesy tourist stock look.
`.trim(),
  'sports-hobbies': SPORT_HOBBY_MODE,
};

const CATEGORY_STYLE_DIRECTIONS = {
  'abstract': {
    Abstract:
      'Large color fields and geometric rhythm edge-to-edge; disciplined palette, gallery-grade abstract print.',
    Minimalism:
      'Quiet abstract forms, restrained palette, generous negative space, premium calm composition.',
  },
  'nature-landscapes': {
    Photography:
      'Editorial landscape photography, natural light, believable atmosphere, no HDR exaggeration.',
    Minimalism:
      'Simplified mountain, forest, or horizon forms — muted tones, large sky, Scandinavian calm.',
    Impressionism:
      'Impressionist oil painting with thick visible brushstrokes and textured canvas surface, broken color and dappled light, painterly not photographic, soft edges, rich but natural color harmony reminiscent of late-19th-century French impressionism.',
    Watercolor:
      'Original watercolor landscape — transparent washes of sky and horizon, soft bleeding edges, visible paper texture, loose painterly mountains, forests, or fields rather than photographic detail.',
    'Van Gogh Style':
      'Original painting of the landscape in swirling post-impressionist brushwork — thick rhythmic strokes in sky and fields, bold outlines on hills or trees, vivid unmixed color, dynamic movement across the whole canvas.',
    'Monet Style':
      'Original impressionist landscape in soft feathery brushwork — dissolved edges, shimmering reflected light on a lake or river, hazy broken-color atmosphere, tranquil water-garden mood.',
    'Matisse Style':
      'Original Fauvist landscape in flat bold non-naturalistic color — simplified hills, trees, or fields as confident decorative shapes, vivid color pairs placed directly against each other, joyful rhythmic pattern.',
  },
  'animals': {
    Photography:
      'Naturalistic animal portrait or wildlife scene, sharp subject, soft background, editorial tone.',
    Illustration:
      'Refined animal illustration, gentle character, premium print — not cartoon clipart.',
    'Line art':
      'Elegant animal contour drawing, delicate lines on cream, full silhouette visible.',
    Minimalism:
      'Simplified animal silhouette or shape study, muted palette, strong negative space.',
  },
  'vehicles': {
    Illustration:
      'Stylized vehicle illustration, clean lines, dynamic but premium — no logos.',
    Minimalism:
      'Minimal vehicle silhouette, single hero car or bike form, large negative space.',
    'Line art':
      'Precise vehicle contour drawing, engineering elegance, no badges or text.',
  },
  'coffee-tea': {
    Minimalism:
      'Single cup or teapot hero, warm neutral palette, calm morning ritual, lots of breathing room.',
    Illustration:
      'Soft editorial coffee/tea illustration, steam and ceramics, cozy café mood.',
    'Line art':
      'Delicate cup, spoon, or teapot line drawing on cream — no logos on ceramics.',
  },
  'kitchen-food': {
    Minimalism:
      'Minimal food still-life: one ingredient hero on linen or stone, Mediterranean tones, editorial calm.',
    Illustration:
      'Soft watercolor or gouache food illustration — lemons, herbs, pasta, warm kitchen mood.',
    'Line art':
      'Fine kitchen line art: citrus, herbs, olive branch, pasta nest — elegant contour on cream.',
  },
  'architecture': {
    Minimalism:
      'Reduced architectural form — facade lines, arch, or stair silhouette, muted concrete and sky tones.',
    Abstract:
      'Architectural abstraction: geometric facade rhythm, shadow planes, modern gallery print.',
    'Line art':
      'Precise architectural line drawing: arches, columns, facade geometry — no signage.',
  },
  'sea-coast': {
    Minimalism:
      'Simplified coastal forms — horizon line, dune curve, or wave silhouette, soft pastel palette.',
    Abstract:
      'Abstract coastal color fields — sea tones, sand texture, calm horizontal rhythm.',
    Illustration:
      'Gentle coastal illustration — shells, lighthouse, or soft waves, airy premium mood.',
    Impressionism:
      'Impressionist oil painting with thick visible brushstrokes and textured canvas surface, broken color and dappled light, painterly not photographic, soft edges, rich but natural color harmony reminiscent of late-19th-century French impressionism.',
    Watercolor:
      'Original watercolor seascape — transparent washes of sea and sky, soft bleeding edges, visible paper texture, loose painterly waves, dunes, or cliffs rather than photographic detail.',
    'Van Gogh Style':
      'Original painting of the coastline in swirling post-impressionist brushwork — thick rhythmic strokes in sea and sky, bold outlines on cliffs or boats, vivid unmixed color, dynamic movement across the whole canvas.',
    'Monet Style':
      'Original impressionist seascape in soft feathery brushwork — dissolved edges, shimmering reflected light on the water, hazy broken-color atmosphere, tranquil harbor or shoreline mood.',
  },
  'sports-hobbies': {
    Photography:
      'Editorial sports still-life or lifestyle object, natural light, believable materials — not stadium ads.',
    Illustration:
      'Clean sports/hobby illustration, dynamic but calm, no team logos or brand gear.',
    Minimalism:
      'Minimal sports object silhouette — ball, racket, or hobby item as single hero form.',
    'Line art':
      'Elegant sports equipment line drawing, full object visible, no brand markings.',
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
    // Impressionism/Watercolor/Van Gogh Style/Monet Style/Klimt Style/
    // Matisse Style all paint edge-to-edge like Abstract — same full-bleed
    // framing, no isolated hero subject margin.
    useAbstractFraming:
      styleKey === 'Abstract' ||
      styleKey === 'Impressionism' ||
      styleKey === 'Watercolor' ||
      styleKey === 'Van Gogh Style' ||
      styleKey === 'Monet Style' ||
      styleKey === 'Klimt Style' ||
      styleKey === 'Matisse Style',
  });
}

module.exports = {
  CATEGORY_PROMPT_MODES,
  CATEGORY_STYLE_DIRECTIONS,
  buildCategoryStylePrompt,
  buildStyledCategoryPrompt,
  resolveCategoryStyleDirection,
};
