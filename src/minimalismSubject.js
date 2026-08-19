/**
 * Minimalism style — dwa rozlaczne warianty, wybierane po KATEGORII:
 *
 *  - PEJZAZOWY (nature-landscapes, sea-coast, mountains-hiking): tematem jest
 *    krajobraz, wiec kompozycja mowi o horyzoncie i odbiciu, a restrykcje
 *    wycinaja zwierzeta, budynki i lodzie.
 *  - PRZEDMIOTOWY (cala reszta): tematem jest rzecz, zwierze lub postac
 *    nazwana w tytule. Ten wariant nie zakazuje zwierzat ani przedmiotow,
 *    za to jawnie zabrania ucieczki w pejzaz.
 *
 * Wczesniej oba tryby dostawaly te same bloki pejzazowe. "Whiskey Amber Glow"
 * w bar-cocktails wychodzil wtedy trzy razy jako zachod slonca nad woda: prompt
 * zakazywal szklanki (restrykcja "no ... animals ...") i kazal budowac horyzont.
 * Udane minimalizmy przedmiotowe (zyrafa, trabka, pomidor) powstawaly WBREW
 * promptowi — wylacznie dzieki mocnemu rzeczownikowi w tytule.
 */

const { IP_SAFETY_LINES } = require('./safePrintFraming');

