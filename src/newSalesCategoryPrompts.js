/**
 * Dedicated prompt builders for 7 new sales categories (Gaming, AI, Humor, Cyberpunk, Music, Wellness, Symbols).
 */

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

function joinPromptBlocks(blocks) {
  return blocks
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const NEW_SALES_COMMERCIAL_SAFETY = `
Commercial safety (all new sales categories):
No copyrighted characters, no recognizable game franchises, no brand logos, no console logos, no streamer likeness, no celebrity faces, no trademarked UI, no readable game titles, no real team logos, no known meme templates, no readable meme captions, no platform logos, no offensive religious imagery, no sacred figure depiction, no deity portraits, no political symbols, no extremist symbols, no cult symbols, no real religious institution logos, no readable sacred text, no scripture quotes, no religious slogans, no cultural caricatures, no disrespectful use of sacred symbols, no text, no logos, no labels, no watermark.
Inspired by mood and genre only — never licensed IP, brands, or famous identities.
`.trim();

function buildStyledSalesPrompt({
  title,
  category,
  style,
  categoryMode,
  styleDirection,
  extraForbidden,
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
    extraForbidden,
    NEW_SALES_COMMERCIAL_SAFETY,
    `Style direction: ${styleDirection}`,
    compositionBlock,
    safeBlock,
    restrictions,
    'Ultra-detailed, print-ready.',
  ]);
}

function resolveStyleDirection(categoryKey, styleKey, directions) {
  const map = directions[styleKey];
  if (map) return map;
  return `Premium ${styleKey} execution for ${categoryKey}, category-consistent, no mixed-style drift.`;
}

// --- Gaming i e-sport ---

const GAMING_MODE = `
Gaming & e-sport category mode: gaming room mood, abstract controller without logos, retro arcade vibe, neon light, e-sport energy without brands, pixel energy, keyboard-like forms without readable keys, headset without logo, futuristic gaming backdrop.
Forbidden: known games, known characters, known consoles, console logos, platform logos, in-game UI, game screenshots, readable game titles, streamers, famous faces, known e-sport teams.
`.trim();

const GAMING_STYLE = {
  Illustration:
    'Dynamic but clean gaming illustration, premium editorial, not childish, no known franchise.',
  Minimalism:
    'Simplified controller, arcade silhouette, or neon gaming form with strong negative space, no logos.',
  Abstract:
    'Pixel energy, neon grids, game-like rhythm, cyber motion, no UI, no text, no characters.',
  'Line art':
    'Clean controller, headset, keyboard-like or arcade contour, no logos, no readable keys.',
};

function buildGamingEsportPrompt({ title, category = 'Gaming i e-sport', style }) {
  return buildStyledSalesPrompt({
    title,
    category,
    style,
    categoryMode: GAMING_MODE,
    styleDirection: resolveStyleDirection('Gaming i e-sport', style, GAMING_STYLE),
    useAbstractFraming: style === 'Abstract',
  });
}

// --- AI i technologia ---

const AI_MODE = `
AI & technology category mode: neural networks, data fields, abstract circuits, soft futuristic forms, digital consciousness, machine thought, algorithmic flow, synthetic calm, robotics only as abstract or anonymous forms.
Forbidden: tech company logos, product UI, famous robots, brands, readable charts with numbers, stock robot-with-blue-brain cliché.
`.trim();

const AI_STYLE = {
  Abstract:
    'Soft futuristic abstract data field, neural forms, premium tech atmosphere, no UI.',
  Minimalism:
    'Minimal neural network, simple circuit lines, calm negative space, no brand.',
  Illustration:
    'Elegant futuristic editorial illustration, not cartoonish, no brand.',
  'Line art':
    'Delicate circuit paths, neural nodes, data-line drawing, no logos.',
};

function buildAiTechnologyPrompt({ title, category = 'AI i technologia', style }) {
  return buildStyledSalesPrompt({
    title,
    category,
    style,
    categoryMode: AI_MODE,
    styleDirection: resolveStyleDirection('AI i technologia', style, AI_STYLE),
    useAbstractFraming: style === 'Abstract',
  });
}

// --- Humor i memy ---

const HUMOR_MODE = `
Humor & memes category mode: visual humor without text, ironic animals, absurd small situations, overthinking mood, office plant, tired cloud, confused duck, light meme-like mood without templates.
Forbidden: known meme templates, readable captions, speech bubbles, famous characters, famous faces, politics, offensive humor, text.
`.trim();

const HUMOR_STYLE = {
  Illustration:
    'Funny but tasteful editorial illustration, expressive, no text, no known meme template.',
  Minimalism:
    'Minimal humorous object or character-like form, clean negative space, no captions.',
  'Line art':
    'Simple funny line drawing, expressive but premium, no captions or speech bubbles.',
};

function buildHumorMemesPrompt({ title, category = 'Humor i memy', style }) {
  return buildStyledSalesPrompt({
    title,
    category,
    style,
    categoryMode: HUMOR_MODE,
    styleDirection: resolveStyleDirection('Humor i memy', style, HUMOR_STYLE),
  });
}

// --- Cyberpunk i neon ---

const CYBERPUNK_MODE = `
Cyberpunk & neon category mode: neon light, futuristic geometry, night city mood, rain, cyber forms, neon grid, digital horizon, futuristic alley, electric urban atmosphere.
Forbidden: readable signs, brands, logos, ads, famous cities with ads, text, license plates, numbers on signs.
`.trim();

