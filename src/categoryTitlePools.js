/**
 * Curated poster titles for every generator category — concrete visual subjects, not slogans.
 */

'use strict';

const { isTennisBiasedTitle } = require('./sportHobbyTitlePool');
const { isGenericChildrenTitle } = require('./childrenTitlePool');

const CATEGORY_TITLE_POOLS = {
  Botanika: [
    'Cherry Blossom Branch',
    'Magnolia Bloom Stem',
    'Wild Flower Bouquet',
    'Peony Petals Soft',
    'Lavender Sprigs Calm',
    'Single Rose Bloom',
    'Cotton Flower Study',
    'Tulip Stem Morning',
    'Delicate Blossom Stem',
    'Spring Branch Buds',
    'Botanical Leaf Detail',
    'Orchid Petal Close',
    'Daisy Chain Meadow',
    'Hydrangea Bloom Soft',
    'Poppy Field Stem',
  ],
  Abstrakcja: [
    'Color Field Harmony',
    'Geometric Balance Study',
    'Organic Flow Forms',
    'Chromatic Layer Drift',
    'Silent Shapes Calm',
    'Textured Earth Tones',
    'Vertical Rhythm Lines',
    'Soft Grid Pattern',
    'Layered Arc Forms',
    'Muted Gradient Field',
    'Tonal Block Study',
    'Curved Form Pulse',
    'Earth Tone Layers',
    'Minimal Shape Dance',
  ],
  'Natura i krajobrazy': [
    'Misty Mountain Peak',
    'Forest Morning Mist',
    'Lake Reflection Calm',
    'Rolling Hill Sunset',
    'River Valley Fog',
    'Alpine Meadow Light',
    'Pine Forest Path',
    'Ocean Cliff Horizon',
    'Wheat Field Breeze',
    'Canyon Layered Rock',
    'Waterfall Mist Gorge',
    'Autumn Forest Trail',
    'Highland Moor Silence',
    'Glacier Lake Still',
  ],
  Zwierzęta: [
    'Golden Retriever Portrait',
    'Wild Horse Meadow',
    'Arctic Fox Snow',
    'Barn Owl Wings',
    'African Elephant Study',
    'Red Panda Branch',
    'Swan on Water',
    'Wolf Forest Silhouette',
    'Flamingo Grace',
    'Highland Cow Mist',
    'Sea Turtle Glide',
    'Hummingbird Hover',
    'Deer in Morning Light',
    'Polar Bear Arctic',
    'Butterfly on Flower',
  ],
  'Mapy i miasta': [
    'Paris Skyline Silhouette',
    'Tokyo Night Grid',
    'London Bridge Mist',
    'Manhattan Dawn Skyline',
    'Venice Canal Soft',
    'Barcelona Facade Study',
    'World Map Watercolor',
    'Urban Grid Abstract',
    'Harbor City Lights',
    'Old Town Street Canyon',
    'Berlin Minimal Skyline',
    'Amsterdam Canal Lines',
    'Sydney Opera Silhouette',
    'Prague Rooftop Dawn',
  ],
  'Plakaty dla dzieci': require('./childrenTitlePool').CHILDREN_TITLE_POOL,
  'Kosmos i astronomia': [
    'Saturn Rings Glow',
    'Milky Way Horizon',
    'Crescent Moon Phase',
    'Nebula Color Cloud',
    'Mars Red Sphere',
    'Star Cluster Night',
    'Lunar Surface Crater',
    'Galaxy Spiral Calm',
    'Aurora Borealis Arc',
    'Planet Earth Rise',
    'Jupiter Storm Bands',
    'Comet Tail Streak',
    'Deep Space Silence',
    'Orion Constellation',
  ],
  Retro: [
    'Polaroid Camera Still',
    'Vinyl Record Stack',
    'Cassette Tape Warm',
    'Vintage Typewriter Desk',
    'Film Camera Chrome',
    'Retro Radio Cabinet',
    'Sepia Bicycle Lane',
    'Analog Clock Face',
    'Old Suitcase Travel',
    'Rotary Phone Cream',
    'Instant Camera Flash',
    'Tape Deck Buttons',
    'Vintage Sunglasses Case',
    'Retro Lamp Glow',
  ],
  Pojazdy: [
    'Classic Porsche Profile',
    'Motorcycle Chrome Line',
    'Vintage Aircraft Wing',
    'Sailboat Harbor Calm',
    'Rally Car Dust Trail',
    'Speedboat Wake Line',
    'Train Locomotive Steam',
    'Sports Car Curve',
    'Jeep Mountain Trail',
    'Yacht Deck Horizon',
    'Convertible Coastal Road',
    'Helicopter Silhouette Sky',
    'Classic Vespa Scooter',
    'Racing Bicycle Lean',
  ],
  'Kawa i herbata': [
    'Morning Espresso Cup',
    'Pour Over Coffee Drip',
    'Matcha Bowl Steam',
    'Tea Leaves Spread',
    'Ceramic Teapot Calm',
    'Cappuccino Foam Soft',
    'Coffee Beans Scatter',
    'Earl Grey Steam',
    'Café Latte Morning',
    'French Press Coffee',
    'Iced Coffee Glass',
    'Chai Spice Steam',
    'Moka Pot Brew',
    'Tea Cup Saucer',
  ],
  'Kuchnia i jedzenie': [
    'Lemon on Linen',
    'Tomato Vine Rustic',
    'Olive Oil Drizzle',
    'Fresh Pasta Nest',
    'Rosemary Herb Bundle',
    'Mediterranean Bread Loaf',
    'Fig and Honey Plate',
    'Avocado Toast Morning',
    'Spice Jar Collection',
    'Pomegranate Seeds Bowl',
    'Basil Pesto Bowl',
    'Saffron Threads Jar',
    'Artichoke Still Life',
    'Mushroom Forest Bundle',
    'Citrus Fruit Bowl',
    'Olive Branch Bowl',
    'Honey Jar Wooden Spoon',
    'Egg Basket Farm',
  ],
  Architektura: [
    'Concrete Brutalist Facade',
    'Spiral Staircase Light',
    'Arched Colonnade',
    'Modern Glass Tower',
    'Brick Archway Shadow',
    'Minimalist Atrium',
    'Bauhaus Window Grid',
    'Cathedral Vault Curve',
    'Urban Bridge Structure',
    'Courtyard Geometry',
    'Art Deco Facade',
    'Brutalist Balcony Grid',
    'Stone Arch Corridor',
  ],
  'Morze i plaża': [
    'Calm Wave Shoreline',
    'Dune Grass Wind',
    'Seashell Sand Still',
    'Lighthouse Coast Mist',
    'Turquoise Lagoon Calm',
    'Driftwood Beach Calm',
    'Coastal Cliff Fog',
    'Starfish Tide Pool',
    'Sailboat Horizon Line',
    'Beach Pebble Pattern',
    'Soft Sand Ripples',
    'Harbor Buoy Morning',
    'Misty Coastal Path',
  ],
  'Sport i hobby': require('./sportHobbyTitlePool').SPORT_HOBBY_TITLE_POOL,
  'Gaming i e-sport': [
    'Neon Controller Glow',
    'Retro Arcade Cabinet',
    'Gaming Headset Setup',
    'Pixel Heart Icon',
    'Cyber Arena Lights',
    'Mechanical Keyboard Mood',
    'Racing Wheel Desk',
    'VR Headset Silhouette',
    'Arcade Joystick Red',
    'Esports Arena Beam',
    'Neon Gaming Desk',
    'Retro Game Cartridge',
  ],
  'AI i technologia': [
    'Neural Network Mesh',
    'Data Stream Lines',
    'Robot Hand Grace',
    'Circuit Board Pattern',
    'Futuristic Chip Glow',
    'Digital Brain Nodes',
    'Hologram Grid Light',
    'Quantum Wave Form',
    'Server Rack Blue',
    'AI Chip Abstract',
    'Fiber Optic Pulse',
    'Binary Flow Field',
  ],
  'Humor i memy': [
    'Cat in Cardboard Box',
    'Dog with Glasses',
    'Llama Drama Face',
    'Penguin Waddle Walk',
    'Capybara Chill Pond',
    'Shiba Inu Smile',
    'Bear Coffee Morning',
    'Frog on Lily Pad',
    'Goose Chase Scene',
    'Owl Reading Book',
    'Raccoon Trash Can',
    'Sloth Hanging Branch',
  ],
  'Cyberpunk i neon': [
    'Neon Alley Rain',
    'Cyber City Night',
    'Holographic Billboard',
    'Rainy Street Pink',
    'Futuristic Motorcycle Neon',
    'Tokyo Neon Crosswalk',
    'Glitch Skyline Purple',
    'Laser Grid Tunnel',
    'Chrome Mask Portrait',
    'Neon Sign Reflection',
    'Cyber Rain Umbrella',
    'Electric Skyline Blue',
  ],
  'Muzyka i dźwięk': [
    'Acoustic Guitar Wood',
    'Vinyl Record Spin',
    'Piano Keys Close',
    'Jazz Trumpet Brass',
    'Drum Kit Stage',
    'Microphone Studio',
    'Saxophone Golden Light',
    'Headphones on Vinyl',
    'Violin Scroll Detail',
    'Cassette Mixtape Mood',
    'Electric Bass Curve',
    'Turntable Needle Drop',
  ],
  'Wellness i joga': [
    'Yoga Mat Morning',
    'Meditation Cushion Calm',
    'Spa Stones Stack',
    'Linen Towel Fold',
    'Herbal Tea Ritual',
    'Lotus Pose Silhouette',
    'Essential Oil Drop',
    'Bamboo Forest Zen',
    'Candle and Crystals',
    'Breath and Light',
    'Morning Stretch Calm',
    'Salt Lamp Glow',
  ],
  'Symbole i harmonia': [
    'Yin Yang Balance',
    'Mandala Geometry',
    'Lotus Flower Zen',
    'Sacred Geometry Gold',
    'Moon Phase Cycle',
    'Tree of Life Line',
    'Zen Enso Circle',
    'Celtic Knot Soft',
    'Om Symbol Calm',
    'Flower of Life Grid',
    'Chakra Color Wheel',
    'Sun Moon Balance',
  ],
};