function normalizeBlock(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const NATURE_LANDSCAPE_CATEGORY = 'nature-landscapes';

/**
 * Kategorie, w ktorych minimalizm ZNACZY pejzaz.
 *
 * Decyduje kategoria, nie tytul: slowo "ocean" w tytule koktajlu nie moze
 * przelaczac promptu na krajobraz, a tytul nastrojowy w kategorii gorskiej
 * nie moze z pejzazu wypasc.
 */
const MINIMALISM_LANDSCAPE_CATEGORIES = new Set([
  'nature-landscapes',
  'sea-coast',
  'mountains-hiking',
]);

/**
 * Rzeczowniki, ktore w kategorii pejzazowej przelaczaja plakat na wariant
 * PRZEDMIOTOWY.
 *
 * Pule tytulow trzech kategorii pejzazowych zawieraja rekwizyty: "Mountain Hut
 * Dusk", "Hiking Boots Rest", "Rope And Carabiner", "Lighthouse Coast Mist",
 * "Sailboat Horizon Line". Restrykcje krajobrazowe zakazuja budynkow, lodzi
 * i przedmiotow, wiec bez tego wyjatku kazdy taki tytul walczylby z promptem
 * dokladnie tak, jak "Whiskey Amber Glow" w bar-cocktails.
 *
 * Kierunek jest jednostronny: przedmiot moze wyjsc z pejzazu, ale slowo
 * pejzazowe w tytule NIE wciaga w pejzaz kategorii przedmiotowej.
 */
const OBJECT_TITLE_KEYWORDS =
  /\b(hut|huts|cabin|shelter|lighthouse|tower|bridge|boat|boats|sailboat|ship|buoy|anchor|oar|paddle|net|nets|boot|boots|shoe|shoes|rope|carabiner|axe|backpack|rucksack|tent|compass|map|lantern|lamp|flag|marker|post|sign|cairn|stone|stones|pebble|pebbles|shell|shells|seashell|starfish|driftwood|feather|nest|bench|chair|ladder|door|window|bottle|flask|cup|mug|kettle|rod|surfboard|kayak|canoe|bicycle|bike|ski|skis|sled|hammock|binoculars|camera)\b/i;

const LANDSCAPE_KEYWORDS =
  /\b(mountain|mountains|reflection|reflect|lake|valley|forest|hill|hills|cloud|clouds|horizon|river|coast|shore|desert|dune|meadow|mist|misty|fog|foggy|water|sea|ocean|cliff|canyon|glacier|snow|peak|summit|wood|woods|tree line|treeline)\b/i;

function isNatureLandscapeCategory(category) {
  return String(category || '').trim() === NATURE_LANDSCAPE_CATEGORY;
}

/** @param {string} category */
function isMinimalismLandscapeCategory(category) {
  return MINIMALISM_LANDSCAPE_CATEGORIES.has(String(category || '').trim());
}

function isMinimalismArtStyle(style) {
  return String(style || '').trim().toLowerCase() === 'minimalism';
}

/**
 * Tylko do wyboru MOTYWU wewnatrz wariantu pejzazowego — nigdy do wyboru
 * samego wariantu (patrz komentarz przy MINIMALISM_LANDSCAPE_CATEGORIES).
 */
function titleSuggestsLandscape(title) {
  return LANDSCAPE_KEYWORDS.test(String(title || ''));
}

/** @param {string} title */
function titleNamesConcreteObject(title) {
  return OBJECT_TITLE_KEYWORDS.test(String(title || ''));
}

/**
 * Wariant promptu: kategoria wyznacza domysl, tytul moze go zlamac tylko
 * w jedna strone — z pejzazu na przedmiot.
 *
 * @param {string} title
 * @param {string} category
 * @returns {'minimalism_landscape'|'minimalism_object'}
 */
function resolveMinimalismMode(title, category) {
  if (!isMinimalismLandscapeCategory(category)) return 'minimalism_object';
  return titleNamesConcreteObject(title) ? 'minimalism_object' : 'minimalism_landscape';
}

/**
 * @param {string} title
 * @returns {{ resolvedSubject: string, primarySubject: string, subjectKind: string, landscapeFocus: string }}
 */
function resolveMinimalLandscapeFromTitle(title) {
  const t = String(title || '').toLowerCase();

  if (/\b(mountain|peak|summit)\b/i.test(t) && /\b(reflect|reflection|mirror|lake)\b/i.test(t)) {
    return {
      subjectKind: 'mountain_reflection',
      landscapeFocus: 'mountain-reflection',
      resolvedSubject:
        'A quiet minimalist mountain silhouette reflected in a still lake, with large calm negative space.',
      primarySubject: normalizeBlock(`
        A simplified mountain form mirrored in perfectly calm water.
        The mountain and its reflection are the clear visual focus.
        The scene should feel silent, balanced, spacious, and premium.
      `),
    };
  }

  if (/\b(cloud|clouds)\b/i.test(t) && /\b(hill|hills|rolling)\b/i.test(t)) {
    return {
      subjectKind: 'clouds_hills',
      landscapeFocus: 'clouds-hills',
      resolvedSubject: 'Soft simplified cloud forms drifting above quiet rolling hills, with spacious negative sky.',
      primarySubject:
        'Gentle cloud masses and simplified hill silhouettes with calm horizontal balance; the sky and hills form the visual hierarchy.',
    };
  }

  if (/\b(forest|wood|woods|tree)\b/i.test(t) && /\b(mist|misty|fog|foggy|horizon)\b/i.test(t)) {
    return {
      subjectKind: 'forest_mist',
      landscapeFocus: 'forest-horizon',
      resolvedSubject: 'A minimal layered forest horizon fading into soft mist.',
      primarySubject:
        'Simplified tree-line layers dissolving into pale mist; restrained detail and quiet depth through tonal fade only.',
    };
  }

  if (/\b(river|stream|creek)\b/i.test(t) && /\b(bend|curve|meander)\b/i.test(t)) {
    return {
      subjectKind: 'river_bend',
      landscapeFocus: 'river',
      resolvedSubject: 'A simplified river curve moving through a quiet open landscape.',
      primarySubject:
        'One calm arcing river path through soft open ground; the curve is the clear focal structure with generous empty space around it.',
    };
  }

  if (/\b(desert|dune|sand)\b/i.test(t)) {
    return {
      subjectKind: 'desert',
      landscapeFocus: 'desert',
      resolvedSubject: 'A minimal desert dune silhouette under a soft pale sky.',
      primarySubject:
        'Simplified dune forms with smooth tonal gradients and vast quiet sky; calm, sparse, and premium.',
    };
  }

  if (/\b(coast|shore|seaside|cliff)\b/i.test(t)) {
    return {
      subjectKind: 'coast',
      landscapeFocus: 'coast',
      resolvedSubject: 'A minimal coastline with a simple horizon line and calm open sea.',
      primarySubject:
        'Clean shore silhouette, soft water plane, and wide sky; horizontal calm and restrained forms only.',
    };
  }

  if (/\b(meadow|field|grass)\b/i.test(t)) {
    return {
      subjectKind: 'meadow',
      landscapeFocus: 'meadow',
      resolvedSubject: 'A quiet open meadow under a soft pale sky with minimal landforms.',
      primarySubject:
        'Gentle rolling ground and wide sky with almost no detail; spacious and serene.',
    };
  }

  if (/\b(valley)\b/i.test(t)) {
    return {
      subjectKind: 'valley',
      landscapeFocus: 'valley',
      resolvedSubject: 'A simplified valley form with soft slopes and calm atmospheric perspective.',
      primarySubject:
        'Layered valley silhouettes with quiet tonal steps and generous negative space in the sky.',
    };
  }

  if (/\b(lake|water)\b/i.test(t)) {
    return {
      subjectKind: 'lake',
      landscapeFocus: 'lake',
      resolvedSubject: 'A calm minimalist lake surface with a simple shoreline and soft sky.',
      primarySubject:
        'Still water, minimal shore line, and open sky; reflection and horizon stay simple and balanced.',
    };
  }

  if (/\b(mountain|peak|summit|ridge|alpine|glacier)\b/i.test(t)) {
    return {
      subjectKind: 'mountain',
      landscapeFocus: 'mountain',
      resolvedSubject: 'A quiet minimalist mountain silhouette against a soft atmospheric sky.',
      primarySubject:
        'One simplified mountain mass with clean edges and large calm sky; no busy detail or dramatic weather.',
    };
  }

  if (/\b(forest|wood|woods)\b/i.test(t)) {
    return {
      subjectKind: 'forest',
      landscapeFocus: 'forest',
      resolvedSubject: 'A minimal simplified forest mass with layered tree forms.',
      primarySubject:
        'Restrained tree silhouettes as flat tonal layers; calm, graphic, and spacious.',
    };
  }

  return {
    subjectKind: 'landscape_general',
    landscapeFocus: 'landscape',
    resolvedSubject: `A minimal simplified natural landscape inspired by "${title}", with calm forms and generous negative space.`,
    primarySubject:
      'Simplified land, sky, and atmosphere as flat tonal areas; one clear visual hierarchy, no photographic clutter.',
  };
}

/**
 * Wariant przedmiotowy: tematem jest rzecz, zwierze lub postac z tytulu.
 *
 * Prompt musi trzymac model przy rzeczowniku takze wtedy, gdy tytul jest
 * nastrojowy ("Whiskey Amber Glow", "Velvet Hour") — stad jawne zdanie
 * o zakazie zamiany tematu na krajobraz.
 *
 * @param {string} title
 */
function resolveMinimalObjectFromTitle(title) {
  const raw = String(title || '').replace(/\s+/g, ' ').trim();
  return {
    subjectKind: 'minimal_object',
    landscapeFocus: 'form',
    resolvedSubject: normalizeBlock(`
      A minimal, reduced rendering of the exact thing named by the title "${raw}" —
      the object, animal, or figure itself, presented as a single hero form.
      If the title reads as a mood rather than a noun, resolve it to the concrete thing
      it names (a drink title means the glass and the drink, a music title means the
      instrument) and never to scenery, sunset, horizon, or landscape.
    `),
    primarySubject: normalizeBlock(`
      One clear minimal hero form — the subject itself, or a small tight grouping of
      its parts — with a clean readable silhouette that stays instantly recognisable.
      Flat tonal areas, quiet hierarchy, calm background field, no realistic photo language.
      The subject stays the subject: a glass stays a glass, an animal stays that animal,
      an instrument stays that instrument.
    `),
  };
}

/**
 * @param {string} title
 * @param {string} category
 */
function resolveMinimalismSubject(title, category) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();

  if (resolveMinimalismMode(titleText, categoryKey) === 'minimalism_landscape') {
    const landscape = resolveMinimalLandscapeFromTitle(titleText);
    return {
      coreSubject: titleText,
      styleNorm: 'minimalism',
      resolutionMode: 'minimalism_landscape',
      isTitleMoodAbstract: false,
      supportingMood: extractMinimalMood(titleText),
      subjectScaleMin: 0.55,
      subjectScaleMax: 0.7,
      ...landscape,
    };
  }

  const object = resolveMinimalObjectFromTitle(titleText);
  return {
    coreSubject: titleText.replace(/\s+/g, ' ').trim(),
    styleNorm: 'minimalism',
    resolutionMode: 'minimalism_object',
    isTitleMoodAbstract: false,
    supportingMood: extractMinimalMood(titleText),
    subjectScaleMin: 0.55,
    subjectScaleMax: 0.7,
    ...object,
  };
}

