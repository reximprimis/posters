require('dotenv').config();
const path = require('path');

/** Ułamek szer./wys. szablonu: lewo, góra, szerokość, wysokość slotu na plakat (0–1). */
function parseLifestyleInset(raw) {
  const fallback = { left: 0.22, top: 0.06, width: 0.56, height: 0.58 };
  const s = (raw != null ? String(raw) : '').trim();
  if (!s) return fallback;
  const parts = s.split(',').map((x) => parseFloat(String(x).trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n <= 0 || n > 1)) return fallback;
  return { left: parts[0], top: parts[1], width: parts[2], height: parts[3] };
}

const config = {
  // API Keys
  openaiKey: process.env.OPENAI_API_KEY,
  /** Model czatu do tytułów / promptu obrazu (Chat Completions). */
  openaiPromptModel: (process.env.OPENAI_PROMPT_MODEL || 'gpt-4o-mini').trim(),
  /** Zarezerwowane — aplikacja używa wyłącznie OpenAI do promptów (gdy jest klucz). */
  promptLlmDefault: 'openai',
  geminiKey: process.env.GEMINI_API_KEY,
  canvaKey: process.env.CANVA_API_KEY,
  canvaSecret: process.env.CANVA_API_SECRET,

  // design-md / getdesign.md — set DESIGN_MD_SLUG to a folder name under design-md/ (e.g. vercel, stripe)
  designMdSlug: (process.env.DESIGN_MD_SLUG || '').trim(),
  designMdUrl: (process.env.DESIGN_MD_URL || '').trim(),
  designMdMaxChars: Math.min(Math.max(parseInt(process.env.DESIGN_MD_MAX_CHARS, 10) || 6000, 500), 20000),

  // Output
  outputDir: path.resolve(__dirname, process.env.OUTPUT_DIR || 'posters'),

  /** Opcjonalny szablon wnętrza (ścieżka względem root projektu lub absolutna). Pusty = syntetyczna ściana. */
  lifestyleMockupTemplate: (process.env.LIFESTYLE_MOCKUP_TEMPLATE || '').trim(),
  /** Np. 0.22,0.06,0.56,0.58 = slot na ścianie (dopasuj do swojego JPG). */
  lifestyleInset: parseLifestyleInset(process.env.LIFESTYLE_INSET),
  /** Końcowy PNG mockupu (sklep) w proporcji plakatu (np. 21×30). Wyłącz: LIFESTYLE_PDF_NORMALIZE=0 */
  lifestyleNormalizeToPosterAspect: String(process.env.LIFESTYLE_PDF_NORMALIZE || '1').trim() !== '0',

  // Print Specifications
  dpi: 300,
  bleedMm: 3,
  colorProfile: 'CMYK',

  // Poster Sizes (width x height in cm, converted to pixels at 300 DPI)
  posterSizes: {
    '13x18': { cm: [13, 18], px: [1535, 2126] },
    '21x30': { cm: [21, 30], px: [2480, 3543] },
    '30x40': { cm: [30, 40], px: [3543, 4724] },
    '40x50': { cm: [40, 50], px: [4724, 5906] },
    '50x70': { cm: [50, 70], px: [5906, 8268] },
    '70x100': { cm: [70, 100], px: [8268, 11811] },
  },

  // Generator categories (WHAT is on the poster) — src/categoryStyles.js
  categories: require('./src/categoryStyles').buildCategoriesConfigObject(),

  // Global styles (HOW) + allowed pairs + room collections — src/categoryStyles.js
  artStyles: require('./src/categoryStyles').GLOBAL_STYLES,
  categoryStyles: require('./src/categoryStyles').CATEGORY_STYLES,
  roomCollections: require('./src/categoryStyles').ROOM_COLLECTIONS,
  categoryRoomCollections: require('./src/categoryStyles').CATEGORY_ROOM_COLLECTIONS,
};

module.exports = config;
