const OpenAI = require('openai');
const config = require('../config');
const { resolveDesignMdUrl, fetchDesignMdBody } = require('./designMd');
const {
  getCategoryArtDirection,
  STYLE_PREMIUM,
  sanitizeCreativePrompt,
} = require('./posterPromptLayers');
const { buildTitleBriefBlock } = require('./titleSubjectConsistency');
const { routePromptBuildResult, usesStructuredPrompt } = require('./promptRouter');
const { assertCategoryStyleAllowed } = require('./categoryStyles');
const { PROMPT_BUILDER_VERSION } = require('./posterMetadata');

function buildCoreCreativePrompt({ title, category, style }) {
  return routePromptBuildResult({ category, style, title });
}

/** When no LLM API is configured, still produce a real DALL-E poster prompt (not a raw keyword list from config). */
const STYLE_EXECUTION = {
  Photography:
    'real-world botanical/editorial photography, crisp detail, one hero focal subject in focus with soft background blur, natural imperfections and slight asymmetry, flat scene composition rendered as 2D print art, never product photo or physical arrangement, no CGI/plastic look, no glow, no fantasy lighting',
  photography:
    'real-world botanical/editorial photography, crisp detail, one hero focal subject in focus with soft background blur, natural imperfections and slight asymmetry, flat scene composition rendered as 2D print art, never product photo or physical arrangement, no CGI/plastic look, no glow, no fantasy lighting',
  'Abstract art':
    'abstract composition as one continuous painted surface filling the tall portrait frame—color fields, shapes, texture, and rhythm reach all four edges; no centered square picture on empty paper, no wide blank strips top or bottom; non-literal but physically edge-to-edge like ink or paint on the full print sheet',
  'abstract art':
    'abstract composition as one continuous painted surface filling the tall portrait frame—color fields, shapes, texture, and rhythm reach all four edges; no centered square picture on empty paper, no wide blank strips top or bottom; non-literal but physically edge-to-edge like ink or paint on the full print sheet',
  Abstract:
    'abstract composition as one continuous painted surface filling the tall portrait frame—color fields, shapes, texture, and rhythm reach all four edges; no centered square picture on empty paper, no wide blank strips top or bottom; non-literal but physically edge-to-edge like ink or paint on the full print sheet',
  abstract:
    'abstract composition as one continuous painted surface filling the tall portrait frame—color fields, shapes, texture, and rhythm reach all four edges; no centered square picture on empty paper, no wide blank strips top or bottom; non-literal but physically edge-to-edge like ink or paint on the full print sheet',
  Minimalism: 'ultra-clean minimal forms, generous negative space, one or few restrained focal elements',
  minimalism: 'ultra-clean minimal forms, generous negative space, one or few restrained focal elements',
  Watercolor: 'watercolor pigment on paper texture filling the frame, soft washes, luminous transparent color',
  watercolor: 'watercolor pigment on paper texture filling the frame, soft washes, luminous transparent color',
  'Line art': 'refined ink line drawing, elegant contours, monochrome or sparse accent color, rich whitespace',
  'line art': 'refined ink line drawing, elegant contours, monochrome or sparse accent color, rich whitespace',
  Illustration: 'polished editorial illustration, cohesive stylization, contemporary print illustration finish',
  illustration: 'polished editorial illustration, cohesive stylization, contemporary print illustration finish',
  'Graphic design': 'bold graphic poster language, flat planes of color, contemporary Swiss-poster clarity',
  'graphic design': 'bold graphic poster language, flat planes of color, contemporary Swiss-poster clarity',
  'Digital art': 'refined digital painting, unified lighting, collectible fine-art print quality',
  'digital art': 'refined digital painting, unified lighting, collectible fine-art print quality',
  Scandinavian: 'Scandinavian simplicity, muted palette, airy spacing, clean Nordic editorial calm',
  Boho: 'boho organic layering, earthy tones, handcrafted texture cues, relaxed but refined composition',
  Vintage: 'vintage print tonality, subtle grain, classic color grading, timeless retro elegance',
  Modern: 'modern contemporary art direction, confident geometry, clean contrast, refined minimal polish',
  Luxury: 'luxury visual language: premium materials feel, restrained opulence, sophisticated tonal control',
  Japandi: 'Japandi fusion: Japanese restraint and Scandinavian warmth, natural textures, minimal harmony',
  Industrial: 'industrial aesthetic with structural forms, concrete/metal cues, gritty refined tonal depth',
  'Dark aesthetic': 'dark aesthetic mood, deep shadows, selective highlights, cinematic premium atmosphere',
  'Soft aesthetic': 'soft aesthetic mood, pastel-led harmony, diffused light, calm gentle composition',
  Editorial: 'editorial art direction, magazine-level composition discipline, premium storytelling framing',
  'Poster vintage': 'classic poster-vintage language, aged print character, retro typography-like geometry without text',
  'Typographic minimal': 'typographic-minimal spirit via abstract glyph-like geometry only, strict no readable letters',
};

