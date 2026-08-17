#!/usr/bin/env node
/**
 * Assert category × style matrix (71 combinations, 21 categories).
 */
const {
  EXPECTED_ALLOWED_COMBINATIONS,
  getAllAllowedCategoryStylePairs,
  validateAllowedPairsCount,
  CATEGORY_STYLES,
  CATEGORIES,
  ROOM_COLLECTIONS,
  CATEGORY_ROOM_COLLECTIONS,
  assertCategoryStyleAllowed,
  isStyleAllowedForCategory,
} = require('../src/categoryStyles');

const NEW_CATEGORIES = [
  'gaming-esports',
  'ai-technology',
  'humor-memes',
  'cyberpunk-neon',
  'music-sound',
  'wellness-yoga',
  'symbols-sacred-geometry',
];

const FORBIDDEN_PAIRS = [
  ['gaming-esports', 'Photography'],
  ['humor-memes', 'Photography'],
  ['cyberpunk-neon', 'Photography'],
  ['wellness-yoga', 'Abstract'],
  ['symbols-sacred-geometry', 'Photography'],
  ['retro-vintage', 'Minimalism'],
  ['botanical', 'Abstract'],
  ['kids-nursery', 'Photography'],
];

const REQUIRED_NEW_STYLES = {
  'gaming-esports': ['Illustration', 'Minimalism', 'Abstract', 'Line art'],
  'ai-technology': ['Abstract', 'Minimalism', 'Illustration', 'Line art'],
  'humor-memes': ['Illustration', 'Minimalism', 'Line art'],
  'cyberpunk-neon': ['Abstract', 'Illustration', 'Minimalism'],
  'music-sound': ['Photography', 'Minimalism', 'Abstract', 'Line art'],
  'wellness-yoga': ['Photography', 'Minimalism', 'Illustration', 'Line art'],
  'symbols-sacred-geometry': ['Minimalism', 'Abstract', 'Illustration', 'Line art'],
};

validateAllowedPairsCount();

for (const cat of NEW_CATEGORIES) {
  if (!CATEGORIES.includes(cat)) {
    throw new Error(`Missing new category in CATEGORIES: ${cat}`);
  }
  if (!CATEGORY_STYLES[cat]) {
    throw new Error(`Missing CATEGORY_STYLES for: ${cat}`);
  }
  if (!CATEGORY_ROOM_COLLECTIONS[cat]?.length) {
    throw new Error(`Missing CATEGORY_ROOM_COLLECTIONS for: ${cat}`);
  }
  const expected = REQUIRED_NEW_STYLES[cat];
  const actual = CATEGORY_STYLES[cat];
  for (const st of expected) {
    if (!actual.includes(st)) {
      throw new Error(`${cat} missing allowed style: ${st}`);
    }
  }
}

for (const [category, style] of FORBIDDEN_PAIRS) {
  if (isStyleAllowedForCategory(category, style)) {
    throw new Error(`Forbidden pair should be blocked but is allowed: ${category} + ${style}`);
  }
  let blocked = false;
  try {
    assertCategoryStyleAllowed(category, style);
  } catch (e) {
    if (String(e.message).includes('Unsupported category/style')) {
      blocked = true;
    } else {
      throw e;
    }
  }
  if (!blocked) {
    throw new Error(`assertCategoryStyleAllowed did not block: ${category} + ${style}`);
  }
}

const pairs = getAllAllowedCategoryStylePairs();
console.log(`OK: ${pairs.length} allowed category/style pairs (expected ${EXPECTED_ALLOWED_COMBINATIONS}).`);
console.log(`Categories: ${CATEGORIES.length} (matrix keys: ${Object.keys(CATEGORY_STYLES).length})`);
console.log(`Room collections (global list): ${ROOM_COLLECTIONS.length}`);
console.log(`New categories validated: ${NEW_CATEGORIES.length}`);
console.log(`Forbidden pairs blocked: ${FORBIDDEN_PAIRS.length}`);
