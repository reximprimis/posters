require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const ContentGenerator = require('./src/contentGenerator');
const DalleImageGenerator = require('./src/dalleImageGenerator');
const { applyMatFrameFromBuffer } = require('./src/posterMatFrame');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const INVENTORY_PATH = path.join(__dirname, 'posters_inventory.json');
const PREVIEW_STAGING_DIR = path.join(__dirname, '.preview-staging');

if (!fs.existsSync(PREVIEW_STAGING_DIR)) {
  fs.mkdirSync(PREVIEW_STAGING_DIR, { recursive: true });
}

let batchGenerator = null;
function getBatchGenerator() {
  if (!batchGenerator) {
    const PosterBatchGenerator = require('./src/posterGenerator');
    batchGenerator = new PosterBatchGenerator();
  }
  return batchGenerator;
}

/** Jedna seria CLI-like (generate / generate-all) naraz — długie żądanie HTTP. */
let studioBatchRunning = false;

app.use(express.json());

/**
 * @param {object} body
 * @param {ContentGenerator} cg
 * @returns {'openai'|null}
 */
function resolveLlmFromRequestBody(body, cg) {
  const raw = body && (body.llmProvider != null ? body.llmProvider : body.promptLlm);
  if (raw != null && String(raw).trim() !== '') {
    const r = String(raw).trim().toLowerCase();
    if (r === 'anthropic') {
      const err = new Error('Claude został usunięty z aplikacji — użyj OpenAI albo pustego pola (domyślnie OpenAI).');
      err.statusCode = 400;
      throw err;
    }
    if (r !== 'openai') {
      const err = new Error('Parametr llmProvider musi być „openai” lub pusty.');
      err.statusCode = 400;
      throw err;
    }
    const avail = cg.getAvailableLlmProviders();
    if (!avail.includes('openai')) {
      const err = new Error('Wybrano OpenAI, ale brak OPENAI_API_KEY.');
      err.statusCode = 400;
      throw err;
    }
    return 'openai';
  }
  return cg.resolveLlmProvider();
}

