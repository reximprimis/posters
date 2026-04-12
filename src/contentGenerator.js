const OpenAI = require('openai');
const config = require('../config');
const { resolveDesignMdUrl, fetchDesignMdBody } = require('./designMd');
const { getCategoryArtDirection, STYLE_PREMIUM, sanitizeCreativePrompt } = require('./posterPromptLayers');

/** When no LLM API is configured, still produce a real DALL-E poster prompt (not a raw keyword list from config). */
const STYLE_EXECUTION = {
  photography:
    'photographic realism, crisp detail, editorial still-life or landscape clarity rendered as flat print art',
  'abstract art':
    'abstract composition as one continuous painted surface filling the tall portrait frame—color fields, shapes, texture, and rhythm reach all four edges; no centered square picture on empty paper, no wide blank strips top or bottom; non-literal but physically edge-to-edge like ink or paint on the full print sheet',
  minimalism: 'ultra-clean minimal forms, generous negative space, one or few restrained focal elements',
  watercolor: 'watercolor pigment on paper texture filling the frame, soft washes, luminous transparent color',
  'line art': 'refined ink line drawing, elegant contours, monochrome or sparse accent color, rich whitespace',
  illustration: 'polished editorial illustration, cohesive stylization, contemporary print illustration finish',
  'graphic design': 'bold graphic poster language, flat planes of color, contemporary Swiss-poster clarity',
  'digital art': 'refined digital painting, unified lighting, collectible fine-art print quality',
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
  let body =
    `Flat 2D artwork as a print reproduction file only—not a mockup, not a photo of a print on a surface or in a room. ` +
    `PRIMARY BRIEF — title "${title}" defines the subject; interpret literally. ` +
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

  if (String(category).trim() === 'Botanika') {
    return (
      `${base}\n` +
      `Botanika: at least ${needBotanicalNouns} of ${n} titles MUST include a concrete botanical anchor in plain words ` +
      `(e.g. fern, eucalyptus, monstera, magnolia, succulent, blossom, stem, seedhead, tropical leaf, dried grass, wildflower). ` +
      `Prefer Scandinavian/editorial print-shop tone: short, specific, calm.`
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
      'Moda': ['Fashion Forward', 'Style Icon', 'Trendy Look', 'Fashion Vibes', 'Style Goals'],
      'Retro': ['Vintage Vibes', 'Retro Cool', 'Classic Style', '80s Vibes', 'Nostalgia'],
      'Kultowe zdjęcia': ['Iconic Moment', 'Unforgettable', 'Legend Status', 'Historic', 'Timeless'],
      'Złoto i srebro': ['Golden Hour', 'Luxury Life', 'Shine Bright', 'Premium', 'Precious'],
      'Kosmos i astronomia': ['Cosmic Wonder', 'Star Light', 'Space Odyssey', 'Galaxy Quest', 'Universe'],
      'Sporty': ['Go Team', 'Game Day', 'Athletic Spirit', 'Victory', 'Champion Vibes'],
      'Muzyka': ['Sound Wave', 'Music Soul', 'Rhythm', 'Melody Love', 'Beat Drop'],
      'Plakaty planery': ['Get Organized', 'Plan Ahead', 'Daily Goals', 'Productivity', 'Organized Life'],
    };

    const provider = this.resolveLlmProvider(options.llmProvider);
    if (!provider) {
      const titles = fallbackTitles[category] || Array.from({ length: count }, (_, i) => `${category} ${i + 1}`);
      return titles.slice(0, count);
    }

    const categoryDesc = config.categories[category] || category;
    const extraRules = getTitleGenerationExtraRules(category, count);

    const prompt = `Generate ${count} unique poster titles for the "${category}" category.

Category focus: ${categoryDesc}

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
      return titles.slice(0, count);
    } catch (error) {
      console.error('Error generating titles:', error.message);
      return Array.from({ length: count }, (_, i) => `Poster ${i + 1}`);
    }
  }

  async generateImagePrompt(title, category, style, options = {}) {
    const designSuffix = await this.getDesignMdSuffix();
    const categoryThemes = config.categories[category] || category;

    const offlineResult = () => ({
      text: buildOfflinePosterPrompt(title, category, style, categoryThemes, designSuffix),
      promptLlm: this.describePromptLlm(null),
    });

    const provider = this.resolveLlmProvider(options.llmProvider);
    if (!provider) {
      return offlineResult();
    }

    const catDir = getCategoryArtDirection(category);
    const styleTrim = String(style || '').trim();
    const isAbstractArtStyle = styleTrim === 'abstract art';
    const abstractLayoutBlock = isAbstractArtStyle
      ? `
ABSTRACT-ART LAYOUT (portrait 7:10): Describe paint, pigment, gradients, or shapes that occupy the full vertical height—top to bottom active surface. Forbidden: a smaller square or oval “picture” centered on cream/white with thick empty bands; letterboxed abstract. Prefer vertical rhythm (columns, bands, flowing forms) so the tall frame feels intentionally filled.`
      : '';

    const prompt = `You write the CREATIVE half of prompts for DALL-E 3. The server prepends a strong "flat print file only" block and adds category hints—do not repeat mockup rules at length; focus on subject, mood, light, palette, composition.

Poster title (never render as readable text in the image): ${title}
Category label: ${category}
Category themes (secondary hints only; title wins if conflict): ${categoryThemes}
Category print direction (weave in; stay consistent): ${catDir}
Art style direction: ${style}
${designSuffix}
${abstractLayoutBlock}

TITLE-LITERAL RULE: Open with 1–2 clauses that directly interpret the TITLE's words into a single clear visual (same plants, motifs, or mood the title implies). If the title is abstract, pick ONE literal botanical reading and commit—do not drift into a generic unrelated still life.

TITLE is the primary brief. If the category spans many seasons but the title is one moment (e.g. snow on a road), describe only that—no seasonal grid or triptych.

CRITICAL — output must describe **flat 2D artwork** or a **scene that is the artwork itself** filling the canvas (editorial illustration, photo-as-poster). NEVER describe a photograph *of* a poster, print on a wall, tape, clips, easel, frame, mat, room interior, wooden table, hands, or lifestyle mockup.
- Forbidden concepts: mockup, framed art, gallery wall, shelf, sofa, window behind a print, drop shadow around a picture card, letterboxing, polaroid border, white margin band, comic panels unless title demands it.
- Use: full-bleed, edge-to-edge, single unified composition, subject and environment (or abstract field) continue to all four edges.
- Outdoor / landscape titles: real sky, land, weather to the edges when the title implies it—do not force a gray studio void behind a nature scene.

${STYLE_PREMIUM}

Wording bans (mockups AND stock-y fluff): never use "wall poster", "wall art", "for the wall", "viewer's space", "hanging on a wall", "room", "interior", "gallery wall", "display", "presentation", "showcase", "retail", "boutique", "perfect for", "suitable for", "themed display", "collector piece", "ambience for a room". Prefer: "full-bleed artwork", "composition filling the frame", "edge-to-edge scene". End with one short clause: ${
      isAbstractArtStyle
        ? 'energy and color distributed across the full portrait height and width, no postage-stamp motif on blank ground'
        : 'one dominant focal subject, no busy collage unless the title demands it'
    }.

Output requirements:
- ONE continuous English prompt, comma-separated clauses, no bullet lists, no markdown, no preamble.
- Specific: subject, lighting, background or negative space, composition, palette—aligned with "${style}"; avoid repeating the same sage-cream-minimal recipe when the title calls for something else.
- No text, letters, logos, watermarks in the image.
- Length: about 60–150 words (tighter beats rambling).

Example density (new subject for THIS poster; flat art only):
Monstera leaves overlapping in soft side light, deep green and warm shadow, single hero composition filling the entire frame, editorial botanical print, no frame, no mockup

Generate the prompt now:`;

    try {
      const text = await this.llmComplete(prompt, 700, provider, { temperature: 0.68 });
      const bodyText = typeof text === 'string' ? text.trim() : '';
      if (bodyText) {
        return { text: sanitizeCreativePrompt(bodyText) || bodyText, promptLlm: this.describePromptLlm(provider) };
      }
      return offlineResult();
    } catch (error) {
      console.error('Error generating image prompt:', error.message);
      return offlineResult();
    }
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