function titleSuggestsOutdoorOrLandscape(t) {
  const s = String(t || '');
  return /\b(road|droga|śnieg|snieg|snow|las|forest|góry|gory|mountain|beach|morze|sea|ocean|field|polan|lake|jezioro|river|rzeka|valley|dolina|coast|plaza|desert|krajobraz|landscape|niebo|sky|sunset|zachód|winter|zima|spring|wiosna|summer|lato|autumn|jesień|jesien|deszcz|rain|mgla|mgła|fog|path|ścieżka|sciezka|lód|ice)\b/i.test(
    s
  );
}

function titleSuggestsSingleSeasonMoment(t) {
  const s = String(t || '').toLowerCase();
  if (/(śnieg|snieg|snow|zima|winter|mróz|mroz|frost|ślisk|slisk|ice|lód|lod)/i.test(s)) {
    return 'Depict only a single winter scene that matches the title literally — do not add spring, summer, or autumn, and do not use a multi-season collage or triptych.';
  }
  if (/(wiosna|spring|kwitn|bloom)/i.test(s)) {
    return 'Depict only a single spring-themed scene matching the title — not other seasons in panels.';
  }
  if (/(lato|summer|słońce|slonce|beach|plaż)/i.test(s)) {
    return 'Depict only a single summer mood matching the title — not a seasonal grid.';
  }
  if (/(jesień|jesien|autumn|fall|liście|liscie)/i.test(s)) {
    return 'Depict only a single autumn scene matching the title — not other seasons.';
  }
  return '';
}