function cleanPosterSubPath(filePath) {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.replace(/^posters\//, '');
}

/** Absolute path from repo root (handles posters\\Cat\\file.png). */
function absProjectPath(relativePath) {
  if (!relativePath) return '';
  const n = String(relativePath).replace(/\\/g, '/');
  return path.resolve(__dirname, n);
}

function fileExistsAtRelative(relativePath) {
  try {
    const abs = absProjectPath(relativePath);
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  } catch {
    return false;
  }
}

function buildPdfLinks(poster) {
  const raw = poster.pdfPaths;
  if (!raw) return [];
  let links;
  if (Array.isArray(raw)) {
    const labels = ['13x18', '21x30', '30x40', '40x50', '50x70', '70x100'];
    links = raw.map((p, idx) => ({
      label: labels[idx] || `f${idx + 1}`,
      href: '/' + cleanPosterSubPath(p),
      _src: p,
    }));
  } else {
    links = Object.entries(raw).map(([label, filePath]) => ({
      label,
      href: '/' + cleanPosterSubPath(filePath),
      _src: filePath,
    }));
  }
  return links.filter((l) => fileExistsAtRelative(l._src)).map(({ label, href }) => ({ label, href }));
}

/** One key per on-disk image so duplicate inventory rows (same PNG, re-generate) count as one plakat. */
function posterImageDedupeKey(cleanImagePath) {
  return cleanImagePath.replace(/\\/g, '/').toLowerCase();
}

/** Ścieżka obrazu do dopasowania (względna, bez wiodącego „posters/”). */
function normPosterImagePathForMatch(relOrWeb) {
  if (!relOrWeb) return '';
  const n = String(relOrWeb).replace(/\\/g, '/').replace(/^\//, '');
  return cleanPosterSubPath(n).toLowerCase();
}

function parseCreatedMs(iso) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

// API — must be before static so /api/* is never shadowed by files
app.get('/api/posters', (req, res) => {
  if (!fs.existsSync(INVENTORY_PATH)) {
    return res.status(404).json({ error: 'missing_inventory', posters: {}, stats: { totalPosters: 0, totalPdfs: 0, categories: 0 } });
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
  /** @type {Map<string, { poster: object, cleanImagePath: string, pdfLinks: {label:string,href:string}[], createdMs: number }[]>} */
  const groups = new Map();

  for (const poster of inventory.posters) {
    if (!poster.imagePath || !fileExistsAtRelative(poster.imagePath)) {
      continue;
    }

    const webImagePath = poster.imagePath.replace(/\\/g, '/');
    const cleanImagePath = cleanPosterSubPath(webImagePath);
    const key = posterImageDedupeKey(cleanImagePath);
    const pdfLinks = buildPdfLinks(poster);
    const createdMs = parseCreatedMs(poster.createdAt);

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push({ poster, cleanImagePath, pdfLinks, createdMs });
  }

  const posters = {};
  let totalPdfs = 0;

  for (const items of groups.values()) {
    items.sort((a, b) => b.createdMs - a.createdMs);
    const primary = items[0].poster;
    const cleanImagePath = items[0].cleanImagePath;

    let pdfLinks = items[0].pdfLinks;
    let imagePathFramed = primary.imagePathFramed || '';
    for (let i = 1; i < items.length; i++) {
      if (items[i].pdfLinks.length > pdfLinks.length) {
        pdfLinks = items[i].pdfLinks;
      }
      const cand = items[i].poster.imagePathFramed;
      if (cand && !imagePathFramed) imagePathFramed = cand;
    }

    totalPdfs += pdfLinks.length;
    const legacyPdfs = pdfLinks.map((l) => l.href.replace(/^\//, ''));

    let framedHref;
    if (imagePathFramed && fileExistsAtRelative(imagePathFramed)) {
      framedHref = '/' + cleanPosterSubPath(String(imagePathFramed).replace(/\\/g, '/'));
    }

    const cat = primary.category;
    if (!posters[cat]) {
      posters[cat] = [];
    }

    posters[cat].push({
      id: primary.id || null,
      title: primary.title,
      style: primary.artStyle,
      imagePath: '/' + cleanImagePath,
      pdfLinks,
      pdfs: legacyPdfs,
      createdAt: primary.createdAt || null,
      prompt: primary.prompt || '',
      promptLlmLabel: primary.promptLlmLabel || '',
      promptLlmProvider: primary.promptLlmProvider || '',
      promptLlmModel: primary.promptLlmModel || '',
      shopDescription: typeof primary.shopDescription === 'string' ? primary.shopDescription : '',
      approvedForPrint: primary.approvedForPrint === true,
      ...(framedHref ? { imagePathFramed: framedHref } : {}),
    });
  }

  for (const cat of Object.keys(posters)) {
    posters[cat].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
  }

  const flatCount = Object.values(posters).reduce((n, arr) => n + arr.length, 0);
  const stats = {
    totalPosters: flatCount,
    totalPdfs,
    categories: Object.keys(posters).length,
  };

  res.json({ posters, stats });
});

/**
 * Generate / overwrite short English shop listing (GPT) and save to posters_inventory.json.
 * Body: { id?: string, imagePath?: string } — one field required.
 */
app.post('/api/posters/listing-description', async (req, res) => {
  try {
    if (!fs.existsSync(INVENTORY_PATH)) {
      return res.status(404).json({ error: 'missing_inventory' });
    }
    const body = req.body || {};
    const idStr = body.id != null ? String(body.id).trim() : '';
    const imgNorm = body.imagePath != null ? normPosterImagePathForMatch(body.imagePath) : '';
    if (!idStr && !imgNorm) {
      return res.status(400).json({ error: 'Provide poster id or imagePath' });
    }
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
    if (!Array.isArray(inventory.posters)) {
      return res.status(500).json({ error: 'Invalid inventory format' });
    }
    let poster = null;
    for (const p of inventory.posters) {
      const byId = idStr && p.id === idStr;
      const byPath = !idStr && imgNorm && normPosterImagePathForMatch(p.imagePath) === imgNorm;
      if (byId || byPath) {
        poster = p;
        break;
      }
    }
    if (!poster) {
      return res.status(404).json({ error: 'Poster not found' });
    }
    const cg = new ContentGenerator();
    if (!cg.resolveLlmProvider(null)) {
      return res.status(503).json({ error: 'OPENAI_API_KEY is missing — cannot generate listing text.' });
    }
    const text = await cg.generateListingDescription({
      title: poster.title,
      category: poster.category,
      style: poster.artStyle,
      imagePrompt: poster.prompt || '',
      llmProvider: null,
    });
    if (!String(text || '').trim()) {
      return res.status(500).json({ error: 'Model returned empty text — try again.' });
    }
    poster.shopDescription = text.trim();
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2), 'utf-8');
    res.json({ ok: true, shopDescription: poster.shopDescription });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Listing generation failed' });
  }
});

/** Ręczne zatwierdzenie do druku (zapis w posters_inventory.json). */
app.patch('/api/posters/approval', (req, res) => {
  try {
    const body = req.body || {};
    const ap = body.approvedForPrint;
    if (typeof ap !== 'boolean') {
      return res.status(400).json({ error: 'Pole approvedForPrint musi być true lub false' });
    }
    if (!fs.existsSync(INVENTORY_PATH)) {
      return res.status(404).json({ error: 'missing_inventory' });
    }
    const idStr = body.id != null ? String(body.id).trim() : '';
    const imgNorm = body.imagePath != null ? normPosterImagePathForMatch(body.imagePath) : '';
    if (!idStr && !imgNorm) {
      return res.status(400).json({ error: 'Podaj id lub imagePath plakatu' });
    }
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
    if (!Array.isArray(inventory.posters)) {
      return res.status(500).json({ error: 'Nieprawidłowy format inventory' });
    }
    let updated = 0;
    for (const p of inventory.posters) {
      const byId = idStr && p.id === idStr;
      const byPath = imgNorm && normPosterImagePathForMatch(p.imagePath) === imgNorm;
      if (byId || byPath) {
        p.approvedForPrint = ap;
        updated += 1;
      }
    }
    if (updated === 0) {
      return res.status(404).json({ error: 'Nie znaleziono plakatu' });
    }
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2), 'utf-8');
    res.json({ ok: true, updated, approvedForPrint: ap });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Błąd zapisu' });
  }
});

/** Drugi plik PNG z równym passe-partout (`*_ramka.png`) dla wybranych id z biblioteki. */
app.post('/api/library/frame-variant', async (req, res) => {
  try {
    const body = req.body || {};
    const rawIds = body.posterIds != null ? body.posterIds : body.ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ error: 'Podaj posterIds (niepusta tablica id).' });
    }
    const ids = rawIds.map((x) => String(x).trim()).filter(Boolean);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Podaj co najmniej jedno poprawne id.' });
    }
    const gen = getBatchGenerator();
    const results = await gen.applyUniformFrameForPosterIds(ids);
    const okCount = results.filter((r) => r.ok).length;
    res.json({
      ok: true,
      results,
      okCount,
      failCount: results.length - okCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Błąd generowania wersji z ramką' });
  }
});

