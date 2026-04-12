require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const INVENTORY_PATH = path.join(__dirname, 'posters_inventory.json');

let batchGenerator = null;
function getBatchGenerator() {
  if (!batchGenerator) {
    const PosterBatchGenerator = require('./src/posterGenerator');
    batchGenerator = new PosterBatchGenerator();
  }
  return batchGenerator;
}

app.use(express.json());

function cleanPosterSubPath(filePath) {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.replace(/^posters\//, '');
}

function buildPdfLinks(poster) {
  const raw = poster.pdfPaths;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const labels = ['13x18', '21x30', '30x40', '40x50', '50x70', '70x100'];
    return raw.map((p, idx) => ({
      label: labels[idx] || `f${idx + 1}`,
      href: '/' + cleanPosterSubPath(p),
    }));
  }
  return Object.entries(raw).map(([label, filePath]) => ({
    label,
    href: '/' + cleanPosterSubPath(filePath),
  }));
}

// API — must be before static so /api/* is never shadowed by files
app.get('/api/posters', (req, res) => {
  if (!fs.existsSync(INVENTORY_PATH)) {
    return res.status(404).json({ error: 'missing_inventory', posters: {}, stats: { totalPosters: 0, totalPdfs: 0, categories: 0 } });
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
  const posters = {};

  const totalPdfs = inventory.posters.reduce((n, p) => {
    if (!p.pdfPaths) return n;
    if (Array.isArray(p.pdfPaths)) return n + p.pdfPaths.length;
    return n + Object.keys(p.pdfPaths).length;
  }, 0);

  const stats = {
    totalPosters: inventory.posters.length,
    totalPdfs,
    categories: new Set(inventory.posters.map((p) => p.category)).size,
  };

  for (const poster of inventory.posters) {
    if (!posters[poster.category]) {
      posters[poster.category] = [];
    }

    const webImagePath = poster.imagePath.replace(/\\/g, '/');
    const cleanImagePath = cleanPosterSubPath(webImagePath);

    const pdfLinks = buildPdfLinks(poster);
    const legacyPdfs = pdfLinks.map((l) => l.href.replace(/^\//, ''));

    posters[poster.category].push({
      title: poster.title,
      style: poster.artStyle,
      imagePath: '/' + cleanImagePath,
      pdfLinks,
      pdfs: legacyPdfs,
      createdAt: poster.createdAt || null,
      prompt: poster.prompt || '',
    });
  }

  res.json({ posters, stats });
});

app.get('/api/generation-config', (req, res) => {
  res.json({
    categories: Object.keys(config.categories),
    categoryHints: config.categories,
    artStyles: config.artStyles,
  });
});

app.post('/api/draft-image-prompt', async (req, res) => {
  try {
    const { title, category, style } = req.body || {};
    if (!title || !category || !style) {
      return res.status(400).json({ error: 'Wymagane pola: title, category, style' });
    }
    if (!Object.prototype.hasOwnProperty.call(config.categories, category)) {
      return res.status(400).json({ error: 'Nieznana kategoria' });
    }
    const ContentGenerator = require('./src/contentGenerator');
    const cg = new ContentGenerator();
    const promptText = await cg.generateImagePrompt(String(title).trim(), category, style);
    res.json({ prompt: promptText });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Błąd serwera' });
  }
});

app.post('/api/generate-poster', async (req, res) => {
  try {
    const { title, category, style, imagePrompt } = req.body || {};
    const trimmedPrompt = imagePrompt != null ? String(imagePrompt).trim() : '';
    if (!title || !category || !style || !trimmedPrompt) {
      return res.status(400).json({
        error: 'Wymagane pola: title, category, style, imagePrompt (niepusty)',
      });
    }
    if (!Object.prototype.hasOwnProperty.call(config.categories, category)) {
      return res.status(400).json({ error: 'Nieznana kategoria' });
    }
    if (!config.artStyles.includes(style)) {
      return res.status(400).json({ error: 'Nieznany styl' });
    }
    if (trimmedPrompt.length > 3900) {
      return res.status(400).json({ error: 'Prompt jest za długi (max ~3900 znaków dla DALL-E 3)' });
    }
    const gen = getBatchGenerator();
    const result = await gen.generateOnePoster(category, String(title).trim(), style, trimmedPrompt);
    const relImage = result.imagePath.replace(/\\/g, '/');
    res.json({
      ok: true,
      id: result.id,
      imagePath: '/' + cleanPosterSubPath(relImage),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Generowanie nie powiodło się' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'posters')));

app.listen(PORT, () => {
  console.log(`\n✓ Preview server running at http://localhost:${PORT}`);
  console.log(`✓ Open your browser to see generated posters\n`);
});