function buildOfflinePosterPrompt(title, category, style, categoryThemes, designSuffix) {
  const themes = String(categoryThemes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
  const mood = themes || 'organic natural atmosphere';
  const exec = STYLE_EXECUTION[style] || STYLE_EXECUTION.photography;
  const outdoor = titleSuggestsOutdoorOrLandscape(title);
  const seasonHint = titleSuggestsSingleSeasonMoment(title);
  const categorySeasonalNote =
    category === 'Pory roku'
      ? 'Category is seasonal in general, but the TITLE names the exact moment to show — never illustrate every season at once unless the title explicitly asks for it.'
      : '';

  const lightingBg = outdoor
    ? `Natural ambient outdoor light appropriate to the scene; the real environment (sky, snow, forest, road, fog, etc.) fills the entire frame edge-to-edge — not a studio cyclorama unless the title clearly describes a studio still life.`
    : `Soft diffused studio light; seamless muted neutral backdrop (cream, warm gray, or soft paper) with intentional negative space inside the artwork only — not a white band around the image.`;

  const catDir = getCategoryArtDirection(category);
  const titleBrief = buildTitleBriefBlock(title, { literal: true, category, style });
  let body =
    `Flat 2D artwork as a print reproduction file only—not a mockup, not a photo of a print on a surface or in a room. ` +
    `${titleBrief} ` +
    `Category direction: ${catDir} ` +
    `Category tags (${mood}) are secondary mood hints only—do not contradict the title. ` +
    `${categorySeasonalNote} ` +
    `${seasonHint ? seasonHint + ' ' : ''}` +
    `${STYLE_PREMIUM} ` +
    `Style "${style}": ${exec}. ${lightingBg} ` +
    `Full-bleed: one scene fills the entire canvas edge-to-edge; no outer margin, letterboxing, frame, room, tape, or drop-shadow rectangle. ` +
    `No text, watermark, or logo. Museum-quality print detail, 300 DPI intent.`;

  body = body.replace(/\s+/g, ' ').trim();
  if (designSuffix) {
    body = `${body}${designSuffix}`;
  }
  return body;
}

function getCategoryStyleHardLock(category, style) {
  const c = String(category || '').trim().toLowerCase();
  const s = String(style || '').trim().toLowerCase();
  if (c === 'dla pary' && s === 'photography') {
    return 'HARD LOCK: Keep "Dla pary" and "Photography" simultaneously—realistic photo-based scene with paired/dual relationship motif, natural lens detail, romantic but tasteful mood; never switch to abstract digital painting language.';
  }
  return '';
}

function parseTitlesFromLlmResponse(content) {
  const raw = String(content || '').trim();
  const unfenced = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const tryParse = (s) => {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : null;
  };
  try {
    const a = tryParse(unfenced);
    if (a) return a;
  } catch (_) {}
  const start = unfenced.indexOf('[');
  const end = unfenced.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try {
      const a = tryParse(unfenced.slice(start, end + 1));
      if (a) return a;
    } catch (_) {}
  }
  throw new Error('invalid titles JSON');
}

/** Stricter brief so batch titles stay printable and visually distinct (reduces generic stock naming). */
function getTitleGenerationExtraRules(category, count) {
  const n = Math.max(1, Number(count) || 5);
  const needBotanicalNouns = Math.min(n, Math.max(3, Math.ceil(n * 0.6)));
  const base = [
    `Each title must describe ONE clear image a buyer can picture in seconds—concrete subject or scene, not a slogan.`,
    `Across all ${n} titles: use different focal ideas (e.g. macro detail vs single hero stem vs airy arrangement vs pattern)—avoid five near-identical "soft minimal botanical still life" names.`,
    `Avoid vague stock naming patterns unless paired with a specific visual noun in the same title: standalone "Symphony", "Dreams", "Whispers of…", "Garden of…", "Nature's…", "Palette" (as a lone concept), "Serenity" alone.`,
    `Do not reuse the same opening word or metaphor family twice (e.g. only one "Garden…", one "Nature's…").`,
  ].join('\n');

  if (String(category).trim() === 'Kawa i herbata') {
    return (
      `${base}\n` +
      `Kawa i herbata: titles must suggest coffee, tea, cups, steam, beans, café calm, or morning ritual — no brand names or menu words in the title.`
    );
  }
  if (String(category).trim() === 'Kuchnia i jedzenie') {
    return (
      `${base}\n` +
      `Kuchnia i jedzenie: titles must name food or kitchen subjects (lemon, pasta, olive oil, herbs, bread) — Mediterranean editorial tone.`
    );
  }
  if (String(category).trim() === 'Botanika') {
    return (
      `${base}\n` +
      `Botanika: at least ${needBotanicalNouns} of ${n} titles MUST include a concrete botanical anchor in plain words ` +
      `(e.g. magnolia branch, cherry blossom, wild flower stem, single bloom, spring branch, blossom stem, floral branch). ` +
      `Prefer Scandinavian/editorial print-shop tone: short, specific, calm.\n` +
      `Hard preference for sales mode motifs: magnolia branch, cherry blossom branch, wild flower stem, single blooming flower, delicate spring branch.\n` +
      `Do NOT generate titles focused on: fern, geometric botanical, symmetric leaves, decorative object motifs, clean product-like eucalyptus.`
    );
  }
  return base;
}