/** Ścieżki względne projektu (PNG/PDF) z jednego wpisu inventory — bez wpisów ERROR. */
function collectPosterAssetRelPaths(poster) {
  const out = new Set();
  const add = (p) => {
    if (typeof p !== 'string' || !p.trim()) return;
    const s = p.trim().replace(/\\/g, '/');
    if (s.startsWith('ERROR:')) return;
    out.add(s);
  };
  if (poster.imagePath) add(poster.imagePath);
  if (poster.imagePathFramed) add(poster.imagePathFramed);
  const raw = poster.pdfPaths;
  if (Array.isArray(raw)) {
    raw.forEach(add);
  } else if (raw && typeof raw === 'object') {
    for (const v of Object.values(raw)) add(v);
  }
  return [...out];
}

/**
 * Usuwa pojedynczy plik tylko pod `posters/` w katalogu projektu (brak path traversal).
 * @returns {{ ok: boolean, skipped?: boolean, reason?: string }}
 */
function safeUnlinkPosterAsset(projectRoot, relPath) {
  const normalized = String(relPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return { ok: false, reason: 'invalid_path' };
  const lower = normalized.toLowerCase();
  if (!lower.startsWith('posters/')) return { ok: false, reason: 'not_under_posters' };
  const abs = path.resolve(projectRoot, normalized);
  const rootAbs = path.resolve(projectRoot);
  if (!abs.startsWith(rootAbs)) return { ok: false, reason: 'path_escape' };
  try {
    if (!fs.existsSync(abs)) return { ok: true, skipped: true };
    const st = fs.statSync(abs);
    if (!st.isFile()) return { ok: false, reason: 'not_a_file' };
    fs.unlinkSync(abs);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message || 'unlink_failed' };
  }
}

/**
 * Usunięcie z biblioteki: wpisy w posters_inventory.json + opcjonalnie pliki PNG/PDF pod posters/.
 * Body: { items: [{ id?: string, imagePath?: string }], deleteFiles?: boolean }
 */
