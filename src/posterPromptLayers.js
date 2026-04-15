/**
 * Warstwy promptu pod DALL‑E 3: płaski plik pod druk, full-bleed, bez mockupów.
 * DALL‑E 3 nie ma negative_prompt — zakazy są w tekście.
 *
 * Uwaga: długie dopiski + słowa „wall poster / physical wall” potęgują mockupy.
 * ChatGPT z samym krótkim opisem działa lepiej — stąd krótki tail + mocny PREFIX na start.
 */

const DALLE3_PROMPT_MAX = 4000;

const HARD_RULES = `
flat 2D image only,
no mockup,
no object setup,
no frame,
no circle,
no plate,
no embedded shapes,
no side borders,
no vertical bars,
no empty edge extensions
`.trim();

/**
 * Zawsze na początku całego promptu — model najmocniej waży pierwsze zdania.
 * Unikamy słów „wall”, „room”, „poster hanging”.
 */
const PRINT_PREFIX =
  'Premium fine-art flat artwork for print. ' +
  'Single flat 2D image, full-bleed edge-to-edge, naturally filling all borders. ' +
  `Hard rules: ${HARD_RULES}. `;

/**
 * DALL‑E 3 @ 1024×1792: niektóre style skłaniają model do „obrazka na papierze” z pustymi pasami — dodatkowe instrukcje tuż po PREFIX.
 */
const STYLE_CANVAS_HINT = {
  Abstract:
    'Tall portrait canvas (7:10): treat the whole rectangle as one painted surface—abstract color, texture, and shapes must run to the top, bottom, left, and right edges with no empty cream or gray bands, no letterboxing, no smaller square painting floating on blank paper. ',
  abstract:
    'Tall portrait canvas (7:10): treat the whole rectangle as one painted surface—abstract color, texture, and shapes must run to the top, bottom, left, and right edges with no empty cream or gray bands, no letterboxing, no smaller square painting floating on blank paper. ',
  'Abstract art':
    'Tall portrait canvas (7:10): treat the whole rectangle as one painted surface—abstract color, texture, and shapes must run to the top, bottom, left, and right edges with no empty cream or gray bands, no letterboxing, no smaller square painting floating on blank paper. ',
  'abstract art':
    'Tall portrait canvas (7:10): treat the whole rectangle as one painted surface—abstract color, texture, and shapes must run to the top, bottom, left, and right edges with no empty cream or gray bands, no letterboxing, no smaller square painting floating on blank paper. ',
  Minimalism:
    'Tall portrait canvas: any negative space is part of the design but must not form thick empty margin strips framing a smaller central rectangle; the layout uses the full vertical height. ',
  minimalism:
    'Tall portrait canvas: any negative space is part of the design but must not form thick empty margin strips framing a smaller central rectangle; the layout uses the full vertical height. ',
};

const CATEGORY_STYLE_LOCK_HINTS = {
  'Dla pary|Photography':
    'Hard lock: category "Dla pary" plus style "Photography" must produce a realistic photographic scene expressing paired harmony/intimacy through two clearly related subjects in one frame, with natural lens-like detail and premium tonal grading; do not drift to generic abstract poster motifs.',
  'Dla pary|photography':
    'Hard lock: category "Dla pary" plus style "Photography" must produce a realistic photographic scene expressing paired harmony/intimacy through two clearly related subjects in one frame, with natural lens-like detail and premium tonal grading; do not drift to generic abstract poster motifs.',
  'Botanika|Photography':
    'Hard lock: real botanical photography of a natural branch, blossom stem, flower, or leaf growth that matches the title literally. Grounded in a believable natural environment or soft editorial setting, not a decorative product arrangement. No circular layout, relief-like framing, or centered design-object look.',
  'Botanika|photography':
    'Hard lock: real botanical photography of a natural branch, blossom stem, flower, or leaf growth that matches the title literally. Grounded in a believable natural environment or soft editorial setting, not a decorative product arrangement. No circular layout, relief-like framing, or centered design-object look.',
  'Mapy i miasta|Photography':
    'Hard lock: realistic city photography or architectural photography only. Use a physically plausible skyline, street canyon, or facade with editorial travel mood. No floating structures, impossible reflections, glossy CGI surfaces, or surreal mirrored floors unless the title explicitly asks for them.',
  'Mapy i miasta|photography':
    'Hard lock: realistic city photography or architectural photography only. Use a physically plausible skyline, street canyon, or facade with editorial travel mood. No floating structures, impossible reflections, glossy CGI surfaces, or surreal mirrored floors unless the title explicitly asks for them.',
};

