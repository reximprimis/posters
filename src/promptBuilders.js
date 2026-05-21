/**
 * Prompt text builders (no routing). Routing: promptRouter.js
 */

const { getCategoryArtDirection } = require('./posterPromptLayers');
const {
  SAFE_PRINT_FRAMING,
  SAFE_PRINT_FRAMING_BOTANICAL,
  SAFE_PRINT_FRAMING_ABSTRACT,
  COMPOSITION_GENERAL,
  COMPOSITION_BOTANICAL,
  COMPOSITION_ABSTRACT,
  RESTRICTIONS_BLOCK,
  RESTRICTIONS_ABSTRACT,
  RESTRICTIONS_MINIMAL_LANDSCAPE,
  resolveSafePrintFramingForCategory,
  getCompositionBlock,
  getRestrictionsBlock,
} = require('./safePrintFraming');
const {
  MINIMAL_COLOR_PALETTE,
  MINIMAL_STYLE_DIRECTION,
  MINIMAL_COMPOSITION,
  buildMinimalSafeFramingBlock,
  buildMinimalismPrompt,
  resolveMinimalismSubject,
} = require('./minimalismSubject');
const {
  buildTitleBriefBlock,
  buildRetroPhotographyPrompt,
  buildRetroAbstractPrompt,
} = require('./titleSubjectConsistency');
const {
  buildCoffeeTeaPhotographyPrompt,
  buildKitchenFoodPhotographyPrompt,
  buildArchitecturePhotographyPrompt,
  buildSeaBeachPhotographyPrompt,
  SPORT_HOBBY_MODE,
} = require('./salesCategoryPrompts');
const {
  buildGamingEsportPrompt,
  buildAiTechnologyPrompt,
  buildHumorMemesPrompt,
  buildCyberpunkNeonPrompt,
  buildMusicSoundPrompt,
  buildWellnessYogaPrompt,
  buildSymbolsHarmonyPrompt,
} = require('./newSalesCategoryPrompts');
const { getCategoryDescription } = require('./categoryStyles');

const CORE_PROMPT_TEMPLATE = `{TITLE_BRIEF_BLOCK}

{CATEGORY_LOGIC}

Style direction:
{STYLE_LOGIC}
Soft natural depth of field where appropriate.
Background integrated naturally behind the subject.
Physically plausible scene, believable materials, and natural depth.

{COMPOSITION_BLOCK}

{SAFE_FRAMING_BLOCK}

{RESTRICTIONS}`;

const CATEGORY_CORE_OVERRIDE = {
  'Kosmos i astronomia': `Show a calm cosmic scene or celestial landscape with one dominant focal subject, such as a planet, moon, nebula, or horizon. Keep the space composition clean, spacious, and premium rather than chaotic sci-fi clutter.`,
  'Mapy i miasta': `Show one physically plausible urban hero subject: skyline, street canyon, architectural facade, or city detail. Keep perspective realistic, composition structured, and lighting editorial. Avoid surreal mirror reflections, floating structures, impossible architecture, or infographic-style map graphics unless the title explicitly asks for them.`,
  Pojazdy: `Show one complete, physically plausible hero vehicle: car, motorcycle, aircraft, boat, or engineered transport form. The full vehicle silhouette must be visible with all wheels, bumpers, wings, mirrors, hull edges, or other key parts inside the safe area with at least 5% clearance from every image border; avoid extreme close-up crops and avoid brand logos, readable badges, license plates, or markings.`,
};

const BOTANICAL_SALES_MODE =
  'Botanical sales mode: A blossom-led natural branch or stem subject, such as cherry blossom, magnolia, wild flower stem, single bloom, or delicate spring branch. Natural growth flow, not a decorative product arrangement. Avoid fern-heavy motifs, product-shot eucalyptus styling, rigid symmetry, and geometric botanical layouts.';

