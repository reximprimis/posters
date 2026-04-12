/**
 * Warstwy promptu pod DALL‑E 3: płaski plik pod druk, full-bleed, bez mockupów.
 * DALL‑E 3 nie ma negative_prompt — zakazy są w tekście.
 *
 * Uwaga: długie dopiski + słowa „wall poster / physical wall” potęgują mockupy.
 * ChatGPT z samym krótkim opisem działa lepiej — stąd krótki tail + mocny PREFIX na start.
 */

const DALLE3_PROMPT_MAX = 4000;

/**
 * Zawsze na początku całego promptu — model najmocniej waży pierwsze zdania.
 * Unikamy słów „wall”, „room”, „poster hanging”.
 */
const PRINT_PREFIX =
  'The entire output canvas is a single flat image file for professional printing — the artwork pixels only. ' +
  'It is NOT a photograph of a print in a frame, NOT a mockup, NOT an interior scene. ' +
  'No picture frame, mat, passe-partout, white margin band, gray surround, wooden floor, shelf, window, hanging wire, tape, clips, hands, or drop shadow around a smaller picture inside the canvas. ' +
  'The composition fills 100% of the canvas edge-to-edge — one continuous image to all four borders. ';

/**
 * DALL‑E 3 @ 1024×1792: niektóre style skłaniają model do „obrazka na papierze” z pustymi pasami — dodatkowe instrukcje tuż po PREFIX.
 */
const STYLE_CANVAS_HINT = {
  'abstract art':
    'Tall portrait canvas (7:10): treat the whole rectangle as one painted surface—abstract color, texture, and shapes must run to the top, bottom, left, and right edges with no empty cream or gray bands, no letterboxing, no smaller square painting floating on blank paper. ',
  minimalism:
    'Tall portrait canvas: any negative space is part of the design but must not form thick empty margin strips framing a smaller central rectangle; the layout uses the full vertical height. ',
};

function getStyleCanvasHint(style) {
  const k = String(style || '').trim();
  return STYLE_CANVAS_HINT[k] || '';
}

/** Styl premium bez słów „wall”, żeby nie sugerować wnętrza. */
const STYLE_PREMIUM =
  'Premium fine-art print aesthetic: cohesive palette, clean composition, soft controlled light, minimal clutter, gallery-quality reproduction file, desenio-like restraint.';

const CATEGORY_ART_DIRECTION = {
  Botanika:
    'Botanical subject: plants, leaves, stems, or flowers; soft natural or diffused light; organic shapes; palette and scale must follow the TITLE—do not default every image to the same sage-cream minimal still life; vary across outputs: macro leaf detail, single stem hero, airy negative space, or dense botanical rhythm when the title suggests it; elegant layout, full-bleed.',
  'Pory roku':
    'One single seasonal atmosphere only—match the title literally; no four-season grid, triptych, or collage of seasons; cohesive sky, light, and palette for that one moment.',
  'Natura i krajobrazy':
    'Landscape or nature as unified outdoor composition filling the frame: sky, land, water, or weather; natural light; no interior or frame cues.',
  'Obrazy do kuchni':
    'Kitchen-themed still life: fresh ingredients, ceramics, herbs, or culinary objects as artistic arrangement; warm appetizing light; no readable recipe text.',
  'Plakaty z napisami':
    'Graphic language: abstract shapes, blocks, rhythm only—no legible letters, words, numbers, or quotes.',
  Zwierzęta:
    'Animal or wildlife as hero; naturalistic or stylized; environment fills the frame; no signage or labels.',
  'Plakaty dla dzieci':
    'Playful refined art: soft shapes, gentle colors, whimsical subjects; full-bleed single composition.',
  'Mapy i miasta':
    'Map-like abstraction, skyline silhouette, or travel graphic; stylized geography; artistic not infographic.',
  Moda:
    'Fashion-forward graphic or editorial still: garments, accessories, or abstract forms; elegant negative space.',
  Retro:
    'Retro objects or mood (cassette, vinyl, analog textures); warm terracotta, amber, cream, muted teal; nostalgic gradients; no UI mockups.',
  'Kultowe zdjęcia':
    'Iconic timeless mood—stylized classic photography or illustration; no celebrity likeness or trademarks.',
  'Złoto i srebro':
    'Luxury metallics—gold, silver, champagne—with matte neutrals; elegant, not glitter overload.',
  'Kosmos i astronomia':
    'Cosmic scene: stars, nebula, planets, or deep space; rich darks, luminous accents; no sci-fi UI or text.',
  Sporty:
    'Dynamic sports energy: motion, athletic form, or equipment; strong composition; modern colors; flat print look.',
  Muzyka:
    'Music-inspired: instruments, waves, rhythm, or abstract sound visualization; no band logos or album titles.',
  'Plakaty planery':
    'Planner-inspired abstract grid and blocks only—no readable dates or words; clean graphic layout.',
};

