const { assertCategoryStyleAllowed, isUserCategory, getCategoryDescription } = require('./categoryStyles');
const { applyAestheticToPrompt, isKnownAesthetic } = require('./aesthetics');
const { isKnownOccasion, buildOccasionBlock } = require('./taxonomy');
const { CATEGORY_PROMPT_MODES } = require('./categoryPromptModes');
const { MINIMALISM_LANDSCAPE_CATEGORIES } = require('./minimalismSubject');
const builders = require('./promptBuilders');
const {
  COMPOSITION_GENERAL,
  SAFE_PRINT_FRAMING,
  RESTRICTIONS_BLOCK,
  COMPOSITION_ABSTRACT,
  SAFE_PRINT_FRAMING_ABSTRACT,
  RESTRICTIONS_ABSTRACT,
} = require('./safePrintFraming');

const CATEGORY_HARD_OVERRIDES = new Set(['vehicles', 'space-astronomy', 'cities-travel']);

const CATEGORY_DEDICATED = new Set([
  'gaming-esports',
  'ai-technology',
  'humor-memes',
  'cyberpunk-neon',
  'music-sound',
  'wellness-yoga',
  'symbols-sacred-geometry',
  'typography-quotes',
]);

const DEDICATED_CATEGORY_STYLE = new Set([
  'botanical|Photography',
  'botanical|Minimalism',
  'botanical|Line art',
  'retro-vintage|Photography',
  'retro-vintage|Abstract',
  'coffee-tea|Photography',
  'kitchen-food|Photography',
  'architecture|Photography',
  'sea-coast|Photography',
  'kids-nursery|Illustration',
  'kids-nursery|Minimalism',
  // Trzy kategorie, w ktorych minimalizm ZNACZY pejzaz. Reszta minimalizmu idzie
  // wariantem przedmiotowym (src/minimalismSubject.js).
  'nature-landscapes|Minimalism',
  'sea-coast|Minimalism',
  'mountains-hiking|Minimalism',
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

  if (categoryKey === 'vehicles') {
    return builders.buildVehiclePrompt(opts);
  }
  if (categoryKey === 'space-astronomy') {
    return builders.buildSpacePrompt(opts);
  }
  if (categoryKey === 'cities-travel') {
    return builders.buildMapCityPrompt(opts);
  }

  if (categoryKey === 'botanical' && styleKey === 'Photography') {
    return builders.buildBotanicalPhotographyPrompt(opts);
  }
  if (categoryKey === 'botanical' && styleKey === 'Minimalism') {
    return builders.buildBotanicalMinimalismPrompt(opts);
  }
  if (categoryKey === 'botanical' && styleKey === 'Line art') {
    return builders.buildBotanicalLineArtPrompt(opts);
  }
  if (categoryKey === 'retro-vintage' && styleKey === 'Photography') {
    return builders.buildRetroPhotographyPrompt(titleText, {
      COMPOSITION_GENERAL,
      SAFE_PRINT_FRAMING,
      RESTRICTIONS_BLOCK,
    });
  }
  if (categoryKey === 'retro-vintage' && styleKey === 'Abstract') {
    return builders.buildRetroAbstractPrompt(titleText, {
      COMPOSITION_ABSTRACT,
      SAFE_PRINT_FRAMING_ABSTRACT,
      RESTRICTIONS_ABSTRACT,
    });
  }
  if (categoryKey === 'coffee-tea' && styleKey === 'Photography') {
    return builders.buildCoffeeTeaPhotographyPrompt(opts);
  }
  if (categoryKey === 'kitchen-food' && styleKey === 'Photography') {
    return builders.buildKitchenFoodPhotographyPrompt(opts);
  }
  if (categoryKey === 'architecture' && styleKey === 'Photography') {
    return builders.buildArchitecturePhotographyPrompt(opts);
  }
  if (categoryKey === 'sea-coast' && styleKey === 'Photography') {
    return builders.buildSeaBeachPhotographyPrompt(opts);
  }
  if (categoryKey === 'kids-nursery' && styleKey === 'Illustration') {
    return builders.buildChildrenIllustrationPrompt(opts);
  }
  if (categoryKey === 'kids-nursery' && styleKey === 'Minimalism') {
    return builders.buildChildrenMinimalismPrompt(opts);
  }
  if (MINIMALISM_LANDSCAPE_CATEGORIES.has(categoryKey) && styleKey === 'Minimalism') {
    return builders.buildMinimalismLandscapePrompt(opts);
  }

  if (categoryKey === 'gaming-esports') {
    console.log('    → Routing: CATEGORY_DEDICATED / gaming-esports');
    return builders.buildGamingEsportPrompt(opts);
  }
  if (categoryKey === 'ai-technology') {
    console.log('    → Routing: CATEGORY_DEDICATED / ai-technology');
    return builders.buildAiTechnologyPrompt(opts);
  }
  if (categoryKey === 'humor-memes') {
    console.log('    → Routing: CATEGORY_DEDICATED / humor-memes');
    return builders.buildHumorMemesPrompt(opts);
  }
  if (categoryKey === 'cyberpunk-neon') {
    console.log('    → Routing: CATEGORY_DEDICATED / cyberpunk-neon');
    return builders.buildCyberpunkNeonPrompt(opts);
  }
  if (categoryKey === 'music-sound') {
    console.log('    → Routing: CATEGORY_DEDICATED / music-sound');
    return builders.buildMusicSoundPrompt(opts);
  }
  if (categoryKey === 'wellness-yoga') {
    console.log('    → Routing: CATEGORY_DEDICATED / wellness-yoga');
    return builders.buildWellnessYogaPrompt(opts);
  }
  if (categoryKey === 'symbols-sacred-geometry') {
    console.log('    → Routing: CATEGORY_DEDICATED / symbols-sacred-geometry');
    return builders.buildSymbolsHarmonyPrompt(opts);
  }

  if (categoryKey === 'typography-quotes') {
    console.log('    → Routing: CATEGORY_DEDICATED / typography-quotes');
    return builders.buildTypographyQuotesPrompt(opts);
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
function routePromptBuildResult({ category, style, title, aesthetic, occasion }) {
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
  let imagePrompt = applyAestheticToPrompt(basePrompt, aestheticId, String(title || '').trim());

  // Okazja (albo pora roku) idzie PO estetyce i jest ostatnim blokiem promptu.
  // Kolejnosc jest celowa: gdy plakat ma i estetyke, i okazje, o palecie ma
  // decydowac okazja — swiateczny Bauhaus ma byc swiateczny, a nie czerwono-
  // niebiesko-zolty. Bez okazji prompt zostaje identyczny co do bajta.
  const occasionId = isKnownOccasion(occasion) ? String(occasion).trim().toLowerCase() : '';
  if (occasionId) {
    console.log(`    → Occasion: ${occasionId}`);
    const blok = buildOccasionBlock(occasionId);
    const t = String(title || '').trim();
    const przypomnienie = t
      ? `SUBJECT STAYS: the occasion changes palette, props and atmosphere only. The artwork must still depict the subject named by the title "${t}".`
      : 'SUBJECT STAYS: the occasion changes palette, props and atmosphere only.';
    imagePrompt = `${imagePrompt}\n\n${blok}\n${przypomnienie}`;
  }

  return {
    imagePrompt,
    routingPath,
    usedFallbackPromptBuilder,
    routeKind,
    aesthetic: aestheticId,
    occasion: occasionId,
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
