/**
 * Category-aware interior scenes for lifestyle mockups (mockup_interior.jpg).
 * Maps poster category (+ optional title hints) to a believable room context.
 */

'use strict';

const { getRoomCollectionsForCategory } = require('./categoryStyles');

/** Primary mockup room per category — overrides first entry in CATEGORY_ROOM_COLLECTIONS when needed. */
const CATEGORY_MOCKUP_ROOM = {
  Botanika: 'Do salonu',
  Abstrakcja: 'Do salonu',
  'Natura i krajobrazy': 'Do salonu',
  Zwierzęta: 'Do salonu',
  'Mapy i miasta': 'Do biura',
  'Plakaty dla dzieci': 'Do pokoju dziecka',
  'Kosmos i astronomia': 'Do pokoju młodzieżowego',
  Retro: 'Do salonu',
  Pojazdy: 'Do gabinetu',
  'Kawa i herbata': 'Do kawiarni',
  'Kuchnia i jedzenie': 'Do kuchni',
  Architektura: 'Do gabinetu',
  'Morze i plaża': 'Do sypialni',
  'Sport i hobby': 'Do biura',
  'Gaming i e-sport': 'Do pokoju młodzieżowego',
  'AI i technologia': 'Do biura',
  'Humor i memy': 'Do pokoju młodzieżowego',
  'Cyberpunk i neon': 'Do pokoju młodzieżowego',
  'Muzyka i dźwięk': 'Do gabinetu',
  'Wellness i joga': 'Do sypialni',
  'Symbole i harmonia': 'Do gabinetu',
};

/** Detailed room descriptions injected into the GPT Image interior prompt. */
const ROOM_INTERIOR_SCENES = {
  'Do salonu':
    'Scandinavian modern living room — light oak console, soft linen sofa edge visible, simple ceramic decor, natural daylight from a side window. Calm, warm, premium atmosphere.',
  'Do kuchni':
    'modern European kitchen — matte or light wood cabinets, stone or light countertop, subtle herbs in a small pot, clean backsplash, warm natural window light. Tidy and appetizing — no clutter, no readable packaging or labels.',
  'Do jadalni':
    'refined dining nook — wooden dining table with simple chairs, soft pendant light, neutral walls, gentle daylight. Elegant, uncluttered, inviting.',
  'Do sypialni':
    'calm contemporary bedroom — upholstered headboard, layered linen bedding, small bedside lamp, soft morning light. Restful, airy, premium hotel-like calm.',
  'Do pokoju dziecka':
    'gentle nursery or child room — soft neutral walls, light wood furniture, plush toy on shelf (generic, no brand), warm daylight. Playful but calm, not chaotic.',
  'Do biura':
    'modern home office — clean desk with laptop closed, ergonomic chair, bookshelf with neutral objects, large window light. Professional, focused, minimal clutter.',
  'Do łazienki':
    'spa-like bathroom — light tiles, wooden bath tray, folded towels, soft diffused light, plants optional. Serene wellness mood, no personal products with labels.',
  'Do kawiarni':
    'boutique café corner — small round table, bentwood or simple chair, espresso cup (no logo), warm ambient light, subtle brick or plaster wall texture. Cozy slow-living mood.',
  'Do gabinetu':
    'executive study / library corner — dark wood or walnut desk, leather chair, built-in shelves with books (spines neutral), table lamp, refined mature atmosphere.',
  'Do pokoju młodzieżowego':
    'stylish teen or creative room — desk with headphones, poster-sized empty wall focus, LED strip accent (subtle), skateboard or books on shelf (generic). Energetic but tidy.',
  athletic_corner:
    'bright active-lifestyle room — minimal home gym corner with yoga mat rolled, dumbbells on rack, clean rubber floor section, large window light. Athletic but premium, not a commercial gym.',
  coastal_living:
    'coastal living space — whitewashed walls, light driftwood accent, linen textures, soft sea-toned daylight. Relaxed beach-house calm without kitschy décor.',
  music_studio:
    'home music corner — acoustic guitar on stand, small amplifier without logos, vinyl shelf, warm lamp light. Creative studio mood, not a cluttered garage.',
  garage_studio:
    'modern garage studio — polished concrete floor, subtle tool wall in background (no brands), good overhead light, masculine refined workshop aesthetic.',
};