function extractMinimalMood(title) {
  const t = String(title || '').toLowerCase();
  const bits = [];
  if (/\bsilent|quiet|calm|still|gentle|soft|misty|peaceful\b/i.test(t)) {
    bits.push('silent, calm, spacious mood');
  }
  if (/\bmorning|dawn|evening|dusk\b/i.test(t)) bits.push('soft atmospheric light');
  if (/\bwinter|snow|frost\b/i.test(t)) bits.push('cool pale tones');
  return normalizeBlock(bits.join('; ') || 'Quiet luxury, calm balance, refined restraint.');
}

const SAFE_FRAMING_MINIMAL_OBJECT = normalizeBlock(`
  SAFE PRINT FRAMING — MINIMAL SUBJECT:
  The complete main subject must fit inside the inner 90% safe area of the canvas.
  Keep at least 5% clean background margin on every side: top, bottom, left, and right.
  The outer 5% border area must contain only the flat background field or non-essential tonal texture.
  No part of the subject — silhouette edge, handle, rim, stem, tail, limb, or supporting form —
  may touch, cross, or nearly touch the image border.
  Avoid tight crop, edge-touching composition, cropped subject parts, oversized subject scale,
  macro close-up framing, or important details near borders.
  Full-bleed image is allowed only for the flat background, not for the subject.
`);

