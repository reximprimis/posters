/**
 * Title → concrete photographable subject for image prompts.
 * Abstract / seasonal / mood-only titles are resolved to physical hero objects.
 */

const MOOD_STOP_WORDS = new Set([
  'faded',
  'dream',
  'dreams',
  'memories',
  'memory',
  'moments',
  'moment',
  'vintage',
  'retro',
  'classic',
  'nostalgic',
  'nostalgia',
  'soft',
  'warm',
  'cool',
  'elegant',
  'beautiful',
  'gentle',
  'quiet',
  'calm',
  'timeless',
  'glow',
  'vibes',
  'mood',
  'study',
  'harmony',
  'silence',
  'spirit',
  'rhythm',
  'energy',
  'aura',
  'whisper',
  'tale',
  'story',
  'journey',
  'horizon',
  'light',
  'premium',
  'fine',
  'art',
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'with',
  'for',
  'on',
  'in',
  'at',
  'to',
  'from',
]);

/** Cannot be the sole physical hero subject. */
const ABSTRACT_SUBJECT_WORDS = new Set([
  'summer',
  'winter',
  'spring',
  'autumn',
  'fall',
  'memories',
  'memory',
  'dreams',
  'dream',
  'mood',
  'silence',
  'calm',
  'nostalgia',
  'warmth',
  'morning',
  'evening',
  'freedom',
  'peace',
  'joy',
  'sepia',
  'faded',
  'retro',
  'vintage',
  'past',
  'time',
  'quiet',
  'soft',
  'gentle',
  'warm',
  'cool',
  'elegant',
  'beautiful',
  'timeless',
  'spirit',
  'harmony',
  'aura',
  'moments',
  'moment',
  'vibes',
  'glow',
  'classic',
  'nostalgic',
]);

const TITLE_CONSISTENCY_GUARD = normalizeBlock(`
Title-to-subject consistency: build one concrete photographable hero subject from the title.
If interpret literally is active, literal does not mean using an abstract word (Summer, Dreams, Nostalgia) as the object — it means preserving the title's intent and resolving it into a physical subject when needed.
Mood, styling, palette, and era enrich the scene but must not replace the hero subject.
Do not substitute unrelated nostalgic props (e.g. cassette tape when the title is about polaroids or summer memories).
Supporting objects remain secondary and optional only.
`);

const ABSTRACT_RESOLUTION_NOTE = normalizeBlock(`
ABSTRACT TITLE RESOLUTION: When the title is emotional, seasonal, or mood-led, resolve it into a concrete physical hero subject aligned with the title, category, and style — never leave an abstract word as the sole subject.
`);

const NOSTALGIC_UNBRANDED_PROPS = normalizeBlock(`
Nostalgic object photography: any object that could carry text or branding must be unbranded, blank, without readable markings, labels, logos, or packaging copy; turn label sides away from the camera when needed.
Never render readable text on object surfaces.
Do not use a cassette tape as a generic nostalgia fallback unless the title explicitly suggests cassette, tape, mixtape, audio, music, or recording.
`);