class ContentGenerator {
  constructor() {
    this.openaiClient = config.openaiKey ? new OpenAI({ apiKey: config.openaiKey }) : null;
    this._designMdSuffixPromise = null;
  }

  getAvailableLlmProviders() {
    return config.openaiKey ? ['openai'] : [];
  }

  /**
   * Tytuły / prompt obrazu: wyłącznie OpenAI (gdy jest klucz).
   * @returns {'openai'|null} null gdy brak OPENAI_API_KEY.
   */
  resolveLlmProvider(requested) {
    if (!config.openaiKey) return null;
    const r = String(requested || '').trim().toLowerCase();
    if (r === 'anthropic') return null;
    return 'openai';
  }

  hasAnyLlmProvider() {
    return this.getAvailableLlmProviders().length > 0;
  }

  /** Etykieta do zapisu w inventory / UI — który model ułożył prompt obrazu. */
  describePromptLlm(provider) {
    if (provider === 'openai') {
      return {
        promptLlmProvider: 'openai',
        promptLlmModel: config.openaiPromptModel,
        promptLlmLabel: `OpenAI · ${config.openaiPromptModel}`,
      };
    }
    return {
      promptLlmProvider: 'offline',
      promptLlmModel: '',
      promptLlmLabel: 'Szablon lokalny (bez LLM)',
    };
  }

  /** Prompt podany przez użytkownika (API / formularz), nie z LLM studia. */
  describeManualPrompt() {
    return {
      promptLlmProvider: 'manual',
      promptLlmModel: '',
      promptLlmLabel: 'Wpisany ręcznie',
    };
  }

  /**
   * @param {string} userMessage
   * @param {number} maxTokens
   * @param {'openai'} provider
   * @param {{ temperature?: number }} [extra]
   * @returns {Promise<string>}
   */
  async llmComplete(userMessage, maxTokens, provider, extra = {}) {
    const temp = typeof extra.temperature === 'number' ? extra.temperature : undefined;
    if (provider === 'openai' && this.openaiClient) {
      const completion = await this.openaiClient.chat.completions.create({
        model: config.openaiPromptModel,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: maxTokens,
        ...(temp !== undefined ? { temperature: temp } : {}),
      });
      const c = completion.choices[0]?.message?.content;
      return typeof c === 'string' ? c.trim() : '';
    }
    return '';
  }

  /**
   * Cached snippet from getdesign.md (or URL-only fallback) for image prompt generation.
   */
  async getDesignMdSuffix() {
    if (this._designMdSuffixPromise) return this._designMdSuffixPromise;

    this._designMdSuffixPromise = (async () => {
      const url = resolveDesignMdUrl(config.designMdSlug, config.designMdUrl);
      if (!url) return '';

      try {
        const { text } = await fetchDesignMdBody(url, config.designMdMaxChars);
        if (!text) {
          return `\nBrand/design reference (URL only): ${url}\nUse its typical visual language where it fits wall art (no logos or trademarks).`;
        }
        return `\nBrand/design reference (summarize visually for the poster; no logos or trademarks):\n${text}\n(Source: ${url})`;
      } catch (err) {
        console.warn('design-md: could not fetch, using URL only:', err.message);
        return `\nBrand/design reference (URL only): ${url}\nInfer mood, palette, and composition from the associated design system where appropriate.`;
      }
    })();

    return this._designMdSuffixPromise;
  }