const NEGATIVE_TAIL =
  'Do not render: mockup, interior, room, frame, mat, letterbox, letterboxing, pillarboxing, polaroid border, floating card on gray, empty margin strips, thick blank bands above and below the motif, hands, table, tape, clip, watermark, logo, legible text.';

function getCategoryArtDirection(category) {
  const key = String(category || '').trim();
  if (CATEGORY_ART_DIRECTION[key]) return CATEGORY_ART_DIRECTION[key];
  return 'Premium print composition for the category; modern, balanced, edge-to-edge artwork.';
}

/** Zamiana fraz, które w połączeniu z DALL‑E często kończą się mockupem (jak w wyjściu z mini). */
function sanitizeCreativePrompt(text) {
  let s = String(text || '').trim();
  if (!s) return s;
  const reps = [
    [/\bbotanical wall poster\b/gi, 'botanical artwork filling the entire frame'],
    [/\bwall poster\b/gi, 'full-bleed print artwork'],
    [/\bwall art\b/gi, 'print artwork'],
    [/\bfor (?:the )?wall\b/gi, 'for reproduction'],
    [/\binto the viewer'?s space\b/gi, 'as one unified composition'],
    [/\bviewer'?s space\b/gi, 'composition'],
    [/\bbotanical-themed display\b/gi, 'botanical subject'],
    [/\bthemed display\b/gi, 'subject'],
    [/\bfine-art presentation\b/gi, 'fine-art print'],
    [/\bfor (?:a |an |the )?botanical-themed display\b/gi, ''],
    [/\bperfect for (?:a |an |the )?[^.,;]+/gi, ''],
    [/\bsuitable for (?:a |an |the )?[^.,;]+/gi, ''],
    [/\bshowcase\b/gi, 'composition'],
    [/\bretail (?:setting|scene)\b/gi, ''],
    [/\bcollector piece\b/gi, 'artwork'],
  ];
  for (const [re, to] of reps) s = s.replace(re, to);
  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Krótki dopisek (kategoria + zakazy). Bez powielania całego bloku z PREFIX.
 */
function buildDalleMandatorySuffix(category) {
  return `${STYLE_PREMIUM} Subject/mood: ${getCategoryArtDirection(category)} ${NEGATIVE_TAIL}`;
}

/**
 * Pełny prompt pod API: prefix (+ opcjonalny hint stylu) + opis (sanityzowany) + suffix.
 * @param {string} [style] — np. abstract art → mocniejszy full-bleed na pionowym canvasie
 */
function buildFullDallePrompt(base, category, style) {
  const styleHint = getStyleCanvasHint(style);
  const prefix = PRINT_PREFIX + styleHint;
  const suffix = buildDalleMandatorySuffix(category);
  const overhead = prefix.length + 1 + suffix.length;
  let b = sanitizeCreativePrompt(base);
  const maxBase = DALLE3_PROMPT_MAX - overhead;
  if (b.length > maxBase) {
    b = `${b.slice(0, Math.max(0, maxBase - 1))}…`;
  }
  return `${prefix}${b} ${suffix}`.replace(/\s{2,}/g, ' ').trim();
}

function computeMaxOverheadLength() {
  const maxStyleHintLen = Math.max(0, ...Object.values(STYLE_CANVAS_HINT).map((s) => s.length));
  const maxPrefix = PRINT_PREFIX.length + maxStyleHintLen;
  let max = maxPrefix + 1 + buildDalleMandatorySuffix('').length;
  for (const k of Object.keys(CATEGORY_ART_DIRECTION)) {
    const o = maxPrefix + 1 + buildDalleMandatorySuffix(k).length;
    if (o > max) max = o;
  }
  return max;
}

const MAX_DALLE_OVERHEAD_CHARS = computeMaxOverheadLength();

module.exports = {
  DALLE3_PROMPT_MAX,
  STYLE_PREMIUM,
  CATEGORY_ART_DIRECTION,
  NEGATIVE_TAIL,
  PRINT_PREFIX,
  getStyleCanvasHint,
  getCategoryArtDirection,
  sanitizeCreativePrompt,
  buildDalleMandatorySuffix,
  buildFullDallePrompt,
  /** @deprecated użyj MAX_DALLE_OVERHEAD_CHARS */
  MAX_APPENDIX_LEN: MAX_DALLE_OVERHEAD_CHARS,
  MAX_DALLE_OVERHEAD_CHARS,
};
