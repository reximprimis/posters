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
  'botanical',
  'abstract',
  'nature-landscapes',
  'animals',
  'cities-travel',
  'kids-nursery',
  'space-astronomy',
  'retro-vintage',
  'vehicles',
  'coffee-tea',
  'kitchen-food',
  'architecture',
  'sea-coast',
  'sports-hobbies',
  'gaming-esports',
  'ai-technology',
  'humor-memes',
  'cyberpunk-neon',
  'music-sound',
  'wellness-yoga',
  'symbols-sacred-geometry',
  // Osiem kategorii dolozonych po przegladzie konkurencji (Galerix, Desenio,
  // Poster Store, wall-being) pod glowny rynek sklepu, czyli Niemcy.
  'typography-quotes',
  'mountains-hiking',
  'line-art-figures',
  'bar-cocktails',
  'zodiac-astrology',
  'fitness-gym',
  'fashion-beauty',
  'love-romance',
  // Kategoria lokalna, zamknieta na rynek polski — patrz markets w taxonomy.js.
  'club-orzel',
  // Uwaga: to TEMATY, nie estetyki. Japandi, boho czy wabi-sabi to paleta
  // i nastroj — mieszkaja w src/aesthetics.js, nie tutaj.
];

/** What is on the poster — generator categories only. */
const CATEGORY_DESCRIPTIONS = {
  // Poszerzone o dawna kategorie "Grzyby i las": grzyby i runo to botanika,
  // a nie osobny temat.
  'botanical':
    'botanical plants, flowers, branches, leaves, organic forms, delicate botanical compositions',
  'abstract':
    'nonfigurative compositions, shapes, color, texture, geometry, emotional visual arrangements',
  'nature-landscapes':
    'mountains, forests, lakes, rivers, fields, hills, mist, natural landscapes',
  'animals': 'pets, wildlife, birds, dogs, cats, horses, wild animals',
  'cities-travel':
    'cities, skylines, urbanism, maps, topography, streets, urban architecture; also travel landmarks and destinations — national park vistas, canyons, alpine peaks, desert arches, coastal cliffs, torii gates, pagodas, zen gardens — in retro travel-poster graphic language, never with lettering',
  'kids-nursery':
    'Boho-Scandi nursery art: soft watercolor animals, boho rainbows, moon and stars, muted earthy pastels on cream — calm modern nursery, not cartoon clipart',
  'space-astronomy': 'planets, moon, stars, galaxies, nebulae, astronomy, cosmic landscapes',
  'retro-vintage': 'vintage, analog, old photos, polaroid, cassettes, cameras, sepia, nostalgia',
  'vehicles': 'cars, motorcycles, aircraft, boats, classic vehicles, engineered transport forms',
  'coffee-tea':
    'espresso, cups, tea, café mood, slow morning, coffee ritual, tea leaves, teapot',
  'kitchen-food':
    'fruit, vegetables, spices, bread, olive oil, pasta, lemons, Mediterranean kitchen',
  'architecture':
    'buildings, facades, stairs, columns, modernism, brutalism, arches, architectural details',
  'sea-coast': 'sea, waves, beach, dunes, shells, lighthouses, calm coastal landscapes',
  // Tenis swiadomie NIE wymieniony: model lgnal do niego, gdy tylko pojawial sie
  // w opisie. Tenisowe tytuly nadal sa w puli, wiec moga wystapic — ale wtedy
  // decyduje tytul, a nie sugestia z opisu kategorii.
  'sports-hobbies':
    'cycling, running, swimming, football, basketball, volleyball, golf, skiing, surfing, climbing, boxing, ice hockey, archery, plus hobbies: books, chess, camera, hiking, fishing, guitar, gardening, camping, pottery, knitting, birdwatching',
  'gaming-esports':
    'gaming room, retro arcade, controllers without logos, neon gaming mood, e-sport energy, player setup, futuristic light',
  'ai-technology':
    'artificial intelligence, neural networks, futuristic forms, data, robotics, technology, cyber minimalism',
  'humor-memes':
    'funny visual situations, irony, absurd humor, light meme mood without text or known characters',
  'cyberpunk-neon':
    'neon light, futuristic city, night, technology, rain, abstract cyber forms',
  'music-sound':
    'instruments, blank vinyl without labels, sound waves, studio, jazz, guitar, piano, analog mood',
  'wellness-yoga':
    'yoga, meditation, calm lifestyle, breath, balance, spa, slow living, soft morning, organic forms, quiet wellness',
  'symbols-sacred-geometry':
    'sacred geometry drawn with compass precision: mandalas, Sri Yantra, Flower of Life, Metatron cube, Tree of Life, chakra diagrams, Enso circle, lotus, moon phases, Celtic knot, yin-yang, Om — symmetrical ritual diagrams rendered as fine-art prints, exact and architectural rather than misty',
  'typography-quotes':
    'short typographic statements, single words, hand-lettered phrases, quote layouts, letterform studies, editorial type composition — the words ARE the artwork, set with real typographic craft rather than decoration',
  'mountains-hiking':
    'alpine peaks, ridgelines, mountain huts, hiking trails, summit panoramas, glaciers, high-altitude weather, boots and rope as quiet props — the mountains of the Alps and northern Europe rather than generic scenery',
  'line-art-figures':
    'single continuous-line human forms, abstract faces, hands, torsos and couples reduced to contour, one confident unbroken stroke, generous empty space — anatomy suggested, never explicit',
  'bar-cocktails':
    'cocktails, coupe and highball glasses, shakers, citrus twists, ice, spirits bottles without brands, beer and brewing, bar counter still life in warm evening light',
  'zodiac-astrology':
    'zodiac signs and their constellations, celestial charts, sun and moon symbolism, astrological wheels, star maps drawn as ornamental diagrams rather than astronomy',
  'fitness-gym':
    'dumbbells, barbells, kettlebells, running form, boxing gloves, gym interiors, athletic silhouettes in motion, disciplined training mood — equipment and movement, never brand logos or real athletes',
  'fashion-beauty':
    'perfume bottles, lipstick, heels, handbags, fashion illustration figures, fabric folds, dressing-table still life — elegant editorial styling with no readable brand names',
  'club-orzel':
    'Orzel Myslakowice football club: the club crest as the hero element, stadium under floodlights, football on grass, goal net, corner flag, club scarf, terrace atmosphere — green and gold club colours throughout, community pride of a small-town club',
  'love-romance':
    'couples in embrace, intertwined hands, hearts used sparingly, shared everyday intimacy, anniversary and togetherness motifs — warm and tender rather than sentimental',
};