/** Optional title keywords → room override within allowed categories. */
const TITLE_ROOM_HINTS = [
  {
    pattern: /\b(yoga|meditation|spa|breath|wellness|calm)\b/i,
    room: 'Do łazienki',
    categories: ['Wellness i joga', 'Symbole i harmonia'],
  },
  {
    pattern: /\b(gym|workout|fitness|boxing|weights|training|dumbbell)\b/i,
    room: 'athletic_corner',
    categories: ['Sport i hobby', 'Wellness i joga'],
  },
  {
    pattern: /\b(running|track|marathon|sneaker|hiking|climb|ski|surf|swim|cycle|bicycle|bike)\b/i,
    room: 'athletic_corner',
    categories: ['Sport i hobby'],
  },
  {
    pattern: /\b(coffee|espresso|cappuccino|latte|tea|teapot|café|cafe)\b/i,
    room: 'Do kawiarni',
    categories: ['Kawa i herbata', 'Kuchnia i jedzenie'],
  },
  {
    pattern: /\b(kitchen|pasta|lemon|tomato|olive|herb|bread|spice|fruit|vegetable|culinary)\b/i,
    room: 'Do kuchni',
    categories: ['Kuchnia i jedzenie', 'Kawa i herbata'],
  },
  {
    pattern: /\b(beach|shore|wave|dune|coastal|sea|ocean)\b/i,
    room: 'coastal_living',
    categories: ['Morze i plaża', 'Natura i krajobrazy'],
  },
  {
    pattern: /\b(guitar|piano|vinyl|music|jazz|studio|headphone)\b/i,
    room: 'music_studio',
    categories: ['Muzyka i dźwięk'],
  },
  {
    pattern: /\b(car|motorcycle|motor|vehicle|garage|rally|engine|automotive)\b/i,
    room: 'garage_studio',
    categories: ['Pojazdy'],
  },
  {
    pattern: /\b(gaming|game|controller|arcade|esport|e-sport|neon setup)\b/i,
    room: 'Do pokoju młodzieżowego',
    categories: ['Gaming i e-sport', 'Cyberpunk i neon'],
  },
  {
    pattern: /\b(child|nursery|kids|fairy|playful)\b/i,
    room: 'Do pokoju dziecka',
    categories: ['Zwierzęta', 'Plakaty dla dzieci'],
  },
];

function normalizeCategory(category) {
  return String(category || '').trim();
}

function resolveRoomKey(category, title) {
  const cat = normalizeCategory(category);
  const allowed = new Set(getRoomCollectionsForCategory(cat));
  const titleStr = String(title || '').trim();

  for (const hint of TITLE_ROOM_HINTS) {
    if (!hint.categories.includes(cat)) continue;
    if (!hint.pattern.test(titleStr)) continue;
    const key = hint.room;
    if (ROOM_INTERIOR_SCENES[key]) return key;
    if (allowed.has(key)) return key;
  }

  const mapped = CATEGORY_MOCKUP_ROOM[cat];
  if (mapped && ROOM_INTERIOR_SCENES[mapped]) return mapped;

  const collections = getRoomCollectionsForCategory(cat);
  if (collections.length) {
    const first = collections.find((r) => ROOM_INTERIOR_SCENES[r]);
    if (first) return first;
  }

  return 'Do salonu';
}

function getRoomSceneDescription(roomKey) {
  return ROOM_INTERIOR_SCENES[roomKey] || ROOM_INTERIOR_SCENES['Do salonu'];
}

function getRoomLabel(roomKey) {
  if (roomKey === 'athletic_corner') return 'active lifestyle room';
  if (roomKey === 'coastal_living') return 'coastal living room';
  if (roomKey === 'music_studio') return 'music studio corner';
  if (roomKey === 'garage_studio') return 'garage studio';
  return roomKey.replace(/^Do /, '').toLowerCase();
}

/**
 * @param {string} category
 * @param {string} [title]
 * @returns {{ roomKey: string, roomLabel: string, sceneDescription: string }}
 */
function resolveMockupInteriorScene(category, title) {
  const cat = normalizeCategory(category);
  const roomKey = resolveRoomKey(cat, title);
  return {
    roomKey,
    roomLabel: getRoomLabel(roomKey),
    sceneDescription: getRoomSceneDescription(roomKey),
    category: cat,
  };
}

const INTERIOR_PROMPT_TEMPLATE = `Use the uploaded image as the exact poster artwork. Do not alter, redraw, recolor, rotate, stretch, or distort it in any way. Reproduce the artwork pixel-accurately inside the frame.

Create a premium lifestyle mockup: this poster artwork in a black gallery frame hanging on a wall in a {{ROOM_LABEL}}.
- Black gallery frame: same thin matte black profile as a standard gallery frame. The artwork fills the inner area edge-to-edge, no mat border.
- The framed poster hangs on a clean, smooth neutral wall (warm light gray or warm white). It is centered and straight.
- The frame is in portrait orientation (taller than wide) and realistically sized — medium to large scale, clearly visible.
- Room: {{SCENE_DESCRIPTION}}
- The framed poster is the clear focal point of the scene.
- No text, no logo, no watermark, no other artwork or photos on the walls.
- Photorealistic result suitable for a Shopify product image gallery.`;

/**
 * @param {string} category
 * @param {string} [title]
 * @returns {string}
 */
function buildInteriorMockupPrompt(category, title) {
  const { roomLabel, sceneDescription } = resolveMockupInteriorScene(category, title);
  return INTERIOR_PROMPT_TEMPLATE.replace('{{ROOM_LABEL}}', roomLabel).replace(
    '{{SCENE_DESCRIPTION}}',
    sceneDescription
  );
}

module.exports = {
  CATEGORY_MOCKUP_ROOM,
  ROOM_INTERIOR_SCENES,
  resolveMockupInteriorScene,
  buildInteriorMockupPrompt,
  resolveRoomKey,
};