function buildMinimalSafeFramingBlock(landscapeFocus) {
  if (landscapeFocus === 'form') {
    return SAFE_FRAMING_MINIMAL_OBJECT;
  }

  if (landscapeFocus === 'mountain-reflection') {
    return normalizeBlock(`
      SAFE PRINT FRAMING — MINIMAL LANDSCAPE:
      The complete mountain-reflection structure must fit inside the inner 90% safe area of the canvas.
      Keep at least 5% clean background margin on every side: top, bottom, left, and right.
      The outer 5% border area must contain only soft background, water, sky, mist, atmosphere, or non-essential tonal texture.
      No mountain peak, reflection edge, horizon focus, or important landscape form may touch, cross, or nearly touch the image border.
      Avoid tight crop, edge-touching composition, oversized mountain forms, cropped reflections, or important details near borders.
      Full-bleed image is allowed only for the soft sky, water, mist, and background atmosphere, not for the main mountain-reflection structure.
    `);
  }

  return normalizeBlock(`
    SAFE PRINT FRAMING — MINIMAL LANDSCAPE:
    The complete main landscape structure must fit inside the inner 90% safe area of the canvas.
    Keep at least 5% clean background margin on every side: top, bottom, left, and right.
    The outer 5% border area must contain only soft background, sky, water, mist, atmosphere, or non-essential tonal texture.
    No mountain peak, reflection edge, horizon focus, tree line, river curve, or important landscape form may touch, cross, or nearly touch the image border.
    Avoid tight crop, edge-touching composition, oversized landscape forms, cropped reflections, cropped peaks, or important details near borders.
    Full-bleed image is allowed only for soft sky, water, mist, and background atmosphere, not for the main landscape structure.
  `);
}

const MINIMAL_COLOR_PALETTE = normalizeBlock(`
Color palette:
Soft muted neutrals, pale blue-gray, warm off-white, misty beige, gentle charcoal, and desaturated natural tones.
`);

const MINIMAL_STYLE_DIRECTION_LANDSCAPE = normalizeBlock(`
Style direction:
Minimalist landscape artwork with restrained forms, soft tonal harmony, quiet luxury mood, and intentional negative space.
Use simplified natural shapes, calm horizontal balance, and subtle atmospheric gradients.
Avoid busy detail, dramatic clouds, harsh contrast, realistic photo clutter, object photography language, depth-of-field blur, and decorative excess.
`);

const MINIMAL_STYLE_DIRECTION_OBJECT = normalizeBlock(`
Style direction:
Minimalist artwork built around the single subject named by the title, reduced to its essential forms:
clean silhouette, flat tonal shapes, soft tonal harmony, quiet luxury mood, and intentional negative space.
The subject must stay clearly recognisable at a glance.
Do not turn the subject into scenery: no horizon band, no sunset, no landscape standing in for the thing itself.
Avoid busy detail, harsh contrast, realistic photo clutter, product-shot styling, depth-of-field blur, and decorative excess.
`);

const MINIMAL_COMPOSITION_LANDSCAPE = normalizeBlock(`
Composition:
Single cohesive minimalist composition with one clear visual hierarchy.
The main landscape structure should occupy around 55–70% of the canvas, not more.
Leave generous breathing room above, below, and around the full form.
The horizon and any reflection should feel calm, balanced, and intentional.
Negative space is part of the artwork.
`);

const MINIMAL_COMPOSITION_OBJECT = normalizeBlock(`
Composition:
Single cohesive minimalist composition with one clear focal subject, centred or intentionally offset.
The subject should occupy around 55–70% of the canvas, not more.
Leave generous breathing room above, below, and around the full form.
The background is one calm flat tonal field; negative space is part of the artwork.
No horizon line, landscape band, or scenic backdrop unless the title itself names one.
`);