app.post('/api/posters/remove', (req, res) => {
  try {
    const body = req.body || {};
    const items = body.items;
    const deleteFiles = body.deleteFiles !== false;
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: 'Podaj tablicę items z co najmniej jednym plakatem (id lub imagePath).' });
    }
    if (!fs.existsSync(INVENTORY_PATH)) {
      return res.status(404).json({ error: 'missing_inventory' });
    }
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
    if (!Array.isArray(inventory.posters)) {
      return res.status(500).json({ error: 'Nieprawidłowy format inventory' });
    }

    const imageKeys = new Set();
    for (const it of items) {
      if (!it || typeof it !== 'object') continue;
      const idStr = it.id != null ? String(it.id).trim() : '';
      const imgNorm = it.imagePath != null ? normPosterImagePathForMatch(it.imagePath) : '';
      if (imgNorm) imageKeys.add(imgNorm);
      else if (idStr) {
        const found = inventory.posters.find((p) => p.id === idStr);
        if (found && found.imagePath) {
          imageKeys.add(normPosterImagePathForMatch(found.imagePath));
        }
      }
    }

    if (imageKeys.size === 0) {
      return res.status(404).json({ error: 'Nie znaleziono plakatów do usunięcia' });
    }

    const filesToDelete = new Set();
    const nextPosters = [];
    let removedRows = 0;

    for (const p of inventory.posters) {
      const key = normPosterImagePathForMatch(p.imagePath);
      if (key && imageKeys.has(key)) {
        removedRows += 1;
        if (deleteFiles) {
          for (const rel of collectPosterAssetRelPaths(p)) {
            filesToDelete.add(rel.replace(/\\/g, '/'));
          }
        }
      } else {
        nextPosters.push(p);
      }
    }

    if (removedRows === 0) {
      return res.status(404).json({ error: 'Nie znaleziono plakatów do usunięcia' });
    }

    inventory.posters = nextPosters;
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2), 'utf-8');

    const deletedFiles = [];
    const fileErrors = [];
    if (deleteFiles) {
      const projectRoot = __dirname;
      for (const rel of filesToDelete) {
        const r = safeUnlinkPosterAsset(projectRoot, rel);
        if (r.ok && !r.skipped) deletedFiles.push(rel);
        if (!r.ok) fileErrors.push({ path: rel, reason: r.reason });
      }
    }

    res.json({
      ok: true,
      removedRows,
      deletedFiles,
      fileErrors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Błąd usuwania' });
  }
});

app.get('/api/generation-config', (req, res) => {
  const cg = new ContentGenerator();
  res.json({
    categories: Object.keys(config.categories),
    categoryHints: config.categories,
    artStyles: config.artStyles,
    llmProviders: cg.getAvailableLlmProviders(),
    defaultLlmProvider: cg.resolveLlmProvider(),
    openaiPromptModel: config.openaiPromptModel,
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
    const cg = new ContentGenerator();
    let llmProvider;
    try {
      llmProvider = resolveLlmFromRequestBody(req.body || {}, cg);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ error: e.message });
    }
    const { text, promptLlm } = await cg.generateImagePrompt(String(title).trim(), category, style, { llmProvider });
    res.json({ prompt: text, promptLlm });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Błąd serwera' });
  }
});

function parseMatFrameFromBody(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.matFrame === true) return true;
  if (body.layout === 'matted') return true;
  return false;
}

/** full | uniform | gallery */
function parsePrintLayoutFromBody(body) {
  if (!body || typeof body !== 'object') return 'full';
  const raw = body.printLayout != null ? String(body.printLayout).trim().toLowerCase() : '';
  if (raw === 'uniform' || raw === 'gallery') return raw;
  if (parseMatFrameFromBody(body)) return 'uniform';
  return 'full';
}

