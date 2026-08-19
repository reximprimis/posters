#!/usr/bin/env node
/**
 * Minimalizm ma dwa warianty i nie wolno ich mieszac:
 *
 *  - pejzazowy: nature-landscapes, sea-coast, mountains-hiking,
 *  - przedmiotowy: cala reszta (koktajl, zwierze, hantel, perfumy...).
 *
 * Test przechodzi po WSZYSTKICH parach kategoria x styl i pilnuje, ze:
 *  1. zaden prompt spoza trojki pejzazowej nie dostaje blokow krajobrazowych,
 *  2. zaden prompt przedmiotowy nie zakazuje zwierzat ani przedmiotow,
 *  3. tytul nastrojowy ("Whiskey Amber Glow") nie przelacza wariantu,
 *  4. slowo pejzazowe w tytule ("Ocean Breeze Fizz") tez go nie przelacza,
 *  5. trojka pejzazowa nadal dostaje bloki krajobrazowe.
 */

const { getBuiltInCategoryStylePairs } = require('../src/categoryStyles');
const { routePromptBuilder, getRoutingPathLabel } = require('../src/promptRouter');
const {
  MINIMALISM_LANDSCAPE_CATEGORIES,
  resolveMinimalismMode,
} = require('../src/minimalismSubject');
const { CATEGORY_TITLE_POOLS } = require('../src/categoryTitlePools');

const LANDSCAPE_MARKERS = [
  'MINIMAL LANDSCAPE',
  'Minimalist landscape artwork',
  'The main landscape structure should occupy',
  'The horizon and any reflection should feel calm',
];

// Zakaz, ktory wycinal temat wiekszosci kategorii: szklanke, trabke, zyrafe.
const SUBJECT_KILLING_RESTRICTION = 'No people, buildings, boats, animals, roads, signs, or modern elements.';

const TITLES = {
  'bar-cocktails': ['Whiskey Amber Glow', 'Ocean Breeze Fizz', 'Copper Shaker Still'],
  'animals': ['Gentle Giraffe Portrait', 'Misty Forest Fox'],
  'music-sound': ['Jazz Trumpet Brass'],
  'kitchen-food': ['Tomato Vine Rustic'],
  'fitness-gym': ['Boxing Gloves Hanging'],
  'mountains-hiking': ['Silent Summit Dawn', 'Alpine Hut Evening'],
  'nature-landscapes': ['Quiet Lake Reflection'],
  'sea-coast': ['Soft Shore Horizon'],
};

const DEFAULT_TITLES = ['Amber Velvet Hour', 'Golden Ocean Whisper', 'Quiet Copper Form'];

function titlesFor(category) {
  // Prawdziwa pula kategorii, a nie tylko tytuly wymyslone na potrzeby testu —
  // to w niej siedza rekwizyty typu "Mountain Hut Dusk".
  const pool = Array.isArray(CATEGORY_TITLE_POOLS[category]) ? CATEGORY_TITLE_POOLS[category] : [];
  return [...new Set([...(TITLES[category] || []), ...pool, ...DEFAULT_TITLES])];
}

const silent = { log: console.log, warn: console.warn };
function quiet(fn) {
  console.log = () => {};
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.log = silent.log;
    console.warn = silent.warn;
  }
}

const failures = [];
let checked = 0;

