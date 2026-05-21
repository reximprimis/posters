/**
 * Generator taxonomy (single source of truth):
 * - CATEGORY = what is on the poster (subject)
 * - STYLE = how it looks (execution)
 * - ROOM_COLLECTION = where the buyer may hang it (sales tags only, not folders)
 */

const GLOBAL_STYLES = [
  'Photography',
  'Minimalism',
  'Abstract',
  'Illustration',
  'Line art',
];

const CATEGORIES = [
  'Botanika',
  'Abstrakcja',
  'Natura i krajobrazy',
  'Zwierzęta',
  'Mapy i miasta',
  'Plakaty dla dzieci',
  'Kosmos i astronomia',
  'Retro',
  'Pojazdy',
  'Kawa i herbata',
  'Kuchnia i jedzenie',
  'Architektura',
  'Morze i plaża',
  'Sport i hobby',
  'Gaming i e-sport',
  'AI i technologia',
  'Humor i memy',
  'Cyberpunk i neon',
  'Muzyka i dźwięk',
  'Wellness i joga',
  'Symbole i harmonia',
];

/** What is on the poster — generator categories only. */
const CATEGORY_DESCRIPTIONS = {
  Botanika:
    'botanical plants, flowers, branches, leaves, organic forms, delicate botanical compositions',
  Abstrakcja:
    'nonfigurative compositions, shapes, color, texture, geometry, emotional visual arrangements',
  'Natura i krajobrazy':
    'mountains, forests, lakes, rivers, fields, hills, mist, natural landscapes',
  Zwierzęta: 'pets, wildlife, birds, dogs, cats, horses, wild animals',
  'Mapy i miasta': 'cities, skylines, urbanism, maps, topography, streets, urban architecture',
  'Plakaty dla dzieci':
    'gentle child-friendly illustrations, fairy-tale motifs, animals, clouds, moon, neutral nursery art',
  'Kosmos i astronomia': 'planets, moon, stars, galaxies, nebulae, astronomy, cosmic landscapes',
  Retro: 'vintage, analog, old photos, polaroid, cassettes, cameras, sepia, nostalgia',
  Pojazdy: 'cars, motorcycles, aircraft, boats, classic vehicles, engineered transport forms',
  'Kawa i herbata':
    'espresso, cups, tea, café mood, slow morning, coffee ritual, tea leaves, teapot',
  'Kuchnia i jedzenie':
    'fruit, vegetables, spices, bread, olive oil, pasta, lemons, Mediterranean kitchen',
  Architektura:
    'buildings, facades, stairs, columns, modernism, brutalism, arches, architectural details',
  'Morze i plaża': 'sea, waves, beach, dunes, shells, lighthouses, calm coastal landscapes',
  'Sport i hobby': 'sport, tennis, cycling, skiing, surfing, running, golf, active lifestyle hobbies',
  'Gaming i e-sport':
    'gaming room, retro arcade, controllers without logos, neon gaming mood, e-sport energy, player setup, futuristic light',
  'AI i technologia':
    'artificial intelligence, neural networks, futuristic forms, data, robotics, technology, cyber minimalism',
  'Humor i memy':
    'funny visual situations, irony, absurd humor, light meme mood without text or known characters',
  'Cyberpunk i neon':
    'neon light, futuristic city, night, technology, rain, abstract cyber forms',
  'Muzyka i dźwięk':
    'instruments, blank vinyl without labels, sound waves, studio, jazz, guitar, piano, analog mood',
  'Wellness i joga':
    'yoga, meditation, calm lifestyle, breath, balance, spa, slow living, soft morning, organic forms, quiet wellness',
  'Symbole i harmonia':
    'yin-yang, mandalas, balance, energy, zen, organic geometry, spiritual symbols in neutral aesthetic framing',
};

const CATEGORY_STYLES = {
  Botanika: ['Photography', 'Minimalism', 'Line art'],
  Abstrakcja: ['Abstract', 'Minimalism'],
  'Natura i krajobrazy': ['Photography', 'Minimalism'],
  Zwierzęta: ['Photography', 'Illustration', 'Line art', 'Minimalism'],
  'Mapy i miasta': ['Photography', 'Minimalism', 'Abstract'],
  'Plakaty dla dzieci': ['Illustration', 'Minimalism'],
  'Kosmos i astronomia': ['Abstract', 'Illustration', 'Photography'],
  Retro: ['Photography', 'Abstract'],
  Pojazdy: ['Photography', 'Illustration', 'Minimalism', 'Line art'],
  'Kawa i herbata': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  'Kuchnia i jedzenie': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  Architektura: ['Photography', 'Minimalism', 'Abstract', 'Line art'],
  'Morze i plaża': ['Photography', 'Minimalism', 'Abstract', 'Illustration'],
  'Sport i hobby': ['Photography', 'Illustration', 'Minimalism', 'Line art'],
  'Gaming i e-sport': ['Illustration', 'Minimalism', 'Abstract', 'Line art'],
  'AI i technologia': ['Abstract', 'Minimalism', 'Illustration', 'Line art'],
  'Humor i memy': ['Illustration', 'Minimalism', 'Line art'],
  'Cyberpunk i neon': ['Abstract', 'Illustration', 'Minimalism'],
  'Muzyka i dźwięk': ['Photography', 'Minimalism', 'Abstract', 'Line art'],
  'Wellness i joga': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  'Symbole i harmonia': ['Minimalism', 'Abstract', 'Illustration', 'Line art'],
};

/** Sales / room collections — tags only, never generator categories or output folders. */
const ROOM_COLLECTIONS = [
  'Do salonu',
  'Do kuchni',
  'Do sypialni',
  'Do pokoju dziecka',
  'Do biura',
  'Do łazienki',
  'Do kawiarni',
  'Do gabinetu',
  'Do jadalni',
  'Do pokoju młodzieżowego',
];