const CATEGORY_STYLES = {
  'botanical': ['Photography', 'Minimalism', 'Line art', 'Illustration'],
  'abstract': ['Abstract', 'Minimalism'],
  'nature-landscapes': ['Photography', 'Minimalism'],
  'animals': ['Photography', 'Illustration', 'Line art', 'Minimalism'],
  'cities-travel': ['Photography', 'Minimalism', 'Abstract', 'Illustration', 'Line art'],
  'kids-nursery': ['Illustration', 'Minimalism'],
  'space-astronomy': ['Abstract', 'Illustration', 'Photography'],
  'retro-vintage': ['Photography', 'Abstract'],
  'vehicles': ['Photography', 'Illustration', 'Minimalism', 'Line art'],
  'coffee-tea': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  'kitchen-food': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  'architecture': ['Photography', 'Minimalism', 'Abstract', 'Line art'],
  'sea-coast': ['Photography', 'Minimalism', 'Abstract', 'Illustration'],
  'sports-hobbies': ['Photography', 'Illustration', 'Minimalism', 'Line art'],
  'gaming-esports': ['Illustration', 'Minimalism', 'Abstract', 'Line art'],
  'ai-technology': ['Abstract', 'Minimalism', 'Illustration', 'Line art'],
  'humor-memes': ['Illustration', 'Minimalism', 'Line art'],
  'cyberpunk-neon': ['Abstract', 'Illustration', 'Minimalism'],
  'music-sound': ['Photography', 'Minimalism', 'Abstract', 'Line art'],
  'wellness-yoga': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  'symbols-sacred-geometry': ['Minimalism', 'Abstract', 'Illustration', 'Line art'],
  'typography-quotes': ['Minimalism', 'Abstract', 'Line art'],
  'mountains-hiking': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  'line-art-figures': ['Line art', 'Minimalism', 'Abstract'],
  'bar-cocktails': ['Photography', 'Illustration', 'Minimalism', 'Line art'],
  'zodiac-astrology': ['Illustration', 'Minimalism', 'Line art', 'Abstract'],
  'fitness-gym': ['Photography', 'Minimalism', 'Line art', 'Illustration'],
  'fashion-beauty': ['Illustration', 'Photography', 'Line art', 'Minimalism'],
  'love-romance': ['Line art', 'Minimalism', 'Illustration', 'Abstract'],
  'club-orzel': ['Illustration', 'Photography', 'Minimalism'],
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
  'botanical': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura', 'Do jadalni', 'Do kuchni', 'Do pokoju dziecka'],
  'abstract': ['Do salonu', 'Do sypialni', 'Do biura', 'Do gabinetu'],
  'nature-landscapes': ['Do salonu', 'Do sypialni', 'Do biura', 'Do gabinetu'],
  'animals': ['Do salonu', 'Do pokoju dziecka', 'Do pokoju młodzieżowego'],
  'cities-travel': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego', 'Do sypialni', 'Do łazienki'],
  'kids-nursery': ['Do pokoju dziecka'],
  'space-astronomy': ['Do pokoju dziecka', 'Do pokoju młodzieżowego', 'Do biura', 'Do gabinetu'],
  'retro-vintage': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do kawiarni', 'Do pokoju młodzieżowego'],
  'vehicles': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego'],
  'coffee-tea': ['Do kuchni', 'Do jadalni', 'Do kawiarni', 'Do biura'],
  'kitchen-food': ['Do kuchni', 'Do jadalni', 'Do kawiarni'],
  'architecture': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego'],
  'sea-coast': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura'],
  'sports-hobbies': ['Do salonu', 'Do biura', 'Do pokoju młodzieżowego', 'Do gabinetu'],
  'gaming-esports': ['Do pokoju młodzieżowego', 'Do biura', 'Do gabinetu', 'Do salonu'],
  'ai-technology': ['Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego', 'Do salonu'],
  'humor-memes': ['Do pokoju młodzieżowego', 'Do biura', 'Do salonu'],
  'cyberpunk-neon': ['Do pokoju młodzieżowego', 'Do biura', 'Do gabinetu', 'Do salonu'],
  'music-sound': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do pokoju młodzieżowego', 'Do kawiarni'],
  'wellness-yoga': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do biura', 'Do gabinetu'],
  'symbols-sacred-geometry': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do gabinetu', 'Do pokoju młodzieżowego'],
  'typography-quotes': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do kuchni', 'Do pokoju młodzieżowego'],
  'mountains-hiking': ['Do salonu', 'Do biura', 'Do gabinetu', 'Do sypialni', 'Do pokoju młodzieżowego'],
  'line-art-figures': ['Do salonu', 'Do sypialni', 'Do łazienki', 'Do gabinetu'],
  'bar-cocktails': ['Do kuchni', 'Do jadalni', 'Do salonu', 'Do kawiarni'],
  'zodiac-astrology': ['Do sypialni', 'Do salonu', 'Do gabinetu', 'Do pokoju młodzieżowego'],
  'fitness-gym': ['Do biura', 'Do pokoju młodzieżowego', 'Do salonu'],
  'fashion-beauty': ['Do sypialni', 'Do łazienki', 'Do salonu', 'Do gabinetu'],
  'love-romance': ['Do sypialni', 'Do salonu'],
  'club-orzel': ['Do pokoju młodzieżowego', 'Do salonu', 'Do biura', 'Do kawiarni'],
};

// 71 par bazowych + 3 dolozone przy scaleniu (cities-travel dostalo Illustration
// i Line art, botanical — Illustration). Poprzednie 83 zawieralo 12 par z trzech
// kategorii dodanych 2026-08-03, ktore zostaly scalone: Japonia i "Podroze
// i plakaty vintage" w cities-travel, "Grzyby i las" w botanical.
const EXPECTED_ALLOWED_COMBINATIONS = 107;

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