function validateStudioPayload(body) {
  const title = body.title != null ? String(body.title).trim() : '';
  const category = body.category;
  const style = body.style;
  const trimmedPrompt = body.imagePrompt != null ? String(body.imagePrompt).trim() : '';
  if (!title || !category || !style || !trimmedPrompt) {
    return {
      error: 'Wymagane pola: title, category, style, imagePrompt (niepusty)',
    };
  }
  if (!Object.prototype.hasOwnProperty.call(config.categories, category)) {
    return { error: 'Nieznana kategoria' };
  }
  if (!config.artStyles.includes(style)) {
    return { error: 'Nieznany styl' };
  }
  const dalleMaxUser = DalleImageGenerator.USER_PROMPT_MAX;
  if (trimmedPrompt.length > dalleMaxUser) {
    return {
      error: `Prompt jest za długi (max ${dalleMaxUser} znaków; serwer dokleja dopisek anty-ramka do DALL-E)`,
    };
  }
  return {
    title,
    category,
    style,
    trimmedPrompt,
    matFrame: parseMatFrameFromBody(body),
    printLayout: parsePrintLayoutFromBody(body),
  };
}

/** Studio: tylko DALL-E → plik w .preview-staging (nie zapisuje do biblioteki). */
app.post('/api/studio/preview', async (req, res) => {
  try {
    const v = validateStudioPayload(req.body || {});
    if (v.error) {
      return res.status(400).json({ error: v.error });
    }
    const gen = getBatchGenerator();
    const { previewId } = await gen.generateStagingPreview(v.category, v.title, v.style, v.trimmedPrompt);
    res.json({
      ok: true,
      previewId,
      imageUrl: `/preview-staging/${previewId}.png`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Generowanie podglądu nie powiodło się' });
  }
});

/** Studio: usuń plik podglądu bez zatwierdzania. */
app.post('/api/studio/discard', (req, res) => {
  try {
    const previewId = req.body && req.body.previewId;
    const gen = getBatchGenerator();
    gen.discardPreview(previewId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Błąd' });
  }
});

/**
 * Podgląd wariantu ze stagingu (bez zapisu): full = surowy PNG; uniform = passe-partout równy obwód.
 */
app.get('/api/studio/preview-variant/:previewId/:variant', async (req, res) => {
  try {
    const previewId = req.params.previewId;
    const variant = String(req.params.variant || '').toLowerCase().trim();
    const gen = getBatchGenerator();
    if (!gen.isValidPreviewId(previewId)) {
      return res.status(400).json({ error: 'Nieprawidłowy identyfikator podglądu' });
    }
    const filePath = path.join(PREVIEW_STAGING_DIR, `${previewId.trim()}.png`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Brak pliku podglądu' });
    }
    if (variant === 'full') {
      return res.sendFile(path.resolve(filePath));
    }
    if (variant === 'uniform') {
      const buf = fs.readFileSync(filePath);
      const out = await applyMatFrameFromBuffer(buf, { style: 'uniform' });
      res.type('image/png').send(out);
      return;
    }
    return res.status(400).json({ error: 'Dozwolone warianty: full, uniform' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Błąd generowania wariantu' });
  }
});

/**
 * Studio automatyczny: pełna ścieżka jak CLI (tytuły + prompty + DALL-E + 6× PDF + inventory), bez podglądu.
 * Body: { all: boolean, category?: string, count: number, artStyle?: string } — count 1–50.
 * artStyle: pusty = wszystkie style (count = na każdy styl); znany styl = count = łącznie w tym stylu.
 */
app.post('/api/studio/batch-generate', async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);
  if (studioBatchRunning) {
    return res.status(409).json({ error: 'Trwa już inna seria generowania — poczekaj na zakończenie.' });
  }
  try {
    const body = req.body || {};
    const count = parseInt(body.count, 10);
    if (Number.isNaN(count) || count < 1 || count > 50) {
      return res.status(400).json({ error: 'Parametr count musi być liczbą od 1 do 50.' });
    }
    const all = body.all === true;
    const category = body.category != null ? String(body.category).trim() : '';
    if (!all) {
      if (!category || !Object.prototype.hasOwnProperty.call(config.categories, category)) {
        return res.status(400).json({ error: 'Brak lub nieznana kategoria (tryb pojedynczej kategorii).' });
      }
    }

    studioBatchRunning = true;
    const cg = new ContentGenerator();
    let llmProvider;
    try {
      llmProvider = resolveLlmFromRequestBody(body, cg);
    } catch (e) {
      studioBatchRunning = false;
      return res.status(e.statusCode || 400).json({ error: e.message });
    }
    const artStyleRaw = body.artStyle != null ? String(body.artStyle).trim() : '';
    const fixedStyle =
      artStyleRaw && config.artStyles.includes(artStyleRaw) ? artStyleRaw : null;
    if (artStyleRaw && !fixedStyle) {
      studioBatchRunning = false;
      return res.status(400).json({
        error: `Nieznany styl „${artStyleRaw}”. Dozwolone: ${config.artStyles.join(', ')}`,
      });
    }

    const batchOpts = { llmProvider, withPdf: false };
    if (fixedStyle) batchOpts.artStyle = fixedStyle;

    const gen = getBatchGenerator();
    if (all) {
      await gen.generateAllCategories(count, batchOpts);
    } else {
      await gen.generateCategory(category, count, batchOpts);
    }
    const total = gen.db.posters.length;
    const nSt = config.artStyles.length;
    const perCat = fixedStyle ? count : count * nSt;
    const msg = all
      ? fixedStyle
        ? `Zakończono: wszystkie kategorie × ${count} plakatów na kategorię (jeden styl: ${fixedStyle}). Wpisów w bibliotece: ${total}.`
        : `Zakończono: wszystkie kategorie × ${count} na każdy styl × ${nSt} stylów = ${perCat} plakatów na kategorię. Wpisów w bibliotece: ${total}.`
      : fixedStyle
        ? `Zakończono: ${count} plakat(ów) w „${category}” (styl: ${fixedStyle}). Wpisów w bibliotece: ${total}.`
        : `Zakończono: „${category}” — ${count} na styl × ${nSt} stylów = ${perCat} plakatów. Wpisów w bibliotece: ${total}.`;
    res.json({ ok: true, message: msg, totalPosters: total });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Generowanie wsadowe nie powiodło się' });
  } finally {
    studioBatchRunning = false;
  }
});

/** Studio: zatwierdź — tylko PNG (full bleed) + inventory. */
app.post('/api/studio/commit', async (req, res) => {
  try {
    const { previewId } = req.body || {};
    const v = validateStudioPayload(req.body || {});
    if (v.error) {
      return res.status(400).json({ error: v.error });
    }
    if (!previewId || typeof previewId !== 'string') {
      return res.status(400).json({ error: 'Wymagane previewId' });
    }
    const cg = new ContentGenerator();
    let promptLlmMeta;
    let resolvedLlm;
    try {
      resolvedLlm = resolveLlmFromRequestBody(req.body || {}, cg);
      promptLlmMeta = resolvedLlm ? cg.describePromptLlm(resolvedLlm) : cg.describePromptLlm(null);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ error: e.message });
    }
    let shopDescription = '';
    try {
      if (cg.resolveLlmProvider(resolvedLlm)) {
        shopDescription = await cg.generateListingDescription({
          title: v.title,
          category: v.category,
          style: v.style,
          imagePrompt: v.trimmedPrompt,
          llmProvider: resolvedLlm,
        });
      }
    } catch (e) {
      console.warn('studio commit listing description:', e.message);
    }

    const gen = getBatchGenerator();
    const result = await gen.commitPreview(
      previewId.trim(),
      v.category,
      v.title,
      v.style,
      v.trimmedPrompt,
      promptLlmMeta,
      { shopDescription: shopDescription || '' }
    );
    const relImage = result.imagePath.replace(/\\/g, '/');
    res.json({
      ok: true,
      id: result.id,
      imagePath: '/' + cleanPosterSubPath(relImage),
      pdfCount: 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Zapis do biblioteki nie powiódł się' });
  }
});

app.post('/api/generate-poster', async (req, res) => {
  try {
    const v = validateStudioPayload(req.body || {});
    if (v.error) {
      return res.status(400).json({ error: v.error });
    }
    const generatePdf = req.body.generatePdf === true;
    const gen = getBatchGenerator();
    const result = await gen.generateOnePoster(v.category, v.title, v.style, v.trimmedPrompt, {
      generatePdf,
      printLayout: v.printLayout,
    });
    const relImage = result.imagePath.replace(/\\/g, '/');
    res.json({
      ok: true,
      id: result.id,
      imagePath: '/' + cleanPosterSubPath(relImage),
      previewOnly: result.previewOnly,
      pdfCount: generatePdf ? Object.keys(result.pdfPaths || {}).length : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Generowanie nie powiodło się' });
  }
});

app.use('/preview-staging', express.static(PREVIEW_STAGING_DIR, { index: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'posters')));

app.listen(PORT, () => {
  console.log(`\n✓ Preview server running at http://localhost:${PORT}`);
  console.log(`✓ Open your browser to see generated posters\n`);
});