const CATEGORY_LOGIC_MAP = {
  Botanika: BOTANICAL_SALES_MODE,
  'Kosmos i astronomia':
    'Cosmic subject: stars, planets, nebulae. Deep space atmosphere, controlled light, not sci-fi clutter.',
  'Kawa i herbata':
    'Coffee and tea: cups, steam, beans, tea leaves, café calm — unbranded surfaces only, no readable packaging.',
  'Kuchnia i jedzenie':
    'Kitchen food: natural ingredients, Mediterranean calm, editorial still-life — no labels or brand packaging.',
  Architektura:
    'Architecture: facades, arches, stairs, columns, light on walls — no signage, logos, or street text.',
  'Morze i plaża':
    'Sea and beach: calm waves, dunes, shells, coastal horizon — peaceful premium coast, no tourist clutter.',
  'Sport i hobby': SPORT_HOBBY_MODE,
  'Gaming i e-sport':
    'Gaming mood: neon setup, abstract controller, arcade energy — no franchises, logos, or known characters.',
  'AI i technologia':
    'AI & tech: neural networks, data fields, abstract circuits — no brand UI or famous robots.',
  'Humor i memy':
    'Visual humor without text: ironic animals, absurd moments — no meme templates or captions.',
  'Cyberpunk i neon':
    'Cyberpunk neon: futuristic night geometry, rain, electric urban mood — no readable signs.',
  'Muzyka i dźwięk':
    'Music: unbranded instruments, blank vinyl, sound waves — no album art or musician faces.',
  'Wellness i joga':
    'Wellness: calm yoga, meditation, spa still-life — neutral lifestyle, no religious or brand imagery.',
  'Symbole i harmonia':
    'Symbols: yin-yang, mandala geometry, balance — neutral spiritual-lifestyle, no sacred text or deities.',
  'Dla pary': 'Symbolic connection: intertwined elements, soft romance, subtle emotion, not kitsch.',
};

const STYLE_LOGIC_MAP = {
  Photography:
    'Realistic photography with natural or editorial light, believable lens detail, grounded color, and a physically plausible scene. Soft natural depth of field. Background integrated naturally behind the subject. Avoid CGI, fantasy glow, plastic texture, and staged product-shot composition.',
  Minimalism:
    'Minimal composition with restrained forms, quiet luxury mood, and intentional negative space used as part of the artwork.',
  Abstract:
    'Abstract composition with flowing forms, disciplined color harmony, and structured energy across the full frame.',
  Illustration:
    'Refined illustration with controlled detail, clear shape hierarchy, and premium print finish.',
  'Line art':
    'Delicate line drawing with refined contours, elegant simplicity, and clean premium restraint.',
};

function resolveCategoryLogic(category) {
  const c = String(category || '').trim();
  if (CATEGORY_LOGIC_MAP[c]) return CATEGORY_LOGIC_MAP[c];
  const desc = getCategoryDescription(c);
  if (desc) return `${desc} Keep category identity clear and consistent with the title.`;
  return `${getCategoryArtDirection(c)} Keep category identity clear and consistent with the title.`;
}

function resolveStyleLogic(style) {
  const s = String(style || '').trim();
  if (STYLE_LOGIC_MAP[s]) return STYLE_LOGIC_MAP[s];
  return `Style must remain strictly "${s || 'Photography'}" with clear visual discipline and no mixed-style drift.`;
}

function joinPromptBlocks(blocks) {
  return blocks
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildBotanicalPhotographyPrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category, style }),
    BOTANICAL_SALES_MODE,
    `Style direction: ${STYLE_LOGIC_MAP.Photography}`,
    COMPOSITION_BOTANICAL,
    SAFE_PRINT_FRAMING_BOTANICAL,
    RESTRICTIONS_BLOCK,
    'Ultra-detailed, print-ready.',
  ]);
}

function buildBotanicalMinimalismPrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  let minimal = buildMinimalismPrompt(titleText, categoryKey, {
    MINIMAL_STYLE_DIRECTION,
    MINIMAL_COLOR_PALETTE,
    MINIMAL_COMPOSITION,
    SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE: buildMinimalSafeFramingBlock(
      resolveMinimalismSubject(titleText, categoryKey).landscapeFocus
    ),
    MINIMAL_RESTRICTIONS: RESTRICTIONS_MINIMAL_LANDSCAPE,
  });
  if (minimal.includes('TITLE BRIEF')) {
    minimal = minimal.replace(
      /(TITLE BRIEF[^\n]*\n\n)/,
      `$1${BOTANICAL_SALES_MODE}\n\n`
    );
  } else {
    minimal = joinPromptBlocks([BOTANICAL_SALES_MODE, minimal]);
  }
  return minimal;
}

function buildBotanicalLineArtPrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category, style }),
    BOTANICAL_SALES_MODE,
    `Style direction: ${STYLE_LOGIC_MAP['Line art']}`,
    COMPOSITION_BOTANICAL,
    SAFE_PRINT_FRAMING_BOTANICAL,
    RESTRICTIONS_BLOCK,
    'Ultra-detailed, print-ready.',
  ]);
}

function buildCategoryHardOverridePrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const override = CATEGORY_CORE_OVERRIDE[categoryKey];
  const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  const compositionBlock = getCompositionBlock(categoryKey, styleKey);
  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey }),
    override,
    `Style direction: ${resolveStyleLogic(styleKey)}`,
    compositionBlock,
    safeBlock,
    getRestrictionsBlock(styleKey, categoryKey),
    'Ultra-detailed, print-ready.',
  ]);
}

function buildVehiclePrompt(opts) {
  return buildCategoryHardOverridePrompt(opts);
}

function buildSpacePrompt(opts) {
  return buildCategoryHardOverridePrompt(opts);
}

function buildMapCityPrompt(opts) {
  return buildCategoryHardOverridePrompt(opts);
}

function buildMinimalismStylePrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  return buildMinimalismPrompt(titleText, categoryKey, {
    MINIMAL_STYLE_DIRECTION,
    MINIMAL_COLOR_PALETTE,
    MINIMAL_COMPOSITION,
    SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE: buildMinimalSafeFramingBlock(
      resolveMinimalismSubject(titleText, categoryKey).landscapeFocus
    ),
    MINIMAL_RESTRICTIONS: RESTRICTIONS_MINIMAL_LANDSCAPE,
  });
}

function buildAbstractStylePrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  if (categoryKey === 'Retro') {
    return buildRetroAbstractPrompt(titleText, {
      COMPOSITION_ABSTRACT,
      SAFE_PRINT_FRAMING_ABSTRACT,
      RESTRICTIONS_ABSTRACT,
    });
  }
  return buildRetroAbstractPrompt(titleText, {
    COMPOSITION_ABSTRACT,
    SAFE_PRINT_FRAMING_ABSTRACT,
    RESTRICTIONS_ABSTRACT,
  }).replace(/Retro fine-art/gi, 'Fine-art');
}

function buildIllustrationStylePrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  const compositionBlock = getCompositionBlock(categoryKey, styleKey);
  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey }),
    resolveCategoryLogic(categoryKey),
    `Style direction: ${resolveStyleLogic(styleKey)}`,
    compositionBlock,
    safeBlock,
    getRestrictionsBlock(styleKey, categoryKey),
    'Ultra-detailed, print-ready.',
  ]);
}

function buildLineArtStylePrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  const compositionBlock = getCompositionBlock(categoryKey, styleKey);
  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey }),
    resolveCategoryLogic(categoryKey),
    `Style direction: ${STYLE_LOGIC_MAP['Line art']}`,
    compositionBlock,
    safeBlock,
    getRestrictionsBlock(styleKey, categoryKey),
    'Ultra-detailed, print-ready.',
  ]);
}

function buildPhotographyStylePrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  const compositionBlock = getCompositionBlock(categoryKey, styleKey);
  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    CORE_PROMPT_TEMPLATE.replace(
      '{TITLE_BRIEF_BLOCK}',
      buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey })
    )
      .replace('{CATEGORY_LOGIC}', resolveCategoryLogic(categoryKey))
      .replace('{STYLE_LOGIC}', resolveStyleLogic(styleKey))
      .replace('{COMPOSITION_BLOCK}', compositionBlock)
      .replace('{SAFE_FRAMING_BLOCK}', safeBlock)
      .replace('{RESTRICTIONS}', getRestrictionsBlock(styleKey, categoryKey)),
    'Ultra-detailed, print-ready.',
  ]);
}

function buildCoreFallbackPrompt({ title, category, style }) {
  return buildPhotographyStylePrompt({ title, category, style });
}

module.exports = {
  BOTANICAL_SALES_MODE,
  STYLE_LOGIC_MAP,
  buildCoffeeTeaPhotographyPrompt,
  buildKitchenFoodPhotographyPrompt,
  buildArchitecturePhotographyPrompt,
  buildSeaBeachPhotographyPrompt,
  buildBotanicalPhotographyPrompt,
  buildBotanicalMinimalismPrompt,
  buildBotanicalLineArtPrompt,
  buildCategoryHardOverridePrompt,
  buildVehiclePrompt,
  buildSpacePrompt,
  buildMapCityPrompt,
  buildMinimalismStylePrompt,
  buildAbstractStylePrompt,
  buildIllustrationStylePrompt,
  buildLineArtStylePrompt,
  buildPhotographyStylePrompt,
  buildCoreFallbackPrompt,
  buildRetroPhotographyPrompt,
  buildRetroAbstractPrompt,
  buildGamingEsportPrompt,
  buildAiTechnologyPrompt,
  buildHumorMemesPrompt,
  buildCyberpunkNeonPrompt,
  buildMusicSoundPrompt,
  buildWellnessYogaPrompt,
  buildSymbolsHarmonyPrompt,
};
