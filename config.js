require('dotenv').config();

const config = {
  // API Keys
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  canvaKey: process.env.CANVA_API_KEY,
  canvaSecret: process.env.CANVA_API_SECRET,

  // design-md / getdesign.md — set DESIGN_MD_SLUG to a folder name under design-md/ (e.g. vercel, stripe)
  designMdSlug: (process.env.DESIGN_MD_SLUG || '').trim(),
  designMdUrl: (process.env.DESIGN_MD_URL || '').trim(),
  designMdMaxChars: Math.min(Math.max(parseInt(process.env.DESIGN_MD_MAX_CHARS, 10) || 6000, 500), 20000),

  // Output
  outputDir: process.env.OUTPUT_DIR || './posters',

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

  // Categories
  categories: {
    'Botanika': 'botanical plants, flowers, leaves, natural, green, botanical garden',
    'Pory roku': 'seasonal, spring, summer, autumn, winter, nature, weather',
    'Natura i krajobrazy': 'nature landscapes, mountains, forests, water, scenic views',
    'Obrazy do kuchni': 'kitchen art, food, culinary, recipes, cooking, vegetables',
    'Plakaty z napisami': 'typography, quotes, motivational text, inspirational sayings',
    'Zwierzęta': 'animals, wildlife, pets, insects, birds, mammals',
    'Plakaty dla dzieci': 'kids, playful, colorful, educational, animals, fun',
    'Mapy i miasta': 'maps, cities, travel, geography, urban, skyline',
    'Moda': 'fashion, style, clothing, accessories, trendy, elegant',
    'Retro': 'vintage, retro, 70s, 80s, nostalgia, classic design',
    'Kultowe zdjęcia': 'iconic photos, famous scenes, memorable moments, classic',
    'Złoto i srebro': 'metallic, gold, silver, luxury, elegant, premium',
    'Kosmos i astronomia': 'space, stars, planets, universe, cosmic, galaxy',
    'Sporty': 'sports, fitness, action, energy, dynamic, movement',
    'Muzyka': 'music, instruments, sound, melody, rhythm, musical',
    'Plakaty planery': 'planners, calendars, organizational, productivity, schedule',
  },

  // Art Styles
  artStyles: [
    'photography',
    'abstract art',
    'minimalism',
    'watercolor',
    'line art',
    'illustration',
    'graphic design',
    'digital art',
  ],
};

module.exports = config;
