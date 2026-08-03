const { assertCategoryStyleAllowed, isUserCategory, getCategoryDescription } = require('./categoryStyles');
const { applyAestheticToPrompt, isKnownAesthetic } = require('./aesthetics');
const { CATEGORY_PROMPT_MODES } = require('./categoryPromptModes');
const builders = require('./promptBuilders');
const {
  COMPOSITION_GENERAL,
  SAFE_PRINT_FRAMING,
  RESTRICTIONS_BLOCK,
  COMPOSITION_ABSTRACT,
  SAFE_PRINT_FRAMING_ABSTRACT,
  RESTRICTIONS_ABSTRACT,
} = require('./safePrintFraming');

const CATEGORY_HARD_OVERRIDES = new Set(['Pojazdy', 'Kosmos i astronomia', 'Mapy i miasta']);

const CATEGORY_DEDICATED = new Set([
  'Gaming i e-sport',
  'AI i technologia',
  'Humor i memy',
  'Cyberpunk i neon',
  'Muzyka i dźwięk',
  'Wellness i joga',
  'Symbole i harmonia',
]);

const DEDICATED_CATEGORY_STYLE = new Set([
  'Botanika|Photography',
  'Botanika|Minimalism',
  'Botanika|Line art',
  'Retro|Photography',
  'Retro|Abstract',
  'Kawa i herbata|Photography',
  'Kuchnia i jedzenie|Photography',
  'Architektura|Photography',
  'Morze i plaża|Photography',
  'Plakaty dla dzieci|Illustration',
  'Plakaty dla dzieci|Minimalism',
]);

function wouldUseCategoryStylePrompt(categoryKey, styleKey) {
  if (!CATEGORY_PROMPT_MODES[categoryKey]) return false;
  if (CATEGORY_HARD_OVERRIDES.has(categoryKey)) return false;
  if (CATEGORY_DEDICATED.has(categoryKey)) return false;
  if (DEDICATED_CATEGORY_STYLE.has(`${categoryKey}|${styleKey}`)) return false;
  return ['Minimalism', 'Abstract', 'Illustration', 'Line art', 'Photography'].includes(styleKey);
}

/**
 * @returns {'category_override'|'category_dedicated'|'category_style_dedicated'|'category_style_prompt'|'style_generic'|'core_fallback'}
 */
function getPromptRouteKind(category, style) {
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  if (CATEGORY_HARD_OVERRIDES.has(categoryKey)) return 'category_override';
  if (CATEGORY_DEDICATED.has(categoryKey)) return 'category_dedicated';
  if (DEDICATED_CATEGORY_STYLE.has(`${categoryKey}|${styleKey}`)) return 'category_style_dedicated';
  if (wouldUseCategoryStylePrompt(categoryKey, styleKey)) return 'category_style_prompt';
  if (['Minimalism', 'Abstract', 'Illustration', 'Line art', 'Photography'].includes(styleKey)) {
    return 'style_generic';
  }
  return 'core_fallback';
}

/**
 * Human-readable routing label for metadata (matches console routing).
 * @param {string} category
 * @param {string} style
 */
function getRoutingPathLabel(category, style) {
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const kind = getPromptRouteKind(categoryKey, styleKey);
  if (kind === 'category_override') {
    return `CATEGORY_HARD_OVERRIDE / ${categoryKey}`;
  }
  if (kind === 'category_dedicated') {
    return `CATEGORY_DEDICATED / ${categoryKey}`;
  }
  if (kind === 'category_style_dedicated') {
    return `CATEGORY_STYLE_DEDICATED / ${categoryKey} + ${styleKey}`;
  }
  if (kind === 'category_style_prompt') {
    return `CATEGORY_STYLE_PROMPT / ${categoryKey} + ${styleKey}`;
  }
  if (kind === 'style_generic') {
    return `STYLE_GENERIC / ${styleKey}`;
  }
  return 'CORE_FALLBACK';
}

