/**
 * Dedicated prompt builders for sales-focused generator categories.
 */

const { getCategoryDescription } = require('./categoryStyles');
const {
  SAFE_PRINT_FRAMING,
  COMPOSITION_GENERAL,
  RESTRICTIONS_BLOCK,
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

function buildSalesCategoryPhotographyPrompt({ title, category, style, categoryMode, styleDirection }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const styleKey = String(style || 'Photography').trim();
  const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  const compositionBlock = getCompositionBlock(categoryKey, styleKey);
  return joinPromptBlocks([
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey }),
    `Category focus (${categoryKey}): ${getCategoryDescription(categoryKey)}`,
    categoryMode,
    `Style direction: ${styleDirection}`,
    compositionBlock,
    safeBlock,
    getRestrictionsBlock(styleKey, categoryKey),
    'Ultra-detailed, print-ready.',
  ]);
}

const COFFEE_TEA_MODE = `
Coffee & tea category mode: espresso, ceramic cup, milk coffee, steam above the cup, coffee beans, morning ritual, tea leaves, teapot, calm café atmosphere.
Forbidden: readable logos on cups, packaging text, brand names, menus with lettering, labeled bags, advertising mockups, mugs with printed words.
`.trim();

const COFFEE_TEA_PHOTO =
  'Realistic premium coffee or tea still-life, editorial natural light, soft shadows, warm neutral tones, believable materials, no product-ad look.';

function buildCoffeeTeaPhotographyPrompt(opts) {
  return buildSalesCategoryPhotographyPrompt({
    ...opts,
    category: 'Kawa i herbata',
    style: 'Photography',
    categoryMode: COFFEE_TEA_MODE,
    styleDirection: COFFEE_TEA_PHOTO,
  });
}

const KITCHEN_FOOD_MODE = `
Kitchen & food category mode: lemons, tomatoes, olive oil, pasta, herbs, spices, bread, fruit and vegetables, Mediterranean kitchen calm.
Forbidden: packaging with text, labels, brands, menus, plates with writing, plastic stock-food look, exaggerated commercial food photography.
`.trim();

const KITCHEN_FOOD_PHOTO =
  'Premium food still-life, natural ingredients, soft linen, editorial daylight, Mediterranean calm, tactile and premium.';

function buildKitchenFoodPhotographyPrompt(opts) {
  return buildSalesCategoryPhotographyPrompt({
    ...opts,
    category: 'Kuchnia i jedzenie',
    style: 'Photography',
    categoryMode: KITCHEN_FOOD_MODE,
    styleDirection: KITCHEN_FOOD_PHOTO,
  });
}

const ARCHITECTURE_MODE = `
Architecture category mode: facades, arches, stairs, columns, modernist planes, brutalist massing, geometric buildings, light and shadow on walls.
Forbidden: street signs with text, building names, logos, house numbers, license plates, people as main subject, advertisements.
`.trim();

const ARCHITECTURE_PHOTO =
  'Editorial architectural photography, clean geometry, natural light, premium composition, physically plausible structure.';

function buildArchitecturePhotographyPrompt(opts) {
  return buildSalesCategoryPhotographyPrompt({
    ...opts,
    category: 'Architektura',
    style: 'Photography',
    categoryMode: ARCHITECTURE_MODE,
    styleDirection: ARCHITECTURE_PHOTO,
  });
}

const SEA_BEACH_MODE = `
Sea & beach category mode: waves, shoreline, dunes, shells, lighthouse, calm sea, sand, coastal mist, pastel sky.
Forbidden: crowds, hotels, ads, signs with text, logos, cheesy tourist stock look.
`.trim();

const SEA_BEACH_PHOTO =
  'Calm coastal photography, soft daylight, natural tones, peaceful premium mood, believable horizon and water.';

function buildSeaBeachPhotographyPrompt(opts) {
  return buildSalesCategoryPhotographyPrompt({
    ...opts,
    category: 'Morze i plaża',
    style: 'Photography',
    categoryMode: SEA_BEACH_MODE,
    styleDirection: SEA_BEACH_PHOTO,
  });
}

// Slowo "tenis" celowo NIE wystepuje w tym tekscie. Wczesniejsza wersja pisala
// "not only tennis" i "tennis racket OR court" — a negacja i tak podsuwa temat,
// przez co 9 z 11 pierwszych plakatow w tej kategorii wyszlo tenisowych.
// Tenisowe tytuly zostaly w puli, wiec tenis moze wystapic, gdy zada go TYTUL.
const SPORT_HOBBY_MODE = `
Sport & hobby category mode: build the artwork strictly around the subject named in the title. Do not substitute a different, more familiar sport.

Equipment and place, not competition: one hero object or one empty sporting place, treated as calm editorial still-life.

Popular sports (only if the title names one): football on grass, basketball on court, volleyball net, cycling, running shoes on track, swimming goggles, golf club, ski poles, surfboard, skateboard, climbing rope, boxing gloves, ice hockey stick, archery target.

Hobbies (calm editorial still-life or lifestyle, no logos): open book, chess board, film camera, hiking boots on trail, fishing rod by water, knitting yarn, paint palette, acoustic guitar, camping tent, gardening gloves with herbs, pottery wheel, binoculars, telescope, vinyl record player without labels.

Forbidden: club logos, famous brands, jersey numbers and text, stadium signage, advertising, match action with identifiable players, medals or trophies of real competitions.
`.trim();

module.exports = {
  buildCoffeeTeaPhotographyPrompt,
  buildKitchenFoodPhotographyPrompt,
  buildArchitecturePhotographyPrompt,
  buildSeaBeachPhotographyPrompt,
  SPORT_HOBBY_MODE,
};