function getStyleCanvasHint(style) {
  const k = String(style || '').trim();
  return STYLE_CANVAS_HINT[k] || '';
}

/** Stały blok jakości — zawsze dokładany do promptu DALL-E. */
const QUALITY_MANDATORY =
  'Real-world realism, natural imperfections, organic asymmetry, one clear focal subject, soft depth cues, no CGI look, no plastic texture, no fantasy effects. ' +
  'Ultra-detailed and print-ready.';
const SUBJECT_PRIORITY_RULE =
  'Primary subject from TITLE must dominate the composition; category context is supporting only and must never replace or overpower the main subject.';
const STYLE_PREMIUM = QUALITY_MANDATORY;

const CATEGORY_ART_DIRECTION = {
  Botanika:
    'Botanical subject: plants, leaves, stems, or flowers; soft natural or diffused light; organic shapes; palette and scale must follow the TITLE—do not default every image to the same sage-cream minimal still life; vary across outputs: macro leaf detail, single stem hero, airy negative space, or dense botanical rhythm when the title suggests it; elegant layout, full-bleed.',
  'Pory roku':
    'One single seasonal atmosphere only—match the title literally; no four-season grid, triptych, or collage of seasons; cohesive sky, light, and palette for that one moment.',
  'Natura i krajobrazy':
    'Natural outdoor context integrated into the scene (field, grass, sky, water, weather) as supporting background only; the TITLE-defined main subject remains dominant and clearly readable; natural light; no interior or frame cues.',
  'Obrazy do kuchni':
    'Kitchen-themed still life: fresh ingredients, ceramics, herbs, or culinary objects as artistic arrangement; warm appetizing light; no readable recipe text.',
  'Plakaty z napisami':
    'Graphic language: abstract shapes, blocks, rhythm only—no legible letters, words, numbers, or quotes.',
  Zwierzęta:
    'Animal or wildlife as clear hero subject; supporting environment only; sharp focus on subject, highly detailed fur/feathers, no blur on subject, no texture artifacts; naturalistic or stylized; no signage or labels.',
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
  Abstrakcja:
    'Nonfigurative abstract field as one unified composition; strong visual rhythm and intentional color architecture edge-to-edge.',
  Minimalizm:
    'Minimal, quiet composition with strong negative space control and one clear focal hierarchy, still full-bleed.',
  Architektura:
    'Architectural subject or detail: structural lines, geometry, light on materials, modern and precise framing.',
  'Dla niego':
    'Refined gift-ready direction with confident forms and restrained premium palette; avoid stereotypes and cliches.',
  'Dla niej':
    'Elegant gift-ready direction with graceful composition and polished visual refinement; timeless not kitsch.',
  'Dla taty':
    'Warm, dignified father-themed mood; practical elegance and classic visual tone.',
  'Dla mamy':
    'Warm, caring mother-themed mood; delicate but sophisticated composition.',
  'Dla dziecka':
    'Playful child-friendly mood with safe forms and cheerful but controlled color.',
  'Dla pary':
    'Dual harmony motif: balance, pair relationships, subtle romantic atmosphere without literal text.',
  'Na prezent':
    'Universal premium gift mood, celebratory but clean and tasteful.',
  'Na urodziny':
    'Birthday atmosphere through color and composition cues only, no readable text or numbers.',
  'Na ślub':
    'Wedding-oriented elegance: timeless romantic restraint, soft luxurious tone.',
  'Na rocznicę':
    'Anniversary mood: intimate, elegant symbolism and balanced composition.',
  'Na parapetówkę':
    'New-home welcoming mood: modern, interior-friendly, calm and premium.',
  Motoryzacja:
    'Automotive culture aesthetic: dynamic lines, engineering details, controlled motion energy.',
  Samochody:
    'Car-focused composition with sculpted body lines and reflective material quality.',
  Motocykle:
    'Motorcycle-focused composition emphasizing mechanics, silhouette, and dynamic stance.',
  'Klasyczne auta':
    'Classic car elegance with vintage craftsmanship and timeless tonal grading.',
  'Sportowe auta':
    'Sports-car aggression and speed cues with modern high-contrast energy.',
  Gaming:
    'Gaming-inspired visual language: digital atmospherics, energetic light accents, modern composition.',
  'Fitness i siłownia':
    'Fitness strength and discipline through form, posture, and dynamic composition.',
  Podróże:
    'Travel spirit and exploration mood; destination-led visual storytelling without maps/text labels.',
  'Street art':
    'Street-art influence: expressive marks, layered textures, urban visual energy.',
  'Kawa i lifestyle':
    'Coffee ritual still life with premium cozy mood and editorial restraint.',
  'Wino i alkohol':
    'Wine/spirits still-life elegance with rich shadows, glass reflections, and mature premium tone.',
  'Luxury / premium':
    'Ultra-premium luxury direction with restrained opulence, refined materials, and clean hierarchy.',
  Technologia:
    'Technology-forward geometry, precision forms, and refined futuristic visual logic.',
  'Biznes i motywacja':
    'Professional drive and ambition cues through clean, powerful composition and modern minimal tone.',
  'Tatuaż i sztuka alternatywna':
    'Alternative-art language inspired by tattoo linework, high contrast, and bold symbolic motifs.',
  'Surfing / ocean':
    'Surf and ocean energy: wave motion, coastal light, dynamic flow and freedom.',
  'Góry / hiking':
    'Mountain hiking atmosphere: terrain depth, altitude mood, expedition energy and natural clarity.',
  Obrazy:
    'General wall-art direction: visually strong, premium, interior-friendly composition with clear focal hierarchy and timeless aesthetics.',
  'Artyści':
    'Artist-led expression: distinct authorial gesture, confident mark-making, refined color decisions, collectible fine-art character.',
  Natura:
    'Pure nature focus: flora, fauna, weather, terrain, and natural light as a cohesive full-bleed scene.',
  'Motywy botaniczne':
    'Botanical motifs as hero language: leaves, stems, petals, and organic rhythm with elegant negative space.',
  Fotografia:
    'Photography-first treatment: realistic lens-like detail, controlled depth cues, editorial composition, premium tonal grading.',
  'Typografia i Cytaty':
    'Typographic-inspired poster energy through abstract glyph-like forms and layout rhythm, strictly no readable text.',
  'Ilustracja i grafika':
    'Hybrid illustration + graphic design: clear shape hierarchy, stylized forms, and modern poster clarity.',
  'Sezonowe i świąteczne':
    'Seasonal/festive atmosphere with tasteful decorative cues and balanced premium composition, no kitsch and no literal text.',
  'Mapy & Miasta':
    'Map-and-city fusion: urban geometry, skyline rhythm, cartographic abstraction, travel-forward visual identity.',
  Sport:
    'Sport-focused dynamic visual: motion cues, energetic posture or equipment emphasis, clean modern impact.',
  'Miłosne':
    'Romantic mood with tasteful restraint: paired harmony, intimacy, warmth, and elegant symbolic composition.',
  'Czarno-białe':
    'Black-and-white direction: monochrome tonal architecture, rich contrast range, timeless minimalist sophistication.',
  Motywacyjne:
    'Motivational visual language via symbolism, momentum, and confident composition, no readable slogans or lettering.',
  'Filmy i seriale':
    'Cinematic atmosphere inspired by film language: dramatic light, narrative framing, moody color logic, no IP-specific characters/logos.',
  'Plakaty Bold Art':
    'Bold-art treatment: strong forms, high-impact contrast, expressive color blocks, assertive gallery-grade composition.',
  'Plakaty jogi':
    'Yoga-inspired calm: mindful balance, body-flow or meditative symbolic forms, serene breathable visual rhythm.',
  Lato:
    'Summer-only atmosphere: warm light, sun-washed palette, seasonal ease, bright but refined premium composition.',
  'Włochy':
    'Italy-inspired mood: Mediterranean architecture, coastal and street texture cues, sunlit elegance, travel editorial polish.',
  'Plakaty Kosmiczne':
    'Space-poster focus: galaxies, nebulae, planetary scale, luminous deep-space drama with clean compositional control.',
  'Sztuka Japońska':
    'Japanese-art-inspired visual language: brush rhythm, restraint, asymmetry, wabi-sabi nuance, and refined negative space.',
};