function usesStructuredPrompt(category, style) {
  return getPromptRouteKind(category, style) !== 'core_fallback';
}

/**
 * @param {{ category: string, style: string, title: string }} params
 * @returns {string}
 */
function buildImagePromptForRoute({ category, style, title }) {
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const titleText = String(title || '').trim();
  const opts = { title: titleText, category: categoryKey, style: styleKey };

  if (categoryKey === 'Pojazdy') {
    return builders.buildVehiclePrompt(opts);
  }
  if (categoryKey === 'Kosmos i astronomia') {
    return builders.buildSpacePrompt(opts);
  }
  if (categoryKey === 'Mapy i miasta') {
    return builders.buildMapCityPrompt(opts);
  }

  if (categoryKey === 'Botanika' && styleKey === 'Photography') {
    return builders.buildBotanicalPhotographyPrompt(opts);
  }
  if (categoryKey === 'Botanika' && styleKey === 'Minimalism') {
    return builders.buildBotanicalMinimalismPrompt(opts);
  }
  if (categoryKey === 'Botanika' && styleKey === 'Line art') {
    return builders.buildBotanicalLineArtPrompt(opts);
  }
  if (categoryKey === 'Retro' && styleKey === 'Photography') {
    return builders.buildRetroPhotographyPrompt(titleText, {
      COMPOSITION_GENERAL,
      SAFE_PRINT_FRAMING,
      RESTRICTIONS_BLOCK,
    });
  }
  if (categoryKey === 'Retro' && styleKey === 'Abstract') {
    return builders.buildRetroAbstractPrompt(titleText, {
      COMPOSITION_ABSTRACT,
      SAFE_PRINT_FRAMING_ABSTRACT,
      RESTRICTIONS_ABSTRACT,
    });
  }
  if (categoryKey === 'Kawa i herbata' && styleKey === 'Photography') {
    return builders.buildCoffeeTeaPhotographyPrompt(opts);
  }
  if (categoryKey === 'Kuchnia i jedzenie' && styleKey === 'Photography') {
    return builders.buildKitchenFoodPhotographyPrompt(opts);
  }
  if (categoryKey === 'Architektura' && styleKey === 'Photography') {
    return builders.buildArchitecturePhotographyPrompt(opts);
  }
  if (categoryKey === 'Morze i plaża' && styleKey === 'Photography') {
    return builders.buildSeaBeachPhotographyPrompt(opts);
  }
  if (categoryKey === 'Plakaty dla dzieci' && styleKey === 'Illustration') {
    return builders.buildChildrenIllustrationPrompt(opts);
  }
  if (categoryKey === 'Plakaty dla dzieci' && styleKey === 'Minimalism') {
    return builders.buildChildrenMinimalismPrompt(opts);
  }

  if (categoryKey === 'Gaming i e-sport') {
    console.log('    → Routing: CATEGORY_DEDICATED / Gaming i e-sport');
    return builders.buildGamingEsportPrompt(opts);
  }
  if (categoryKey === 'AI i technologia') {
    console.log('    → Routing: CATEGORY_DEDICATED / AI i technologia');
    return builders.buildAiTechnologyPrompt(opts);
  }
  if (categoryKey === 'Humor i memy') {
    console.log('    → Routing: CATEGORY_DEDICATED / Humor i memy');
    return builders.buildHumorMemesPrompt(opts);
  }
  if (categoryKey === 'Cyberpunk i neon') {
    console.log('    → Routing: CATEGORY_DEDICATED / Cyberpunk i neon');
    return builders.buildCyberpunkNeonPrompt(opts);
  }
  if (categoryKey === 'Muzyka i dźwięk') {
    console.log('    → Routing: CATEGORY_DEDICATED / Muzyka i dźwięk');
    return builders.buildMusicSoundPrompt(opts);
  }
  if (categoryKey === 'Wellness i joga') {
    console.log('    → Routing: CATEGORY_DEDICATED / Wellness i joga');
    return builders.buildWellnessYogaPrompt(opts);
  }
  if (categoryKey === 'Symbole i harmonia') {
    console.log('    → Routing: CATEGORY_DEDICATED / Symbole i harmonia');
    return builders.buildSymbolsHarmonyPrompt(opts);
  }

  const categoryStyled = builders.buildCategoryStylePrompt(opts);
  if (categoryStyled) {
    return categoryStyled;
  }

  if (styleKey === 'Minimalism') {
    return builders.buildMinimalismStylePrompt(opts);
  }
  if (styleKey === 'Abstract') {
    return builders.buildAbstractStylePrompt(opts);
  }
  if (styleKey === 'Illustration') {
    return builders.buildIllustrationStylePrompt(opts);
  }
  if (styleKey === 'Line art') {
    return builders.buildLineArtStylePrompt(opts);
  }
  if (styleKey === 'Photography') {
    return builders.buildPhotographyStylePrompt(opts);
  }

  return builders.buildCoreFallbackPrompt(opts);
}

