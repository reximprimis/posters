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