const CATEGORY_ROOM_COLLECTIONS = {
  Botanika: ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura', 'Do jadalni'],
  Abstrakcja: ['Do salonu', 'Do sypialni', 'Do biura', 'Do gabinetu'],
  'Natura i krajobrazy': ['Do salonu', 'Do sypialni', 'Do biura', 'Do gabinetu'],
  Zwierzęta: ['Do salonu', 'Do pokoju dziecka', 'Do pokoju młodzieżowego'],
  'Mapy i miasta': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego'],
  'Plakaty dla dzieci': ['Do pokoju dziecka'],
  'Kosmos i astronomia': ['Do pokoju dziecka', 'Do pokoju młodzieżowego', 'Do biura', 'Do gabinetu'],
  Retro: ['Do salonu', 'Do biura', 'Do gabinetu', 'Do kawiarni', 'Do pokoju młodzieżowego'],
  Pojazdy: ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego'],
  'Kawa i herbata': ['Do kuchni', 'Do jadalni', 'Do kawiarni', 'Do biura'],
  'Kuchnia i jedzenie': ['Do kuchni', 'Do jadalni', 'Do kawiarni'],
  Architektura: ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego'],
  'Morze i plaża': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura'],
  'Sport i hobby': ['Do salonu', 'Do biura', 'Do pokoju młodzieżowego', 'Do gabinetu'],
  'Gaming i e-sport': ['Do pokoju młodzieżowego', 'Do biura', 'Do gabinetu', 'Do salonu'],
  'AI i technologia': ['Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego', 'Do salonu'],
  'Humor i memy': ['Do pokoju młodzieżowego', 'Do biura', 'Do salonu'],
  'Cyberpunk i neon': ['Do pokoju młodzieżowego', 'Do biura', 'Do gabinetu', 'Do salonu'],
  'Muzyka i dźwięk': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego', 'Do kawiarni'],
  'Wellness i joga': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura', 'Do gabinetu'],
  'Symbole i harmonia': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do gabinetu', 'Do pokoju młodzieżowego'],
};

const EXPECTED_ALLOWED_COMBINATIONS = 71;

function getAllowedStylesForCategory(category) {
  const key = String(category || '').trim();
  const list = CATEGORY_STYLES[key];
  if (!Array.isArray(list)) return [];
  return list.filter((s) => GLOBAL_STYLES.includes(s));
}

function isKnownCategory(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_STYLES, String(category || '').trim());
}

function isStyleAllowedForCategory(category, style) {
  return getAllowedStylesForCategory(category).includes(String(style || '').trim());
}

function assertCategoryStyleAllowed(category, style) {
  const cat = String(category || '').trim();
  const st = String(style || '').trim();
  if (!isKnownCategory(cat)) {
    throw new Error(`Unknown category: ${cat}`);
  }
  if (!isStyleAllowedForCategory(cat, st)) {
    throw new Error(
      `Unsupported category/style combination: ${cat} + ${st}. ` +
        `Allowed styles for ${cat}: ${getAllowedStylesForCategory(cat).join(', ')}`
    );
  }
}

function getAllAllowedCategoryStylePairs() {
  return Object.entries(CATEGORY_STYLES).flatMap(([category, styles]) =>
    (Array.isArray(styles) ? styles : []).map((style) => ({ category, style }))
  );
}

function validateAllowedPairsCount(expected = EXPECTED_ALLOWED_COMBINATIONS) {
  const actual = getAllAllowedCategoryStylePairs().length;
  if (actual !== expected) {
    throw new Error(
      `CATEGORY_STYLES mismatch. Expected ${expected} allowed combinations, got ${actual}.`
    );
  }
  console.log(`✓ CATEGORY_STYLES validation OK: ${actual} allowed combinations`);
}

function assertExpectedCombinationCount(expected = EXPECTED_ALLOWED_COMBINATIONS) {
  validateAllowedPairsCount(expected);
}

function getBatchStyles(category, selectedStyleMode, selectedStyle) {
  const allowedStyles = getAllowedStylesForCategory(category);
  if (!allowedStyles.length) {
    throw new Error(`Unknown category: ${category}`);
  }
  const mode = String(selectedStyleMode || 'fixed').toLowerCase();
  if (mode === 'all') {
    return [...allowedStyles];
  }
  const style = String(selectedStyle || '').trim();
  assertCategoryStyleAllowed(category, style);
  return [style];
}

function getRoomCollectionsForCategory(category) {
  const key = String(category || '').trim();
  const list = CATEGORY_ROOM_COLLECTIONS[key];
  return Array.isArray(list) ? [...list] : [];
}

function getCategoryDescription(category) {
  return CATEGORY_DESCRIPTIONS[String(category || '').trim()] || '';
}

function buildCategoriesConfigObject() {
  const out = {};
  for (const cat of CATEGORIES) {
    out[cat] = getCategoryDescription(cat);
  }
  return out;
}

validateAllowedPairsCount();

module.exports = {
  GLOBAL_STYLES,
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_STYLES,
  ROOM_COLLECTIONS,
  CATEGORY_ROOM_COLLECTIONS,
  EXPECTED_ALLOWED_COMBINATIONS,
  getAllowedStylesForCategory,
  isKnownCategory,
  isStyleAllowedForCategory,
  assertCategoryStyleAllowed,
  getAllAllowedCategoryStylePairs,
  validateAllowedPairsCount,
  assertExpectedCombinationCount,
  getBatchStyles,
  getRoomCollectionsForCategory,
  getCategoryDescription,
  buildCategoriesConfigObject,
};