/**
 * @param {{ category: string, style: string, title: string, aesthetic?: string }} params
 * @returns {{ imagePrompt: string, routingPath: string, usedFallbackPromptBuilder: boolean, routeKind: string, aesthetic: string }}
 */
function routePromptBuildResult({ category, style, title, aesthetic }) {
  assertCategoryStyleAllowed(category, style);
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || '').trim();
  const routingPath = getRoutingPathLabel(categoryKey, styleKey);
  const routeKind = getPromptRouteKind(categoryKey, styleKey);
  const usedFallbackPromptBuilder = routeKind === 'core_fallback';

  console.log(`    → Routing validation: OK / ${categoryKey} + ${styleKey}`);
  console.log(`    → Routing: ${routingPath}`);
  if (usedFallbackPromptBuilder) {
    console.warn(`    ⚠ CORE_FALLBACK used for category/style: ${categoryKey} + ${styleKey}`);
  }

  let basePrompt = buildImagePromptForRoute({ category: categoryKey, style: styleKey, title });

  // Kategorie uzytkownika nie maja dedykowanego buildera ani wlasnej puli tytulow,
  // a czesc sciezek (np. Minimalism) wywodzi temat wylacznie z tytulu. Bez tego
  // bloku tozsamosc takiej kategorii bylaby gubiona. Kategorii wbudowanych
  // nie dotykamy - ich prompty zostaja bajt w bajt takie same.
  const userCategory = isUserCategory(categoryKey);
  if (userCategory) {
    const focus = getCategoryDescription(categoryKey);
    if (focus) {
      basePrompt = `${basePrompt}\n\nCATEGORY FOCUS — ${categoryKey.toUpperCase()}:\nThe subject must clearly belong to this category: ${focus}. Keep this identity unmistakable while respecting the composition and safe print framing rules above.`;
    }
  }

  // Estetyka doklejana na koncu jako blok nadpisujacy palete i nastroj.
  // Bez estetyki prompt zostaje identyczny co do bajta.
  const aestheticId = isKnownAesthetic(aesthetic) ? String(aesthetic).trim() : '';
  if (aestheticId) {
    console.log(`    → Aesthetic: ${aestheticId}`);
  }
  const imagePrompt = applyAestheticToPrompt(basePrompt, aestheticId);

  return {
    imagePrompt,
    routingPath,
    usedFallbackPromptBuilder,
    routeKind,
    aesthetic: aestheticId,
  };
}

/** @returns {string} */
function routePromptBuilder(params) {
  return routePromptBuildResult(params).imagePrompt;
}

/** Ile znakow dokłada estetyka — do walidacji limitu promptu w UI. */
function measureAestheticOverhead(aestheticId) {
  return applyAestheticToPrompt('', aestheticId).length;
}

module.exports = {
  routePromptBuilder,
  routePromptBuildResult,
  getRoutingPathLabel,
  getPromptRouteKind,
  usesStructuredPrompt,
  measureAestheticOverhead,
};