/** Slogan patterns that produce vague non-visual titles per category. */
const GLOBAL_GENERIC_PATTERNS =
  /\b(symphony|whispers of|serenity alone|dreams$|magic moments|vibes$|bliss$|wonder$|odyssey$)\b/i;

const CATEGORY_GENERIC_PATTERNS = {
  'Plakaty dla dzieci': /\b(happy times|fun adventure|colorful dreams|play zone|joy ride)\b/i,
  'Sport i hobby': /\b(go team|game day|champion|victory vibes|athletic spirit)\b/i,
  Botanika: /\b(green vibes|plant love|nature's art|botanical beauty)\b/i,
  Abstrakcja: /\b(abstract balance|color pulse alone)\b/i,
};

function normalizeTitleKey(title) {
  return String(title || '').trim().toLowerCase();
}

function isGenericCategoryTitle(category, title) {
  const cat = String(category || '').trim();
  const t = String(title || '').trim();
  if (!t) return true;
  if (GLOBAL_GENERIC_PATTERNS.test(t)) return true;
  const pat = CATEGORY_GENERIC_PATTERNS[cat];
  if (pat && pat.test(t)) return true;
  if (cat === 'Plakaty dla dzieci' && isGenericChildrenTitle(t)) return true;
  if (cat === 'Sport i hobby' && isTennisBiasedTitle(t)) return false; // filtered at pick time
  return false;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasCuratedTitlePool(category) {
  const pool = CATEGORY_TITLE_POOLS[String(category || '').trim()];
  return Array.isArray(pool) && pool.length > 0;
}

/**
 * @param {string} category
 * @param {number} count
 * @param {string[]} excludeTitles
 * @returns {string[]}
 */
function pickCategoryTitles(category, count, excludeTitles = []) {
  const cat = String(category || '').trim();
  const pool = CATEGORY_TITLE_POOLS[cat];
  if (!pool || !pool.length) return [];

  const n = Math.max(1, Number(count) || 1);
  const exclude = new Set((excludeTitles || []).map(normalizeTitleKey));
  const candidates = shuffle(
    pool.filter((t) => !exclude.has(normalizeTitleKey(t)) && !isGenericCategoryTitle(cat, t))
  );

  const picks = [];
  let tennisCount = 0;
  for (const title of candidates) {
    if (picks.length >= n) break;
    if (cat === 'Sport i hobby') {
      const tennis = isTennisBiasedTitle(title);
      if (tennis && tennisCount >= 1) continue;
      if (tennis) tennisCount += 1;
    }
    if (picks.some((x) => normalizeTitleKey(x) === normalizeTitleKey(title))) continue;
    picks.push(title);
  }
  return picks;
}

function filterValidCategoryTitles(category, titles, excludeTitles = []) {
  const cat = String(category || '').trim();
  const exclude = new Set((excludeTitles || []).map(normalizeTitleKey));
  const out = [];
  let tennisCount = 0;
  for (const raw of titles || []) {
    const t = String(raw || '').trim();
    if (!t || exclude.has(normalizeTitleKey(t))) continue;
    if (isGenericCategoryTitle(cat, t)) continue;
    if (out.some((x) => normalizeTitleKey(x) === normalizeTitleKey(t))) continue;
    if (cat === 'Sport i hobby' && isTennisBiasedTitle(t)) {
      if (tennisCount >= 1) continue;
      tennisCount += 1;
    }
    out.push(t);
  }
  return out;
}

module.exports = {
  CATEGORY_TITLE_POOLS,
  hasCuratedTitlePool,
  pickCategoryTitles,
  filterValidCategoryTitles,
  isGenericCategoryTitle,
  normalizeTitleKey,
};
