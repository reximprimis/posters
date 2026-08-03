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
    'Boho-Scandi nursery art: soft watercolor animals, boho rainbows, moon and stars, muted earthy pastels on cream — calm modern nursery, not cartoon clipart',
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
  'Sport i hobby':
    'football, basketball, volleyball, tennis, cycling, running, swimming, golf, skiing, surfing, plus hobbies: books, chess, camera, hiking, fishing, guitar, gardening, camping',
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

/**
 * KATEGORIE UZYTKOWNIKA (opcja C — poziom roboczy).
 *
 * Wbudowane kategorie maja dedykowane buildery promptow i sa niezmienne.
 * Kategorie dodane z panelu dzialaja od razu, ale na promptcie generycznym —
 * ich poziom jest jawnie oznaczony w UI, zeby nikt sie nie oszukal co do jakosci.
 *
 * Wczytujemy je tutaj, a nie w preview.js, bo dzieki temu KAZDE wejscie do
 * systemu (serwer, CLI `node index.js`, skrypty) widzi ten sam zestaw kategorii.
 * Inaczej batch z terminala nie znalby kategorii dodanej w przegladarce.
 */
const USER_CATEGORIES = new Map();

function loadUserCategories() {
  USER_CATEGORIES.clear();
  try {
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.resolve(__dirname, '..', 'user_settings.json');
    if (!fs.existsSync(settingsPath)) return;
    const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const extras = Array.isArray(raw && raw.extraCategories) ? raw.extraCategories : [];
    for (const ec of extras) {
      const name = String((ec && ec.name) || '').trim();
      if (!name || Object.prototype.hasOwnProperty.call(CATEGORY_STYLES, name)) continue;
      const styles = (Array.isArray(ec.styles) ? ec.styles : []).filter((s) => GLOBAL_STYLES.includes(s));
      USER_CATEGORIES.set(name, {
        name,
        description: String(ec.hint || '').trim(),
        // Bez wyboru stylow kategoria byla martwa — domyslnie dajemy bezpieczny zestaw.
        styles: styles.length ? styles : ['Photography', 'Minimalism'],
      });
    }
  } catch (_) {
    // Uszkodzony user_settings.json nie moze wywalic calego generatora.
  }
}

loadUserCategories();

/** Po dodaniu lub usunieciu kategorii w panelu. */
function reloadUserCategories() {
  loadUserCategories();
  return USER_CATEGORIES.size;
}

function isUserCategory(category) {
  return USER_CATEGORIES.has(String(category || '').trim());
}

function listUserCategories() {
  return [...USER_CATEGORIES.values()].map((c) => ({ ...c, styles: [...c.styles] }));
}

function getAllowedStylesForCategory(category) {
  const key = String(category || '').trim();
  const list = CATEGORY_STYLES[key] || (USER_CATEGORIES.get(key) || {}).styles;
  if (!Array.isArray(list)) return [];
  return list.filter((s) => GLOBAL_STYLES.includes(s));
}

function isKnownCategory(category) {
  const key = String(category || '').trim();
  return Object.prototype.hasOwnProperty.call(CATEGORY_STYLES, key) || USER_CATEGORIES.has(key);
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

/** Pary wbudowane — stala liczba, pilnowana walidacja. */
function getBuiltInCategoryStylePairs() {
  return Object.entries(CATEGORY_STYLES).flatMap(([category, styles]) =>
    (Array.isArray(styles) ? styles : []).map((style) => ({ category, style, builtIn: true }))
  );
}

function getAllAllowedCategoryStylePairs() {
  const userPairs = [...USER_CATEGORIES.values()].flatMap((c) =>
    c.styles.map((style) => ({ category: c.name, style, builtIn: false }))
  );
  return [...getBuiltInCategoryStylePairs(), ...userPairs];
}

function validateAllowedPairsCount(expected = EXPECTED_ALLOWED_COMBINATIONS) {
  // Liczymy WYLACZNIE pary wbudowane — kategorie uzytkownika sa zmienne
  // i nie moga wywalac startu aplikacji przy zmianie ich liczby.
  const actual = getBuiltInCategoryStylePairs().length;
  if (actual !== expected) {
    throw new Error(
      `CATEGORY_STYLES mismatch. Expected ${expected} allowed combinations, got ${actual}.`
    );
  }
  const userCount = USER_CATEGORIES.size;
  console.log(
    `✓ CATEGORY_STYLES validation OK: ${actual} allowed combinations` +
      (userCount ? ` (+ ${userCount} kategorii użytkownika)` : '')
  );
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
  const key = String(category || '').trim();
  if (CATEGORY_DESCRIPTIONS[key]) return CATEGORY_DESCRIPTIONS[key];
  // Podpowiedz podana przy dodawaniu kategorii trafia realnie do promptu —
  // wczesniej byla zbierana w UI i nigdzie nieuzywana.
  const user = USER_CATEGORIES.get(key);
  return user ? user.description : '';
}

function buildCategoriesConfigObject() {
  const out = {};
  for (const cat of CATEGORIES) {
    out[cat] = getCategoryDescription(cat);
  }
  for (const c of USER_CATEGORIES.values()) {
    out[c.name] = c.description;
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
  isUserCategory,
  listUserCategories,
  reloadUserCategories,
  getBuiltInCategoryStylePairs,
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