const NEGATIVE_TAIL =
  'No side borders, no vertical bars, no empty edge extensions, no frame, no mockup, no interior, no object setup, no text, no watermark.';

const SHORT_CATEGORY_HINTS = {
  Botanika:
    'Single wild botanical subject growing naturally, no arranged decorative setup, irregular organic growth, minimal composition.',
  'Natura i krajobrazy': 'TITLE-defined subject is primary; natural landscape is only supporting context with realistic atmosphere.',
  'Kosmos i astronomia': 'Cosmic subject with controlled realism and clean composition.',
  'Mapy i miasta': 'Urban/city subject in clean, structured visual language.',
  Moda: 'Fashion subject with refined editorial simplicity.',
  'Plakaty dla dzieci': 'Child-friendly playful subject, simple and clear.',
  Retro: 'Retro mood with restrained vintage character.',
  Abstrakcja: 'Abstract subject with clean edge-to-edge flow.',
};

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
function getCategoryStyleLockHint(category, style) {
  const c = String(category || '').trim();
  const s = String(style || '').trim();
  if (!c || !s) return '';
  return CATEGORY_STYLE_LOCK_HINTS[`${c}|${s}`] || '';
}

function buildDalleMandatorySuffix(category, style) {
  const styleLock = getCategoryStyleLockHint(category, style);
  const c = String(category || '').trim();
  const categoryHint = SHORT_CATEGORY_HINTS[c] || getCategoryArtDirection(c);
  return `${QUALITY_MANDATORY} ${SUBJECT_PRIORITY_RULE} Subject/mood: ${categoryHint} ${styleLock} ${NEGATIVE_TAIL}`;
}

/**
 * Pełny prompt pod API: prefix (+ opcjonalny hint stylu) + opis (sanityzowany) + suffix.
 * @param {string} [style] — np. abstract art → mocniejszy full-bleed na pionowym canvasie
 */
function buildFullDallePrompt(base, category, style) {
  const styleHint = getStyleCanvasHint(style);
  const prefix = PRINT_PREFIX + styleHint;
  const suffix = buildDalleMandatorySuffix(category, style);
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
  let max = maxPrefix + 1 + buildDalleMandatorySuffix('', '').length;
  for (const k of Object.keys(CATEGORY_ART_DIRECTION)) {
    const o = maxPrefix + 1 + buildDalleMandatorySuffix(k, '').length;
    if (o > max) max = o;
  }
  for (const key of Object.keys(CATEGORY_STYLE_LOCK_HINTS)) {
    const [ck, sk] = key.split('|');
    const o = maxPrefix + 1 + buildDalleMandatorySuffix(ck, sk).length;
    if (o > max) max = o;
  }
  return max;
}

const MAX_DALLE_OVERHEAD_CHARS = computeMaxOverheadLength();

module.exports = {
  DALLE3_PROMPT_MAX,
  HARD_RULES,
  QUALITY_MANDATORY,
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