  async generatePosterTitles(category, count = 5, options = {}) {
    // Fallback titles for demo mode (when API key not set)
    const fallbackTitles = {
      'Botanika': ['Summer Garden', 'Botanical Beauty', 'Green Vibes', 'Nature\'s Art', 'Plant Love'],
      'Pory roku': ['Spring Awakening', 'Summer Sunset', 'Autumn Colors', 'Winter Wonder', 'Seasonal Bliss'],
      'Natura i krajobrazy': ['Mountain Peak', 'Forest Dreams', 'Ocean View', 'Valley Breeze', 'Scenic Route'],
      'Obrazy do kuchni': ['Fresh & Tasty', 'Kitchen Goals', 'Culinary Art', 'Food Love', 'Recipe Magic'],
      'Plakaty z napisami': ['Dream Big', 'Be Yourself', 'Stay Strong', 'Live Laugh', 'You Got This'],
      'Zwierzęta': ['Wild & Free', 'Animal Magic', 'Safari Life', 'Pet Love', 'Natural Beauty'],
      'Plakaty dla dzieci': ['Happy Times', 'Fun Adventure', 'Colorful Dreams', 'Play Zone', 'Joy Ride'],
      'Mapy i miasta': ['City Lights', 'Urban Life', 'World Travel', 'City Love', 'Map Quest'],
      'Retro': ['Vintage Vibes', 'Retro Cool', 'Classic Style', '80s Vibes', 'Nostalgia'],
      'Kultowe zdjęcia': ['Iconic Moment', 'Unforgettable', 'Legend Status', 'Historic', 'Timeless'],
      'Złoto i srebro': ['Golden Hour', 'Luxury Life', 'Shine Bright', 'Premium', 'Precious'],
      'Kosmos i astronomia': ['Cosmic Wonder', 'Star Light', 'Space Odyssey', 'Galaxy Quest', 'Universe'],
      'Sporty': ['Go Team', 'Game Day', 'Athletic Spirit', 'Victory', 'Champion Vibes'],
      'Muzyka': ['Sound Wave', 'Music Soul', 'Rhythm', 'Melody Love', 'Beat Drop'],
      'Plakaty planery': ['Get Organized', 'Plan Ahead', 'Daily Goals', 'Productivity', 'Organized Life'],
      Abstrakcja: ['Color Field Pulse', 'Layered Form Harmony', 'Silent Geometry', 'Chromatic Flow', 'Abstract Balance'],
      Minimalizm: ['Quiet Shape Study', 'Minimal Horizon', 'Calm Form', 'Soft Contrast', 'Essential Composition'],
      Architektura: ['Concrete Rhythm', 'Urban Facade Study', 'Geometric Atrium', 'Modern Structure', 'Architectural Light'],
      'Dla niego': ['Refined Power', 'Quiet Confidence', 'Modern Edge', 'Bold Minimal Form', 'Steel and Shadow'],
      'Dla niej': ['Soft Elegance', 'Graceful Balance', 'Luminous Bloom', 'Velvet Calm', 'Refined Harmony'],
      'Dla taty': ['Classic Heritage', 'Steady Horizon', 'Timeless Craft', 'Warm Steel Tone', 'Noble Simplicity'],
      'Dla mamy': ['Gentle Morning Bloom', 'Warm Light Study', 'Tender Harmony', 'Soft Botanical Calm', 'Elegant Glow'],
      'Dla dziecka': ['Playful Safari Mood', 'Happy Color Shapes', 'Little Explorer', 'Dreamy Animal Parade', 'Joyful Sky'],
      'Dla pary': ['Paired Harmony', 'Two Forms in Balance', 'Shared Horizon', 'Twin Light Study', 'United Rhythm'],
      'Na prezent': ['Gifted Elegance', 'Celebration in Light', 'Curated Calm', 'Premium Joy', 'Refined Surprise'],
      'Na urodziny': ['Birthday Glow', 'Festive Color Drift', 'Joyful Moment Study', 'Celebration Palette', 'Golden Wish'],
      'Na ślub': ['Wedding Light', 'Timeless Vow Mood', 'Ivory Harmony', 'Romantic Balance', 'Soft Champagne Glow'],
      'Na rocznicę': ['Anniversary Glow', 'Enduring Harmony', 'Quiet Romance', 'Timeless Pair Study', 'Golden Memory'],
      'Na parapetówkę': ['New Home Calm', 'Housewarming Light', 'Fresh Start Palette', 'Modern Welcome', 'Cozy Minimal Scene'],
      Motoryzacja: ['Engineered Motion', 'Velocity Lines', 'Mechanical Elegance', 'Road Energy', 'Automotive Pulse'],
      Pojazdy: ['Coastal Grand Tourer', 'Midnight Motorcycle', 'Aviation Silverline', 'Harbor Speedform', 'Desert Rally Shape'],
      'Kawa i herbata': [
        'Morning Espresso Ritual',
        'Soft Coffee Steam',
        'Quiet Café Corner',
        'Minimal Coffee Cup',
        'Tea Leaves in Morning Light',
      ],
      'Kuchnia i jedzenie': [
        'Lemon Still Life',
        'Tomatoes on Linen',
        'Olive Oil and Rosemary',
        'Fresh Pasta Moment',
        'Mediterranean Kitchen',
      ],
      'Morze i plaża': [
        'Quiet Shoreline',
        'Soft Dune Morning',
        'Calm Sea Horizon',
        'Shells in Pale Light',
        'Misty Coastal Silence',
      ],
      'Sport i hobby': [
        'Minimal Tennis Court',
        'Quiet Bicycle Morning',
        'Soft Golf Green',
        'Surf Curve Study',
        'Vintage Running Form',
      ],
      'Gaming i e-sport': [
        'Neon Gaming Setup',
        'Retro Arcade Night',
        'Minimal Game Controller',
        'Pixel Victory Mood',
        'Late Night Match',
        'Cyber Arena Glow',
        'Quiet Controller Study',
        'Arcade Energy Field',
        'Game Room After Dark',
        'Minimal Victory Screen',
      ],
      'AI i technologia': [
        'Neural Silence',
        'Artificial Dream Field',
        'Soft Circuit Mind',
        'Future Thinking',
        'Digital Consciousness',
        'Minimal Neural Network',
        'Data Flow Memory',
        'Synthetic Calm',
        'Quiet Machine Thought',
        'Soft Algorithm Field',
      ],
      'Humor i memy': [
        'Cat Judging Everything',
        'Monday Mood',
        'Tiny Chaos Energy',
        'Overthinking Duck',
        'Confused Office Plant',
        'Lazy Weekend Monster',
        'Small Drama Moment',
        'Awkward Silence Club',
        'Dramatic Houseplant',
        'Tired Little Cloud',
      ],
      'Cyberpunk i neon': [
        'Neon Rain District',
        'Cyber Night Geometry',
        'Electric City Silence',
        'Purple Future Alley',
        'Digital Neon Horizon',
        'Soft Neon Grid',
        'Midnight Data Street',
        'Violet Rain Signal',
        'Futuristic Alley Glow',
        'Electric Urban Dream',
      ],
      'Muzyka i dźwięk': [
        'Soft Jazz Evening',
        'Minimal Guitar Lines',
        'Vinyl Sound Wave',
        'Quiet Piano Shadow',
        'Analog Sound Memory',
        'Studio Silence',
        'Warm Bass Line',
        'Golden Saxophone Mood',
        'Soft Drum Rhythm',
        'Minimal Sound Field',
      ],
      'Wellness i joga': [
        'Soft Yoga Morning',
        'Quiet Meditation Pose',
        'Calm Breath Ritual',
        'Gentle Wellness Light',
        'Neutral Yoga Flow',
        'Peaceful Spa Moment',
        'Slow Living Balance',
        'Morning Stretch Silence',
        'Soft Linen Meditation',
        'Warm Wellness Ritual',
      ],
      'Symbole i harmonia': [
        'Soft Yin Yang Balance',
        'Minimal Harmony Circle',
        'Quiet Mandala Energy',
        'Gentle Zen Symbol',
        'Organic Balance Forms',
        'Calm Spiritual Geometry',
        'Moon and Sun Harmony',
        'Inner Balance Study',
        'Neutral Energy Field',
        'Sacred Circle Calm',
      ],
      Samochody: ['Sculpted Bodyline', 'Urban Speed Form', 'Chrome and Light', 'Roadside Elegance', 'Car Silhouette Study'],
      Motocykle: ['Two-Wheel Momentum', 'Steel and Asphalt', 'Rider Spirit', 'Chrome Torque', 'Motor Rhythm'],
      'Klasyczne auta': ['Vintage Grand Tourer', 'Classic Chrome Glow', 'Timeless Car Profile', 'Heritage Drive', 'Retro Road Elegance'],
      'Sportowe auta': ['Apex Velocity', 'Racing Line', 'High-Performance Form', 'Trackside Energy', 'Speed in Contrast'],
      Gaming: ['Neon Reflex', 'Digital Arena Flow', 'Pixel Pulse Mood', 'Cyber Motion', 'Game Night Energy'],
      'Fitness i siłownia': ['Strength in Form', 'Athletic Momentum', 'Discipline and Motion', 'Powerline Study', 'Training Focus'],
      Podróże: ['Journey Horizon', 'Wanderlight', 'Destination Calm', 'Exploration Mood', 'Voyage in Color'],
      'Street art': ['Urban Spray Rhythm', 'Concrete Color Burst', 'Street Layer Study', 'Graffiti Motion', 'Wall Texture Flow'],
      'Kawa i lifestyle': ['Morning Brew Mood', 'Espresso Ritual', 'Cafe Light Study', 'Cozy Roast Palette', 'Coffeehouse Calm'],
      'Wino i alkohol': ['Cellar Light', 'Velvet Merlot Mood', 'Glass and Shadow', 'Bar Still Life', 'Aged Oak Glow'],
      'Luxury / premium': ['Opulent Minimal', 'Champagne Geometry', 'Refined Gold Tone', 'Luxury Silence', 'Prestige Palette'],
      Technologia: ['Future Grid', 'Precision Signal', 'Digital Structure', 'Techno Minimal Form', 'Neural Geometry'],
      'Biznes i motywacja': ['Executive Focus', 'Clarity and Drive', 'Ambition in Form', 'Momentum Study', 'Strategic Horizon'],
      'Tatuaż i sztuka alternatywna': ['Ink Ritual', 'Alternative Symbolic Form', 'Bold Line Totem', 'Dark Ornament Study', 'Tattoo Spirit'],
      'Surfing / ocean': ['Wave Rider Energy', 'Ocean Motion Study', 'Coastal Flow', 'Surfline Horizon', 'Sea Spray Rhythm'],
      'Góry / hiking': ['Alpine Path', 'Summit Light', 'Mountain Trail Mood', 'Ridge and Sky', 'Hiking Horizon'],
    };

    const provider = this.resolveLlmProvider(options.llmProvider);
    if (!provider) {
      const baseTitles = fallbackTitles[category] || Array.from({ length: count }, (_, i) => `${category} ${i + 1}`);
      const titles = [];
      for (let i = 0; i < count; i++) {
        const base = baseTitles[i % baseTitles.length] || `${category} ${i + 1}`;
        titles.push(i < baseTitles.length ? base : `${base} ${Math.floor(i / baseTitles.length) + 1}`);
      }
      return { titles, titlePrompt: null };
    }

    const categoryDesc = config.categories[category] || category;
    const extraRules = getTitleGenerationExtraRules(category, count);
    const styleHint = typeof options.artStyle === 'string' && options.artStyle.trim()
      ? `\nSelected art style: ${options.artStyle.trim()}\nTitles must naturally fit this exact style while staying visually distinct from each other.`
      : '';

    const prompt = `Generate ${count} unique poster titles for the "${category}" category.

Category focus: ${categoryDesc}
${styleHint}

Hard requirements:
- 2–5 words per title, Title Case, English (for image model consistency).
- Premium wall-art SKUs: specific and calm, not generic inspirational poster clichés.
- Each title unique; no numbering in titles.

${extraRules}

Return ONLY a JSON array of ${count} strings, no markdown, no commentary.

Example format: ["Title One", "Title Two", "Title Three"]

Generate now:`;

    try {
      const content = await this.llmComplete(prompt, 500, provider, { temperature: 0.65 });
      const titles = parseTitlesFromLlmResponse(content);
      return { titles: titles.slice(0, count), titlePrompt: prompt };
    } catch (error) {
      console.error('Error generating titles:', error.message);
      const baseTitles = fallbackTitles[category] || Array.from({ length: count }, (_, i) => `${category} ${i + 1}`);
      const titles = [];
      for (let i = 0; i < count; i++) {
        const base = baseTitles[i % baseTitles.length] || `${category} ${i + 1}`;
        titles.push(i < baseTitles.length ? base : `${base} ${Math.floor(i / baseTitles.length) + 1}`);
      }
      return { titles, titlePrompt: prompt };
    }
  }

