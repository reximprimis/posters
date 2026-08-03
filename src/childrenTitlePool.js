/**
 * Curated Plakaty dla dzieci titles — Boho-Scandi nursery aesthetic (Pinterest bestsellers).
 */

const CHILDREN_TITLE_POOL = [
  // Watercolor animal portraits (hero subject, one animal)
  'Watercolor Lion Cub',
  'Gentle Giraffe Portrait',
  'Sleeping Bear Cub',
  'Forest Fox Friend',
  'Bunny in Meadow',
  'Elephant with Crown',
  'Koala on Branch',
  'Sleepy Sloth Morning',
  'Whimsical Owl Friend',
  'Deer in Soft Mist',
  'Little Penguin Friend',
  'Watercolor Zebra',
  'Teddy Bear Hug',
  'Little Whale Ocean',
  'Butterfly Garden Calm',
  'Hedgehog in Leaves',
  'Squirrel and Acorn',
  // Boho / celestial nursery motifs
  'Boho Rainbow Arc',
  'Smiling Sun and Cloud',
  'Moon and Stars Night',
  'Starry Nursery Sky',
  'Cotton Cloud Dream',
  'Sage Green Rainbow',
  'Mustard Sun Morning',
  'Hot Air Balloon Journey',
  'Cloud and Rainbow Sky',
  'Crescent Moon Glow',
  'Sleepy Star Cluster',
  // Gentle nature / whimsy
  'Mushroom Forest Friend',
  'Wildflower Meadow Calm',
  'Dandelion Wish Breeze',
  'Treehouse in Clouds',
  'Balloon and Stars',
  'Woodland Path Morning',
];

function normalizeTitleKey(title) {
  return String(title || '').trim().toLowerCase();
}

/** Generic slogans that produce boring non-visual posters. */
function isGenericChildrenTitle(title) {
  const t = String(title || '').toLowerCase();
  return (
    /\b(happy times|fun adventure|colorful dreams|play zone|joy ride|dream big|playful|kids fun)\b/.test(t) ||
    /\b(symphony|whispers|serenity|magic moments)\b/.test(t) ||
    /^joy\b/.test(t) ||
    /^fun\b/.test(t)
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
 * @param {number} count
 * @param {string[]} excludeTitles
 * @returns {string[]}
 */
function pickChildrenTitles(count, excludeTitles = []) {
  const n = Math.max(1, Number(count) || 1);
  const exclude = new Set((excludeTitles || []).map(normalizeTitleKey));
  const pool = shuffle(
    CHILDREN_TITLE_POOL.filter((t) => !exclude.has(normalizeTitleKey(t)) && !isGenericChildrenTitle(t))
  );
  return pool.slice(0, n);
}

function filterValidChildrenTitles(titles, excludeTitles = []) {
  const exclude = new Set((excludeTitles || []).map(normalizeTitleKey));
  const out = [];
  for (const raw of titles || []) {
    const t = String(raw || '').trim();
    if (!t || exclude.has(normalizeTitleKey(t))) continue;
    if (isGenericChildrenTitle(t)) continue;
    if (out.some((x) => normalizeTitleKey(x) === normalizeTitleKey(t))) continue;
    out.push(t);
  }
  return out;
}

module.exports = {
  CHILDREN_TITLE_POOL,
  pickChildrenTitles,
  filterValidChildrenTitles,
  isGenericChildrenTitle,
  normalizeTitleKey,
};
