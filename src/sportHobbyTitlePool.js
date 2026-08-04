/**
 * Curated Sport i hobby titles — avoids LLM defaulting to tennis/racket clichés.
 */

const SPORT_HOBBY_TITLE_POOL = [
  // Popular team / court sports
  'Soccer Ball on Grass',
  'Football on Turf',
  'Basketball on Hardwood',
  'Basketball Court Lines',
  'Volleyball on Sand',
  'Volleyball Net Morning',
  // Individual outdoor sports
  'Cycling Road at Dawn',
  'Mountain Bike Trail',
  'Running Track Lines',
  'Running Shoes on Asphalt',
  'Swimming Pool Lanes',
  'Swimming Goggles Poolside',
  'Golf Club and Ball',
  'Golf Green Morning',
  'Surfboard at Shoreline',
  'Ski Poles in Snow',
  'Skateboard on Concrete',
  'Climbing Rope and Carabiner',
  'Boxing Gloves Still Life',
  'Ice Hockey Stick Ice',
  // Tennis — at most one per batch when picked from pool
  'Tennis Ball on Clay',
  // Hobbies & lifestyle
  'Chess Board Still Life',
  'Open Book by Window',
  'Vintage Film Camera',
  'Hiking Boots on Trail',
  'Fishing Rod at Lake',
  'Acoustic Guitar Corner',
  'Paint Palette Studio',
  'Camping Tent at Dusk',
  'Gardening Gloves and Herbs',
  'Knitting Yarn Basket',
  'Vinyl Record Player',
  'Binoculars Birdwatching',
  'Pottery Wheel Clay',
  'Sketchbook and Pencils',
  'Telescope Under Stars',
  'Archery Target Range',
  'Table Tennis Paddle',
  'Badminton Shuttlecock',

  // Rozszerzenie 2026-08-04. Kierunek: golf i pilka, potem reszta dyscyplin.
  // Zawsze SPRZET albo PUSTE MIEJSCE, nigdy akcja meczowa z zawodnikami —
  // patrz blok Rights safety w src/safePrintFraming.js.
  // Golf
  'Golf Flag in Wind',
  'Golf Ball on Tee',
  'Links Course Dunes',
  'Bunker Rake Lines',
  'Putting Green Shadows',
  'Leather Golf Bag',
  'Fairway Morning Mist',
  'Golf Glove and Tees',
  'Vintage Golf Irons',
  'Coastal Links Cliff',
  // Pilka nozna
  'Football Boots Studs',
  'Corner Flag in Wind',
  'Goal Net Close',
  'Penalty Spot Chalk',
  'Pitch Mowing Stripes',
  'Vintage Leather Football',
  'Floodlight Tower Dusk',
  'Football on Wet Grass',
  // Koszykowka i uliczne
  'Basketball Hoop Net',
  'Streetball Backboard',
  'Basketball on Asphalt',
  'Skate Park Bowl Curve',
  // Kolarstwo
  'Bicycle Wheel Spokes',
  'Racing Bike Handlebars',
  'Cycling Cap and Gloves',
  'Alpine Cycling Pass',
  // Bieganie
  'Marathon Road Marking',
  'Trail Running Path',
  'Stopwatch and Laces',
  // Woda
  'Pool Water Surface',
  'Diving Board Edge',
  'Surf Wax and Board',
  'Kayak on Still Water',
  'Rowing Oars Pair',
  'Sailing Rope Knot',
  // Zima
  'Snowboard on Powder',
  'Ice Skates on Ice',
  'Hockey Puck Rink Line',
  'Alpine Slope Morning',
  // Sila i walka
  'Punching Bag Gym Light',
  'Kettlebell on Floor',
  'Dumbbell Rack Shadow',
  'Fencing Mask Still',
  // Pozostale dyscypliny
  'Chalk Bag and Holds',
  'Cricket Bat and Ball',
  'Rugby Ball on Grass',
  'Baseball Glove and Ball',
  'Equestrian Saddle Leather',
  'Racing Helmet on Shelf',
  // Hobby
  'Typewriter on Desk',
  'Fountain Pen and Ink',
  'Model Ship in Progress',
  'Origami Paper Folds',
  'Puzzle Pieces on Table',
  'Dart Board Close',
  'Board Game Dice Set',
  'Watercolour Brushes Jar',
  'Embroidery Hoop Linen',
  'Bonsai Tree Small',
  'Vintage Map and Compass',
  'Backpack and Thermos',
  'Worn Climbing Shoes',
  'Herb Drying Rack',
];

function normalizeTitleKey(title) {
  return String(title || '').trim().toLowerCase();
}

function isTennisBiasedTitle(title) {
  const t = String(title || '').toLowerCase();
  return (
    /\btennis\b/.test(t) ||
    /\bracket\b/.test(t) ||
    /\bserve\b/.test(t) ||
    /court shadow/.test(t) ||
    /against sunset/.test(t)
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick unique titles from curated pool, excluding inventory duplicates.
 * @param {number} count
 * @param {string[]} excludeTitles
 * @returns {string[]}
 */
function pickSportHobbyTitles(count, excludeTitles = []) {
  const n = Math.max(1, Number(count) || 1);
  const exclude = new Set((excludeTitles || []).map(normalizeTitleKey));
  const pool = shuffle(
    SPORT_HOBBY_TITLE_POOL.filter((t) => !exclude.has(normalizeTitleKey(t)))
  );
  const picks = [];
  let tennisCount = 0;
  for (const title of pool) {
    if (picks.length >= n) break;
    const tennis = isTennisBiasedTitle(title);
    if (tennis && tennisCount >= 1) continue;
    if (tennis) tennisCount += 1;
    picks.push(title);
  }
  return picks;
}

function filterValidSportHobbyTitles(titles, excludeTitles = [], maxTennis = 1) {
  const exclude = new Set((excludeTitles || []).map(normalizeTitleKey));
  const out = [];
  let tennisCount = 0;
  for (const raw of titles || []) {
    const t = String(raw || '').trim();
    if (!t || exclude.has(normalizeTitleKey(t))) continue;
    if (out.some((x) => normalizeTitleKey(x) === normalizeTitleKey(t))) continue;
    const tennis = isTennisBiasedTitle(t);
    if (tennis) {
      if (tennisCount >= maxTennis) continue;
      tennisCount += 1;
    }
    out.push(t);
  }
  return out;
}

module.exports = {
  SPORT_HOBBY_TITLE_POOL,
  isTennisBiasedTitle,
  pickSportHobbyTitles,
  filterValidSportHobbyTitles,
  normalizeTitleKey,
};