for (const { category, style } of getBuiltInCategoryStylePairs()) {
  const landscapeCategory = MINIMALISM_LANDSCAPE_CATEGORIES.has(category);
  const routing = quiet(() => getRoutingPathLabel(category, style));

  for (const title of titlesFor(category)) {
    let prompt;
    try {
      prompt = quiet(() => routePromptBuilder({ category, style, title }));
    } catch (e) {
      failures.push(`${category} + ${style} / "${title}": builder threw — ${e.message}`);
      continue;
    }
    checked += 1;

    const wantsLandscape =
      landscapeCategory &&
      style === 'Minimalism' &&
      resolveMinimalismMode(title, category) === 'minimalism_landscape';
    const marker = LANDSCAPE_MARKERS.find((m) => prompt.includes(m));

    if (!wantsLandscape && marker) {
      failures.push(
        `${category} + ${style} / "${title}" [${routing}]: blok pejzazowy w promptcie nie-pejzazowym (${marker})`
      );
    }
    if (!wantsLandscape && prompt.includes(SUBJECT_KILLING_RESTRICTION)) {
      failures.push(
        `${category} + ${style} / "${title}" [${routing}]: zakaz zwierzat/przedmiotow poza wariantem pejzazowym`
      );
    }
    if (wantsLandscape && !marker) {
      failures.push(
        `${category} + ${style} / "${title}" [${routing}]: wariant pejzazowy stracil bloki krajobrazowe`
      );
    }
    if (style === 'Minimalism' && !wantsLandscape && !prompt.includes('MINIMAL SUBJECT')) {
      // Kategorie z wlasnym trybem (animals, coffee-tea...) maja swoj safe-framing,
      // wiec brak tego bloku jest dozwolony — sprawdzamy tylko trase generyczna.
      if (routing.startsWith('STYLE_GENERIC') || routing.startsWith('CATEGORY_STYLE_DEDICATED')) {
        if (category !== 'kids-nursery') {
          failures.push(
            `${category} + ${style} / "${title}" [${routing}]: brak safe-framingu MINIMAL SUBJECT`
          );
        }
      }
    }
  }
}

// Regresja wprost z raportu: te cztery plakaty powstaly WBREW promptowi.
const REGRESSION = [
  ['bar-cocktails', 'Minimalism', 'Whiskey Amber Glow', 'glass'],
  ['animals', 'Minimalism', 'Gentle Giraffe Portrait', 'animal'],
  ['music-sound', 'Minimalism', 'Jazz Trumpet Brass', 'instrument'],
  ['fitness-gym', 'Minimalism', 'Boxing Gloves Hanging', 'object'],
];
for (const [category, style, title] of REGRESSION) {
  const prompt = quiet(() => routePromptBuilder({ category, style, title }));
  if (prompt.includes(SUBJECT_KILLING_RESTRICTION) || LANDSCAPE_MARKERS.some((m) => prompt.includes(m))) {
    failures.push(`REGRESJA: ${category} + ${style} / "${title}" nadal dostaje prompt pejzazowy`);
  }
}

// Pule tytulow kategorii pejzazowych zawieraja rekwizyty (hut, boots, rope,
// lighthouse, sailboat). Restrykcje krajobrazowe zakazuja budynkow i lodzi,
// wiec takie tytuly musza isc wariantem przedmiotowym.
const POOL_EXPECTATIONS = {
  'mountains-hiking': {
    'Mountain Hut Dusk': 'minimalism_object',
    'Hiking Boots Rest': 'minimalism_object',
    'Rope And Carabiner': 'minimalism_object',
    'Trail Marker Post': 'minimalism_object',
    'Summit Cairn Stone': 'minimalism_object',
    'Alpine Ridge Morning': 'minimalism_landscape',
    'Glacier Tongue Ice': 'minimalism_landscape',
  },
  'sea-coast': {
    'Lighthouse Coast Mist': 'minimalism_object',
    'Sailboat Horizon Line': 'minimalism_object',
    'Seashell Sand Still': 'minimalism_object',
    'Harbor Buoy Morning': 'minimalism_object',
    'Calm Wave Shoreline': 'minimalism_landscape',
    'Coastal Cliff Fog': 'minimalism_landscape',
  },
  'nature-landscapes': {
    'Misty Mountain Peak': 'minimalism_landscape',
    'Lake Reflection Calm': 'minimalism_landscape',
    'Wheat Field Breeze': 'minimalism_landscape',
  },
};

for (const [category, expectations] of Object.entries(POOL_EXPECTATIONS)) {
  const pool = CATEGORY_TITLE_POOLS[category] || [];
  for (const [title, expectedMode] of Object.entries(expectations)) {
    if (!pool.includes(title)) {
      failures.push(`Pula ${category} nie zawiera juz tytulu "${title}" — zaktualizuj test`);
      continue;
    }
    const mode = resolveMinimalismMode(title, category);
    if (mode !== expectedMode) {
      failures.push(`${category} / "${title}": wariant ${mode}, oczekiwano ${expectedMode}`);
    }
  }
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} problemow na ${checked} sprawdzonych promptach:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`OK: ${checked} promptow sprawdzonych, ${getBuiltInCategoryStylePairs().length} par kategoria x styl.`);
console.log(`Wariant pejzazowy: ${[...MINIMALISM_LANDSCAPE_CATEGORIES].join(', ')} (tylko Minimalism).`);