const MINIMAL_RESTRICTIONS_LANDSCAPE = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, watermark, frame, mockup, border, mat, passe-partout, or product presentation.
No people, buildings, boats, animals, roads, signs, or modern elements.
No realistic photography still-life or product-shot framing.
Single flat 2D image only.
Premium fine-art artwork for print.
${IP_SAFETY_LINES}
`);

/**
 * Wariant przedmiotowy CELOWO nie zakazuje zwierzat, przedmiotow ani postaci —
 * to one sa tematem. Zostaje zakaz komercyjny, ochrona IP i zakaz pejzazu.
 */
const MINIMAL_RESTRICTIONS_OBJECT = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, packaging copy, watermark, frame, mockup, border, mat, passe-partout, or product presentation.
No landscape scene, horizon line, sunset, mountains, or scenery replacing the subject named by the title.
No realistic photography still-life or product-shot framing.
Single flat 2D image only.
Premium fine-art artwork for print.
${IP_SAFETY_LINES}
`);

// Nazwy bez sufiksu zostaja jako aliasy wariantu pejzazowego — importuja je
// starsze buildery, ktore jawnie chca bloku krajobrazowego.
const MINIMAL_STYLE_DIRECTION = MINIMAL_STYLE_DIRECTION_LANDSCAPE;
const MINIMAL_COMPOSITION = MINIMAL_COMPOSITION_LANDSCAPE;

/**
 * @param {string} title
 * @param {string} category
 * @param {object} blocks
 */
function buildMinimalismPrompt(title, category, blocks = {}) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const resolved = resolveMinimalismSubject(titleText, categoryKey);
  const landscapeMode = resolved.resolutionMode === 'minimalism_landscape';
  const safeFraming =
    blocks.SAFE_PRINT_FRAMING_MINIMAL ||
    blocks.SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE ||
    buildMinimalSafeFramingBlock(resolved.landscapeFocus);

  return [
    'Premium fine-art artwork for print.',
    // Bez tej linii minimalizm nigdy nie widzi kategorii: prompt sklada sie
    // z samego tytulu i wskazowek stylu. Tytul nastrojowy bez mocnego
    // rzeczownika ladowal wtedy obok tematu — "Whiskey Amber Glow"
    // w kategorii bar-cocktails wychodzil dwukrotnie jako zachod slonca.
    blocks.CATEGORY_FOCUS,
    `TITLE BRIEF — "${titleText}" defines the exact subject; interpret semantically and never render the words as typography, label text, logo, or caption.`,
    `Resolved minimal subject:\n${resolved.resolvedSubject}`,
    `Subject:\n${resolved.primarySubject}`,
    blocks.MINIMAL_STYLE_DIRECTION ||
      (landscapeMode ? MINIMAL_STYLE_DIRECTION_LANDSCAPE : MINIMAL_STYLE_DIRECTION_OBJECT),
    blocks.MINIMAL_COLOR_PALETTE || MINIMAL_COLOR_PALETTE,
    blocks.MINIMAL_COMPOSITION ||
      (landscapeMode ? MINIMAL_COMPOSITION_LANDSCAPE : MINIMAL_COMPOSITION_OBJECT),
    safeFraming,
    blocks.MINIMAL_RESTRICTIONS ||
      (landscapeMode ? MINIMAL_RESTRICTIONS_LANDSCAPE : MINIMAL_RESTRICTIONS_OBJECT),
    'Ultra-detailed, print-ready.',
  ]
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  NATURE_LANDSCAPE_CATEGORY,
  MINIMALISM_LANDSCAPE_CATEGORIES,
  isNatureLandscapeCategory,
  isMinimalismLandscapeCategory,
  isMinimalismArtStyle,
  titleSuggestsLandscape,
  titleNamesConcreteObject,
  resolveMinimalismMode,
  resolveMinimalLandscapeFromTitle,
  resolveMinimalObjectFromTitle,
  resolveMinimalismSubject,
  buildMinimalSafeFramingBlock,
  buildMinimalismPrompt,
  MINIMAL_COLOR_PALETTE,
  MINIMAL_STYLE_DIRECTION,
  MINIMAL_COMPOSITION,
  MINIMAL_STYLE_DIRECTION_LANDSCAPE,
  MINIMAL_STYLE_DIRECTION_OBJECT,
  MINIMAL_COMPOSITION_LANDSCAPE,
  MINIMAL_COMPOSITION_OBJECT,
  MINIMAL_RESTRICTIONS_LANDSCAPE,
  MINIMAL_RESTRICTIONS_OBJECT,
  SAFE_FRAMING_MINIMAL_OBJECT,
};