  async generateImagePrompt(title, category, style, options = {}) {
    assertCategoryStyleAllowed(category, style);
    const routed = buildCoreCreativePrompt({ title, category, style });
    const preserveStructure = usesStructuredPrompt(category, style);
    const text = preserveStructure
      ? routed.imagePrompt
      : sanitizeCreativePrompt(routed.imagePrompt) || routed.imagePrompt;
    return {
      text,
      routingPath: routed.routingPath,
      usedFallbackPromptBuilder: routed.usedFallbackPromptBuilder,
      promptLlm: {
        promptLlmProvider: 'template',
        promptLlmModel: PROMPT_BUILDER_VERSION,
        promptLlmLabel: `Master prompt (${PROMPT_BUILDER_VERSION})`,
      },
    };
  }

  /**
   * Short English shop listing (2–3 sentences). Uses the same stored image prompt (poster.prompt) as primary source.
   */
  async generateListingDescription({ title, category, style, imagePrompt, llmProvider } = {}) {
    const provider = this.resolveLlmProvider(llmProvider);
    if (!provider) return '';

    const originalPrompt = String(imagePrompt || '').trim().slice(0, 2800);
    const userMsg = `You write premium wall-art / poster product copy for an online store (clear, calm, tasteful—like major print brands).

Write a short English product description for the poster product page.

PRIMARY SOURCE — what the poster actually shows comes from the ORIGINAL IMAGE GENERATION PROMPT below.
- Ground the copy in that prompt: mood, composition, light, palette, rendering style—but as tight shop copy, not a spec sheet.
- Do not paste the prompt verbatim; paraphrase into fluent customer-facing English in 2–3 sentences.
- Stay consistent with the title and metadata; do not invent a different subject.

Strict rules:
- Exactly 2 or 3 sentences, one paragraph.
- No headings, bullets, numbering, emojis, hashtags.
- Do not wrap the whole text in quotation marks.
- No frame size, shipping, price, or SKU talk.
- Tone: quiet, aesthetic, interior-friendly—not hard sell.

--- ORIGINAL IMAGE PROMPT (same field as "prompt used for generation" in the library) ---
${originalPrompt || '(no stored prompt—use only title, category, and style below)'}
---

Poster title: ${String(title || '').trim()}
Category: ${String(category || '').trim()}
Art style: ${String(style || '').trim()}

Output only the finished English description, nothing else.`;

    try {
      const raw = await this.llmComplete(userMsg, 280, provider, { temperature: 0.62 });
      return sanitizeListingDescription(raw);
    } catch (error) {
      console.warn('listing description EN:', error.message);
      return '';
    }
  }
}

/** Single paragraph; trim noise. */
function sanitizeListingDescription(text) {
  let t = String(text || '')
    .trim()
    .replace(/^["„»]+|["”«]+$/g, '')
    .trim();
  t = t.replace(/\s*\n+\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > 600) {
    t = t.slice(0, 600).replace(/\s+\S*$/, '').trim();
    if (!/[.!?…]$/.test(t)) t += '…';
  }
  return t;
}

module.exports = ContentGenerator;