function normalizeBlock(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeTitle(title) {
  return String(title || '')
    .replace(/['']/g, "'")
    .split(/[\s\-–—/,]+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
    .filter(Boolean);
}

function extractCoreNounPhrase(title) {
  const tokens = tokenizeTitle(title);
  const kept = tokens.filter((t) => !MOOD_STOP_WORDS.has(t.toLowerCase()));
  if (kept.length > 0) return kept.join(' ');
  return tokens.join(' ') || String(title || '').trim();
}

function isAbstractToken(word) {
  const w = String(word || '').toLowerCase();
  return ABSTRACT_SUBJECT_WORDS.has(w) || MOOD_STOP_WORDS.has(w);
}

function isAbstractCorePhrase(core) {
  const tokens = String(core || '')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => isAbstractToken(t));
}

/** Title reads as mood/season/emotion — needs concrete subject resolution. */
function shouldResolveAsAbstract(title, rawCore) {
  const t = String(title || '').toLowerCase();
  if (isAbstractCorePhrase(rawCore)) return true;
  if (/\b(dream|dreams|memories|memory|nostalgia|mood|silence|calm|peace|joy|freedom)\b/i.test(t)) {
    return true;
  }
  if (/\bsummer\b/i.test(t) && !/\b(towel|sandcastle|lemonade)\b/i.test(t)) return true;
  if (/\bsepia\b/i.test(t) && /\b(analog|dream)/i.test(t)) return true;
  if (/\b(morning|evening)\b/i.test(t) && /\b(quiet|nostalg|calm|soft|retro)\b/i.test(t)) {
    return true;
  }
  return false;
}

function titleImpliesCassette(title) {
  const t = String(title || '').toLowerCase();
  if (/\b(cassette|cassettes|mixtape|audio\s+tape|tape\s+reel|walkman|boombox|recording)\b/i.test(t)) {
    return true;
  }
  if (/\btape\b/i.test(t) && /\b(music|audio|mix|record|retro)\b/i.test(t)) return true;
  return false;
}

function extractSupportingMood(title) {
  const tokens = tokenizeTitle(title);
  const moodWords = tokens.filter(
    (t) => isAbstractToken(t) && !MOOD_STOP_WORDS.has(t.toLowerCase()) && t.length > 2
  );
  const t = String(title || '').toLowerCase();
  const bits = [];
  if (moodWords.length) bits.push(moodWords.join(', '));
  if (/\bsepia\b/i.test(t)) bits.push('sepia-toned warmth');
  if (/\bsummer\b/i.test(t)) bits.push('warm summer atmosphere');
  if (/\bwinter\b/i.test(t)) bits.push('cool winter stillness');
  if (/\bretro\b/i.test(t)) bits.push('retro nostalgic character');
  if (/\bfaded\b/i.test(t)) bits.push('sun-faded, gently aged tones');
  if (/\bquiet\b/i.test(t)) bits.push('quiet calm mood');
  if (/\bmorning\b/i.test(t)) bits.push('soft morning light');
  if (/\bevening\b/i.test(t)) bits.push('gentle evening atmosphere');
  return normalizeBlock(bits.join('; ') || 'Premium calm editorial mood aligned with the title.');
}

/**
 * @param {string} title
 * @returns {string|null}
 */
function detectPhysicalSubjectKind(title) {
  const t = String(title || '').toLowerCase();
  if (/\b(polaroid|polaroids|instant\s+photo(?:graph)?s?)\b/i.test(t)) return 'polaroid';
  if (titleImpliesCassette(t)) return 'cassette';
  if (/\b(vinyl|record|lp\b|turntable)\b/i.test(t)) return 'vinyl';
  if (/\b(film\s+camera|instant\s+camera|analog\s+camera|retro\s+camera)\b/i.test(t)) return 'camera';
  if (
    /\b(cherry\s+blossom|magnolia|blossom|branch|petal|stem|flower|botanical|rose|tulip|peony|orchid|wildflower|bud|leaf|leaves|bloom)\b/i.test(
      t
    )
  ) {
    return 'botanical';
  }
  if (/\b(car|automobile|vehicle|motorcycle|aircraft|plane|boat|yacht|truck)\b/i.test(t)) return 'vehicle';
  if (/\b(skyline|cityscape|street|facade|architecture|map)\b/i.test(t)) return 'urban';
  if (/\b(planet|moon|nebula|galaxy|cosmos|star|astronomy|celestial)\b/i.test(t)) return 'cosmic';
  if (/\b(postcard)\b/i.test(t)) return 'postcard';
  if (/\b(sunglasses|eyeglasses)\b/i.test(t)) return 'sunglasses';
  if (/\b(towel|swim|beach)\b/i.test(t) && !isAbstractCorePhrase(extractCoreNounPhrase(title))) return 'beach_object';
  return null;
}

/**
 * @param {string} title
 * @returns {{ primary: string, resolvedSubject: string, secondary?: string, subjectKind: string }}
 */
function buildPhysicalPrimarySubject(title) {
  const titleText = String(title || '').trim();
  const kind = detectPhysicalSubjectKind(titleText);
  const t = titleText.toLowerCase();

  if (kind === 'polaroid') {
    return {
      subjectKind: 'polaroid',
      resolvedSubject:
        'A small arrangement of vintage instant photographs / polaroid-style prints placed naturally on a soft surface.',
      primary: normalizeBlock(`
        Vintage instant photographs / polaroid-style prints as the clear hero subject, suggesting "${titleText}".
        Unbranded blank white borders; no readable photos, faces, handwriting, logos, or text on print surfaces.
      `),
      secondary:
        'Do not replace polaroid prints with cassette tapes, vinyl, or other unrelated retro props unless the title names them.',
    };
  }

  if (kind === 'cassette') {
    return {
      subjectKind: 'cassette',
      resolvedSubject: 'An unbranded vintage cassette tape placed naturally on a soft surface.',
      primary: normalizeBlock(`
        An unbranded vintage cassette tape as the clear hero subject for "${titleText}".
        Blank label side or cassette turned so no readable markings face the camera.
      `),
    };
  }

  if (kind === 'vinyl') {
    return {
      subjectKind: 'vinyl',
      resolvedSubject: 'An unbranded vinyl record or premium retro turntable still life.',
      primary:
        'An unbranded vinyl record or turntable still life as the hero subject; no readable label text or brand markings.',
    };
  }

  if (kind === 'camera') {
    return {
      subjectKind: 'camera',
      resolvedSubject: 'A vintage unbranded analog or instant film camera.',
      primary:
        'A vintage analog or instant film camera as the hero subject; unbranded body, no readable dials or logos facing camera.',
    };
  }

  if (kind === 'botanical') {
    const core = extractCoreNounPhrase(titleText);
    return {
      subjectKind: 'botanical',
      resolvedSubject: `A natural botanical subject: ${core}.`,
      primary: normalizeBlock(`
        A natural botanical hero subject depicting ${core} exactly as named in the title — blossom-led branch, stem, flower, or leaf growth as the clear focal subject.
        Natural growth flow, not a decorative product arrangement.
      `),
    };
  }

  if (kind === 'vehicle') {
    return {
      subjectKind: 'vehicle',
      resolvedSubject: 'One complete hero vehicle matching the title.',
      primary:
        'One complete hero vehicle with full silhouette visible; no brand logos, readable badges, or license plates.',
    };
  }

  if (kind === 'urban') {
    return {
      subjectKind: 'urban',
      resolvedSubject: 'An urban or architectural hero subject matching the title.',
      primary: 'Skyline, street, facade, or city detail as the primary photographic subject.',
    };
  }

  if (kind === 'cosmic') {
    return {
      subjectKind: 'cosmic',
      resolvedSubject: 'A cosmic focal subject matching the title.',
      primary: 'One dominant celestial subject — planet, moon, nebula, or deep-space landscape.',
    };
  }

  if (kind === 'postcard') {
    return {
      subjectKind: 'postcard',
      resolvedSubject: 'An old unbranded postcard with no readable text.',
      primary:
        'A vintage blank postcard as the hero object on a soft surface; no readable writing, stamps with text, or logos.',
    };
  }

  if (kind === 'sunglasses') {
    return {
      subjectKind: 'sunglasses',
      resolvedSubject: 'Vintage sunglasses without logo on a soft surface.',
      primary: 'Unbranded vintage sunglasses as the hero object; no readable brand markings.',
    };
  }

  return null;
}

/**
 * @param {string} title
 * @param {string} category
 * @param {string} style
 */
function resolveAbstractRetroPhotography(title) {
  const t = String(title || '').toLowerCase();
  const supportingMood = extractSupportingMood(title);

  if (/\bsepia\b/i.test(t) && /\b(analog|dream)/i.test(t)) {
    return {
      resolvedSubject: 'A vintage unbranded analog camera or a faded sepia-toned photo print.',
      primarySubject:
        'A single vintage analog camera placed naturally on a warm neutral surface, or one sepia-toned blank photo print as the clear hero object.',
      supportingMood: supportingMood || 'Soft sepia warmth, analog nostalgia, gentle faded tones.',
    };
  }

  if (/\bsummer\b/i.test(t) || (/\bmemor/i.test(t) && /\b(summer|sun|beach|warm)\b/i.test(t))) {
    return {
      resolvedSubject: 'A single faded vintage summer photograph placed naturally on a soft surface.',
      primarySubject:
        'A sun-faded analog photo print suggesting a warm summer memory, clearly the hero subject, with no readable text or markings on the print.',
      supportingMood: supportingMood || 'Warm faded summer atmosphere, soft nostalgic light, sun-bleached cream tones.',
    };
  }

  if (/\b(morning|breakfast|dawn)\b/i.test(t) && /\b(quiet|retro|nostalg|calm|soft)\b/i.test(t)) {
    return {
      resolvedSubject: 'A warm ceramic coffee cup beside a blank vintage photo print on a softly lit table.',
      primarySubject:
        'One physical still-life (coffee cup and blank vintage photo print) that communicates a quiet retro morning — clearly the hero grouping.',
      supportingMood: supportingMood || 'Quiet morning calm, soft window light, warm neutral palette.',
    };
  }

  if (/\b(memor|nostalg|faded|past)\b/i.test(t)) {
    return {
      resolvedSubject: 'A small arrangement of faded vintage instant photographs or analog photo prints on a soft surface.',
      primarySubject:
        'Sun-faded vintage photo prints or polaroid-style blank instant prints as the hero subject; unbranded, no readable images, faces, or text.',
      supportingMood: supportingMood,
    };
  }

  return {
    resolvedSubject: 'A single faded vintage photograph or neutral retro still-life object on a soft surface.',
    primarySubject:
      'One sun-faded analog photo print or simple unbranded retro object as the hero subject; no cassette unless the title names tape or music.',
    supportingMood: supportingMood,
  };
}

/**
 * @param {string} title
 * @param {string} category
 * @param {string} style
 */
function resolveAbstractByCategory(title, category, style) {
  const categoryKey = String(category || '').trim();
  const styleLower = String(style || '').trim().toLowerCase();
  const supportingMood = extractSupportingMood(title);

  if (categoryKey === 'Retro' && styleLower === 'photography') {
    return resolveAbstractRetroPhotography(title);
  }

  if (isBotanicalCategory(categoryKey)) {
    return {
      resolvedSubject: 'A natural botanical branch or blossom still life suggesting the title mood.',
      primarySubject:
        'A single natural flower branch or stem in soft editorial light as the hero subject, not an abstract mood word.',
      supportingMood,
    };
  }

  return {
    resolvedSubject: 'A single concrete still-life or photographic object that embodies the title mood on a soft surface.',
    primarySubject:
      'One physical hero object or small still-life grouping — never an abstract concept rendered as text or empty symbolism.',
    supportingMood,
  };
}

function isBotanicalCategory(category) {
  return String(category || '').trim() === 'Botanika';
}

const {
  isMinimalismArtStyle,
  resolveMinimalismSubject,
  buildMinimalismPrompt,
} = require('./minimalismSubject');

function normalizeArtStyle(style) {
  const s = String(style || '').trim().toLowerCase();
  if (s === 'abstract art' || s === 'abstract') return 'abstract';
  if (s === 'photography') return 'photography';
  if (s === 'minimalism') return 'minimalism';
  return s || 'photography';
}

function isAbstractArtStyle(style) {
  return normalizeArtStyle(style) === 'abstract';
}

/**
 * Fine-art abstract interpretation — not physical still-life.
 * @param {string} title
 */
function resolveRetroAbstractFineArt(title) {
  const t = String(title || '').toLowerCase();
  const supportingMood = extractSupportingMood(title);

  if (/\b(polaroid|polaroids|instant\s+photo)/i.test(t)) {
    return {
      resolvedSubject:
        'An abstract fine-art composition inspired by faded polaroid-style instant photographs, memory fragments, soft rectangular photo-like forms, and sun-washed nostalgic layers.',
      primarySubject: normalizeBlock(`
        Layered abstract rectangular forms suggesting vintage instant photo prints, with faded image-like color fields inside them.
        The composition should evoke a dreamlike retro memory without readable text, faces, logos, handwriting, or literal product photography.
      `),
      supportingMood: supportingMood || 'Faded reverie, sun-washed nostalgia, soft retro memory mood.',
      subjectKind: 'abstract_polaroid',
    };
  }

  if (titleImpliesCassette(t)) {
    return {
      resolvedSubject:
        'An abstract fine-art composition inspired by vintage cassette tape geometry, analog music nostalgia, and retro rectangular forms — non-representational, not a literal cassette product photo.',
      primarySubject:
        'Soft abstract rectangular and circular forms echoing tape reels and cassette silhouettes with faded retro color fields; no readable label text or realistic product shot.',
      supportingMood,
      subjectKind: 'abstract_cassette',
    };
  }

  if (/\b(vinyl|record)\b/i.test(t)) {
    return {
      resolvedSubject:
        'An abstract fine-art composition inspired by vinyl record geometry, circular grooves, and warm analog nostalgia as layered forms.',
      primarySubject:
        'Abstract circular and arc forms suggesting a vinyl record as color and texture, not a literal product photograph.',
      supportingMood,
      subjectKind: 'abstract_vinyl',
    };
  }

  if (/\bsepia\b/i.test(t) || /\banalog\b/i.test(t)) {
    return {
      resolvedSubject:
        'An abstract fine-art composition inspired by sepia analog memory, faded paper texture, and soft rectangular photo-like fragments.',
      primarySubject:
        'Layered sepia-toned color fields and paper-like textures with subtle grain; non-representational but title-aligned.',
      supportingMood,
      subjectKind: 'abstract_sepia',
    };
  }

  if (/\bsummer\b/i.test(t) || /\b(memor|reverie|nostalg)/i.test(t)) {
    return {
      resolvedSubject:
        'An abstract fine-art composition inspired by faded summer memories, sun-bleached color fields, and gentle nostalgic layers.',
      primarySubject:
        'Soft sun-washed abstract color planes in cream, amber, and dusty peach suggesting warmth and memory without literal objects on a table.',
      supportingMood,
      subjectKind: 'abstract_memory',
    };
  }

  return {
    resolvedSubject:
      'An abstract fine-art retro composition with layered forms, faded color fields, analog grain, and structured visual hierarchy inspired by the title mood.',
    primarySubject:
      'Non-representational abstract shapes and textures that evoke the title emotionally — inspired by, not literally depicting objects on a surface.',
    supportingMood,
    subjectKind: 'abstract_retro',
  };
}

/**
 * @param {string} title
 * @param {string} category
 */
function resolveAbstractFineArtSubject(title, category) {
  const titleText = String(title || '').trim();
  const rawCore = extractCoreNounPhrase(titleText);
  const supportingMood = extractSupportingMood(titleText);
  const categoryKey = String(category || '').trim();

  if (categoryKey === 'Retro') {
    const retro = resolveRetroAbstractFineArt(titleText);
    return {
      coreSubject: rawCore,
      styleNorm: 'abstract',
      resolutionMode: 'abstract_fine_art',
      isTitleMoodAbstract: true,
      ...retro,
    };
  }

  if (isBotanicalCategory(categoryKey)) {
    return {
      coreSubject: rawCore,
      styleNorm: 'abstract',
      resolutionMode: 'abstract_fine_art',
      isTitleMoodAbstract: true,
      resolvedSubject: `An abstract fine-art botanical composition inspired by ${rawCore}, with organic flowing forms and soft natural color fields.`,
      primarySubject:
        'Abstract organic shapes suggesting petals, stems, and growth rhythm — inspired by the title, not literal botanical product photography.',
      supportingMood,
      subjectKind: 'abstract_botanical',
    };
  }

  return {
    coreSubject: rawCore,
    styleNorm: 'abstract',
    resolutionMode: 'abstract_fine_art',
    isTitleMoodAbstract: true,
    resolvedSubject: `An abstract fine-art composition inspired by "${titleText}", with layered forms, disciplined color harmony, and full-frame abstract layout.`,
    primarySubject:
      'Non-representational abstract forms with clear visual hierarchy; title-aligned mood through color and geometry only.',
    supportingMood,
    subjectKind: 'abstract_general',
  };
}

/**
 * Photography / representational styles — physical or resolved concrete subjects.
 */
function resolveRepresentationalSubject(title, category = '', style = '') {
  const titleText = String(title || '').trim();
  const rawCore = extractCoreNounPhrase(titleText);
  const supportingMood = extractSupportingMood(titleText);
  const styleNorm = normalizeArtStyle(style);

  const physical = buildPhysicalPrimarySubject(titleText);
  if (physical) {
    return {
      coreSubject: rawCore,
      styleNorm,
      resolutionMode: 'photography_physical',
      isTitleMoodAbstract: false,
      resolvedSubject: physical.resolvedSubject,
      primarySubject: physical.primary,
      supportingMood,
      secondary: physical.secondary,
      subjectKind: physical.subjectKind,
    };
  }

  if (!shouldResolveAsAbstract(titleText, rawCore) && rawCore.length > 2) {
    return {
      coreSubject: rawCore,
      styleNorm,
      resolutionMode: 'photography_concrete',
      isTitleMoodAbstract: false,
      resolvedSubject: `A concrete subject depicting: ${rawCore}.`,
      primarySubject: normalizeBlock(`
        A single clear hero subject that depicts "${rawCore}" as a physical, photographable object or scene from the title "${titleText}".
      `),
      supportingMood,
      subjectKind: 'concrete_core',
    };
  }

  const abstract = resolveAbstractByCategory(titleText, category, style);
  return {
    coreSubject: rawCore,
    styleNorm,
    resolutionMode: 'photography_mood_resolved',
    isTitleMoodAbstract: true,
    resolvedSubject: abstract.resolvedSubject,
    primarySubject: abstract.primarySubject,
    supportingMood: abstract.supportingMood || supportingMood,
    subjectKind: 'abstract_resolved',
  };
}

/**
 * STYLE-SPECIFIC SUBJECT RESOLUTION
 * @param {string} title
 * @param {string} [category]
 * @param {string} [style]
 */
function resolveConcreteSubject(title, category = '', style = '') {
  if (isMinimalismArtStyle(style)) {
    return resolveMinimalismSubject(title, category);
  }
  if (isAbstractArtStyle(style)) {
    return resolveAbstractFineArtSubject(title, category);
  }
  return resolveRepresentationalSubject(title, category, style);
}

/**
 * @param {object} resolved
 * @param {string} style
 */
function logStyleSubjectResolution(resolved, style, category = '') {
  const { getSafeFramingMeta } = require('./safePrintFraming');
  const styleNorm = normalizeArtStyle(style);
  const label = styleNorm.charAt(0).toUpperCase() + styleNorm.slice(1);
  console.log(`    -> Style-specific subject resolution: ${label}`);
  if (isMinimalismArtStyle(style)) {
    console.log(`    -> Resolved minimal subject: ${resolved.resolvedSubject}`);
    const min = resolved.subjectScaleMin != null ? Math.round(resolved.subjectScaleMin * 100) : 55;
    const max = resolved.subjectScaleMax != null ? Math.round(resolved.subjectScaleMax * 100) : 70;
    console.log(`    -> Subject scale target: ${min}–${max}%`);
    const framingMeta = getSafeFramingMeta(category, style);
    if (framingMeta.enabled) {
      console.log(`    -> Safe framing: ${framingMeta.logLabel}`);
    }
  } else if (isAbstractArtStyle(style)) {
    console.log(`    -> Resolved abstract subject: ${resolved.resolvedSubject}`);
  } else {
    console.log(`    -> Resolved core subject: ${resolved.resolvedSubject}`);
  }
}

/**
 * @param {string} title
 * @param {{ literal?: boolean, category?: string, style?: string }} [options]
 */
function buildTitleBriefBlock(title, options = {}) {
  const titleText = String(title || '').trim();
  const literal = options.literal !== false;
  const category = options.category != null ? String(options.category) : '';
  const style = options.style != null ? String(options.style) : '';
  const resolved = resolveConcreteSubject(titleText, category, style);

  if (isMinimalismArtStyle(style)) {
    const lines = [
      `TITLE BRIEF — "${titleText}" defines the exact subject; interpret semantically and never render the words as typography, label text, logo, or caption.`,
      `Resolved minimal subject:\n${resolved.resolvedSubject}`,
      `Subject:\n${resolved.primarySubject}`,
    ];
    if (resolved.supportingMood) {
      lines.push(`Supporting mood: ${resolved.supportingMood}`);
    }
    return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  if (isAbstractArtStyle(style)) {
    const lines = [
      `TITLE BRIEF — "${titleText}" defines the exact subject; interpret semantically, not as typography, label text, logo, or caption.`,
      `Resolved abstract subject:\n${resolved.resolvedSubject}`,
      `Subject:\n${resolved.primarySubject}`,
      `Supporting mood: ${resolved.supportingMood}`,
    ];
    return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  const lines = [
    literal
      ? `TITLE BRIEF — "${titleText}" defines the exact subject; interpret literally.`
      : `Subject brief based on title "${titleText}", interpret semantically and never render the words as typography, label text, logo, or caption.`,
    ABSTRACT_RESOLUTION_NOTE,
    `Resolved core subject: ${resolved.resolvedSubject}`,
    `Subject: ${resolved.primarySubject}`,
    `Supporting mood: ${resolved.supportingMood}`,
    TITLE_CONSISTENCY_GUARD,
  ];
  if (resolved.secondary) lines.push(resolved.secondary);
  return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildRetroPhotographyPrompt(title, blocks) {
  const titleText = String(title || '').trim();
  const { COMPOSITION_GENERAL, SAFE_PRINT_FRAMING, RESTRICTIONS_BLOCK } = blocks;

  return [
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: 'Retro', style: 'Photography' }),
    normalizeBlock(`
      Style direction:
      Realistic photography with analog realism, subtle film grain, and slight imperfections.
      Warm faded tones: beige, brown, muted orange, soft cream.
      Soft natural light with gentle shadows. Believable lens detail and natural depth of field.
    `),
    NOSTALGIC_UNBRANDED_PROPS,
    'Full-bleed background only, no frame, no text, no modern elements.',
    COMPOSITION_GENERAL,
    SAFE_PRINT_FRAMING,
    RESTRICTIONS_BLOCK,
    'Ultra-detailed, print-ready.',
  ]
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildRetroAbstractPrompt(title, blocks) {
  const titleText = String(title || '').trim();
  const { COMPOSITION_ABSTRACT, SAFE_PRINT_FRAMING_ABSTRACT, RESTRICTIONS_ABSTRACT } = blocks;

  return [
    'Premium fine-art artwork for print.',
    buildTitleBriefBlock(titleText, { literal: false, category: 'Retro', style: 'Abstract' }),
    normalizeBlock(`
      Style direction:
      Abstract retro fine-art composition.
      Soft faded geometry, imperfect analog edges, subtle film-grain texture, gentle paper-like surfaces, and warm nostalgic color fields.
      Color palette: cream, beige, faded amber, muted terracotta, soft brown, dusty peach, and subtle muted teal.
      No realistic still-life setup, no physical table scene, no product-shot composition, no object photography language.
    `),
    COMPOSITION_ABSTRACT,
    SAFE_PRINT_FRAMING_ABSTRACT,
    RESTRICTIONS_ABSTRACT,
    'Ultra-detailed, print-ready.',
  ]
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** @deprecated Use resolveConcreteSubject */
function buildLiteralPrimarySubject(title) {
  const r = resolveConcreteSubject(title, 'Retro', 'Photography');
  return {
    subjectKind: r.subjectKind,
    primary: r.primarySubject,
    secondary: r.secondary,
  };
}

module.exports = {
  TITLE_CONSISTENCY_GUARD,
  ABSTRACT_RESOLUTION_NOTE,
  NOSTALGIC_UNBRANDED_PROPS,
  tokenizeTitle,
  extractCoreNounPhrase,
  isAbstractCorePhrase,
  shouldResolveAsAbstract,
  titleImpliesCassette,
  detectPhysicalSubjectKind,
  normalizeArtStyle,
  isAbstractArtStyle,
  resolveAbstractFineArtSubject,
  resolveRepresentationalSubject,
  resolveConcreteSubject,
  logStyleSubjectResolution,
  buildLiteralPrimarySubject,
  buildTitleBriefBlock,
  buildRetroPhotographyPrompt,
  buildRetroAbstractPrompt,
  buildMinimalismPrompt,
  isMinimalismArtStyle,
  resolveMinimalismSubject,
};