const CYBERPUNK_STYLE = {
  Abstract:
    'Neon geometry, electric color fields, digital rain, futuristic rhythm, no text.',
  Illustration:
    'Stylized futuristic neon city mood, no readable signs, no brands.',
  Minimalism:
    'Minimal neon line on dark negative space, clean futuristic balance, no signage.',
};

function buildCyberpunkNeonPrompt({ title, category = 'Cyberpunk i neon', style }) {
  return buildStyledSalesPrompt({
    title,
    category,
    style,
    categoryMode: CYBERPUNK_MODE,
    styleDirection: resolveStyleDirection('Cyberpunk i neon', style, CYBERPUNK_STYLE),
    useAbstractFraming: style === 'Abstract',
  });
}

// --- Muzyka i dźwięk ---

const MUSIC_MODE = `
Music & sound category mode: instruments, guitar, piano, saxophone, blank vinyl without label text, abstract sound waves, studio calm, jazz mood, analog warmth, rhythm and sound energy.
Forbidden: instrument brand logos, band names, album covers, vinyl labels with text, song titles, musician faces, celebrities.
`.trim();

const MUSIC_STYLE = {
  Photography:
    'Premium music still-life, unbranded instruments or blank vinyl, soft natural or editorial light, no labels.',
  Minimalism:
    'Simplified instrument, sound wave, or rhythm line with strong negative space.',
  Abstract:
    'Abstract sound field, rhythm forms, wave motion, musical energy without text.',
  'Line art':
    'Elegant instrument or sound-wave contour, clean printable line drawing.',
};

function buildMusicSoundPrompt({ title, category = 'Muzyka i dźwięk', style }) {
  return buildStyledSalesPrompt({
    title,
    category,
    style,
    categoryMode: MUSIC_MODE,
    styleDirection: resolveStyleDirection('Muzyka i dźwięk', style, MUSIC_STYLE),
    useAbstractFraming: style === 'Abstract',
  });
}

// --- Wellness i joga ---

const WELLNESS_MODE = `
Wellness & yoga category mode: yoga mat without logo, calm yoga pose without recognizable face as hero, meditation mood, calm hands gesture without religious symbolism, neutral wellness room, linen fabrics, unlabeled candles, spa stones, natural light, breath, balance, slow living.
Forbidden: readable text, brands on mat/clothing/candles/cosmetics, face-focused portrait as main subject, specific deities, sacred texts, religious slogans, political or controversial symbols, fitness stock look, exaggerated spa stock look.
`.trim();

const WELLNESS_STYLE = {
  Photography:
    'Premium calm wellness photography, soft natural light, neutral tones, unbranded objects, anonymous pose if figure appears, no readable text.',
  Minimalism:
    'Simplified yoga or wellness forms, calm negative space, soft neutral geometry.',
  Illustration:
    'Soft editorial wellness illustration, calm figure or objects, premium, not childish, no religious caricature.',
  'Line art':
    'Elegant yoga pose, breath line, mat, candle, or organic wellness contour; delicate printable line drawing.',
};

function buildWellnessYogaPrompt({ title, category = 'Wellness i joga', style }) {
  return buildStyledSalesPrompt({
    title,
    category,
    style,
    categoryMode: WELLNESS_MODE,
    styleDirection: resolveStyleDirection('Wellness i joga', style, WELLNESS_STYLE),
  });
}

// --- Symbole i harmonia ---

const SYMBOLS_MODE = `
Symbols & harmony category mode: yin-yang as neutral balance symbol, original ornamental mandala geometry, harmony circle, sun and moon, organic geometry, calm energy field, symmetry and balance, zen-inspired forms, natural circles and waves, abstract spirituality without text.
Forbidden: disrespect toward religious symbols, specific deities, saint portraits, religious text, quotes, slogans, political signs, extremist or cult symbols, religious institution logos, literal copies of sacred traditional patterns, readable letters or numbers.
`.trim();

const SYMBOLS_STYLE = {
  Minimalism:
    'Clean harmony symbol, minimal yin-yang or balance circle, soft negative space, neutral premium tones.',
  Abstract:
    'Abstract harmony field, flowing balance forms, soft circular energy, organic geometry.',
  Illustration:
    'Elegant symbolic illustration, soft spiritual-lifestyle mood, balanced forms, not cartoonish.',
  'Line art':
    'Delicate mandala-inspired original line work, yin-yang contour, sun/moon harmony; organic geometric line drawing.',
};

function buildSymbolsHarmonyPrompt({ title, category = 'Symbole i harmonia', style }) {
  return buildStyledSalesPrompt({
    title,
    category,
    style,
    categoryMode: SYMBOLS_MODE,
    styleDirection: resolveStyleDirection('Symbole i harmonia', style, SYMBOLS_STYLE),
    useAbstractFraming: style === 'Abstract',
  });
}

module.exports = {
  NEW_SALES_COMMERCIAL_SAFETY,
  buildGamingEsportPrompt,
  buildAiTechnologyPrompt,
  buildHumorMemesPrompt,
  buildCyberpunkNeonPrompt,
  buildMusicSoundPrompt,
  buildWellnessYogaPrompt,
  buildSymbolsHarmonyPrompt,
};
