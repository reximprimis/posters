/**
 * Minimalism style — simplified landscape / form resolution (not photography placeholders).
 */

function normalizeBlock(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

const NATURE_LANDSCAPE_CATEGORY = 'Natura i krajobrazy';

const LANDSCAPE_KEYWORDS =
  /\b(mountain|mountains|reflection|reflect|lake|valley|forest|hill|hills|cloud|clouds|horizon|river|coast|shore|desert|dune|meadow|mist|misty|fog|foggy|water|sea|ocean|cliff|canyon|glacier|snow|peak|summit|wood|woods|tree line|treeline)\b/i;

function isNatureLandscapeCategory(category) {
  return String(category || '').trim() === NATURE_LANDSCAPE_CATEGORY;
}

function isMinimalismArtStyle(style) {
  return String(style || '').trim().toLowerCase() === 'minimalism';
}

function titleSuggestsLandscape(title) {
  return LANDSCAPE_KEYWORDS.test(String(title || ''));
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

  if (/\b(mountain|peak|summit)\b/i.test(t)) {
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
 * @param {string} title
 * @param {string} category
 */
function resolveMinimalismSubject(title, category) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const useLandscape =
    isNatureLandscapeCategory(categoryKey) || titleSuggestsLandscape(titleText);

  if (useLandscape) {
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

  const raw = titleText.replace(/\s+/g, ' ').trim();
  return {
    coreSubject: raw,
    styleNorm: 'minimalism',
    resolutionMode: 'minimalism_general',
    isTitleMoodAbstract: false,
    subjectKind: 'minimal_general',
    landscapeFocus: 'form',
    resolvedSubject: `A minimal simplified visual subject inspired by "${raw}", with restrained forms and intentional negative space.`,
    primarySubject:
      'One clear minimal central form or small grouping of forms; quiet visual hierarchy, flat tonal areas, no realistic photo language.',
    supportingMood: extractMinimalMood(titleText),
    subjectScaleMin: 0.55,
    subjectScaleMax: 0.7,
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

function buildMinimalSafeFramingBlock(landscapeFocus) {
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

const MINIMAL_STYLE_DIRECTION = normalizeBlock(`
Style direction:
Minimalist landscape artwork with restrained forms, soft tonal harmony, quiet luxury mood, and intentional negative space.
Use simplified natural shapes, calm horizontal balance, and subtle atmospheric gradients.
Avoid busy detail, dramatic clouds, harsh contrast, realistic photo clutter, object photography language, depth-of-field blur, and decorative excess.
`);

const MINIMAL_COMPOSITION = normalizeBlock(`
Composition:
Single cohesive minimalist composition with one clear visual hierarchy.
The main landscape structure should occupy around 55–70% of the canvas, not more.
Leave generous breathing room above, below, and around the full form.
The horizon and any reflection should feel calm, balanced, and intentional.
Negative space is part of the artwork.
`);

const MINIMAL_RESTRICTIONS_LANDSCAPE = normalizeBlock(`
Restrictions:
No readable text, letters, numbers, logos, labels, watermark, frame, mockup, border, mat, passe-partout, or product presentation.
No people, buildings, boats, animals, roads, signs, or modern elements.
No realistic photography still-life or product-shot framing.
Single flat 2D image only.
Premium fine-art artwork for print.
`);

/**
 * @param {string} title
 * @param {string} category
 * @param {object} blocks
 */
function buildMinimalismPrompt(title, category, blocks = {}) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || '').trim();
  const resolved = resolveMinimalismSubject(titleText, categoryKey);
  const safeFraming =
    blocks.SAFE_PRINT_FRAMING_MINIMAL_LANDSCAPE ||
    buildMinimalSafeFramingBlock(resolved.landscapeFocus);

  return [
    'Premium fine-art artwork for print.',
    `TITLE BRIEF — "${titleText}" defines the exact subject; interpret semantically and never render the words as typography, label text, logo, or caption.`,
    `Resolved minimal subject:\n${resolved.resolvedSubject}`,
    `Subject:\n${resolved.primarySubject}`,
    blocks.MINIMAL_STYLE_DIRECTION || MINIMAL_STYLE_DIRECTION,
    blocks.MINIMAL_COLOR_PALETTE || MINIMAL_COLOR_PALETTE,
    blocks.MINIMAL_COMPOSITION || MINIMAL_COMPOSITION,
    safeFraming,
    blocks.MINIMAL_RESTRICTIONS || MINIMAL_RESTRICTIONS_LANDSCAPE,
    'Ultra-detailed, print-ready.',
  ]
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  NATURE_LANDSCAPE_CATEGORY,
  isNatureLandscapeCategory,
  isMinimalismArtStyle,
  titleSuggestsLandscape,
  resolveMinimalLandscapeFromTitle,
  resolveMinimalismSubject,
  buildMinimalSafeFramingBlock,
  buildMinimalismPrompt,
  MINIMAL_COLOR_PALETTE,
  MINIMAL_STYLE_DIRECTION,
  MINIMAL_COMPOSITION,
  MINIMAL_RESTRICTIONS_LANDSCAPE,
};
