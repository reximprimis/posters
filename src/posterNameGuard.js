/**
 * Unikalność tytułu / nazwy pliku w obrębie kategorii + stylu.
 * Zapobiega nadpisywaniu istniejącego mastera (i psuciu ramki).
 */

const fs = require('fs');
const path = require('path');
const { getPosterOutputDir } = require('./posterPaths');
const { titleFromFileName } = require('./posterTitle');
const { normalizeTitleKey } = require('./categoryTitlePools');

function makeSafeFileBase(title) {
  const raw = String(title || '').trim();
  const slug = raw
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || 'poster';
}

function resolveMasterAbsPath(category, style, title) {
  const outputDir = getPosterOutputDir(category, style);
  const safeFileBase = makeSafeFileBase(title);
  return path.join(outputDir, `${safeFileBase}.png`);
}

function isReservedMasterFileName(fileName) {
  const lower = String(fileName || '').toLowerCase();
  if (!lower.endsWith('.png')) return true;
  if (lower.endsWith('_ramka.png')) return true;
  if (lower.endsWith('_master.png')) return true;
  if (lower.includes('.gen.tmp.')) return true;
  if (lower.includes('_thumb.')) return true;
  if (lower.startsWith('mockup_')) return true;
  return false;
}

function listDiskTitlesInCategoryStyle(category, style) {
  let outputDir;
  try {
    outputDir = getPosterOutputDir(category, style);
  } catch (_) {
    return [];
  }
  if (!fs.existsSync(outputDir)) return [];
  const out = [];
  for (const name of fs.readdirSync(outputDir)) {
    if (isReservedMasterFileName(name)) continue;
    try {
      if (!fs.statSync(path.join(outputDir, name)).isFile()) continue;
    } catch (_) {
      continue;
    }
    const title = titleFromFileName(name);
    if (title && title !== 'Manual Import') out.push(title);
  }
  return out;
}

/**
 * Tytuły już zajęte w danej kategorii + stylu (inventory + pliki PNG na dysku).
 * @param {string} category
 * @param {string} style
 * @param {object[]} [dbPosters]
 * @returns {string[]}
 */
function collectExcludeTitles(category, style, dbPosters = []) {
  const cat = String(category || '').trim();
  const st = String(style || '').trim();
  const keys = new Set();
  const titles = [];

  const add = (t) => {
    const trimmed = String(t || '').trim();
    const k = normalizeTitleKey(trimmed);
    if (!k || keys.has(k)) return;
    keys.add(k);
    titles.push(trimmed);
  };

  for (const p of dbPosters || []) {
    if (!p || String(p.category || '').trim() !== cat) continue;
    if (st && String(p.artStyle || '').trim() !== st) continue;
    add(p.title);
  }
  for (const t of listDiskTitlesInCategoryStyle(cat, st)) {
    add(t);
  }
  return titles;
}

function masterExistsAt(category, style, title) {
  try {
    const abs = resolveMasterAbsPath(category, style, title);
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  } catch (_) {
    return false;
  }
}

class PosterNameCollisionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PosterNameCollisionError';
    this.code = 'POSTER_NAME_COLLISION';
    this.details = details;
  }
}

/**
 * @param {string} category
 * @param {string} style
 * @param {string} title
 * @param {{ allowOverwrite?: boolean }} [opts]
 */
function assertMasterPathAvailable(category, style, title, opts = {}) {
  if (opts.allowOverwrite === true) return;
  const cat = String(category || '').trim();
  const st = String(style || '').trim();
  const t = String(title || '').trim();
  if (!t) {
    throw new PosterNameCollisionError('Brak tytułu plakatu.');
  }
  const abs = resolveMasterAbsPath(cat, st, t);
  if (!fs.existsSync(abs)) return;
  const fileName = path.basename(abs);
  throw new PosterNameCollisionError(
    `Plakat „${t}” już istnieje w „${cat}” / ${st} (${fileName}). ` +
      'Wybierz inny tytuł — ponowna generacja pod tą samą nazwą nadpisuje master i psuje ramkę.',
    { category: cat, style: st, title: t, fileName, path: abs }
  );
}

function collisionErrorMessage(category, style, title) {
  const cat = String(category || '').trim();
  const st = String(style || '').trim();
  const t = String(title || '').trim();
  const abs = resolveMasterAbsPath(cat, st, t);
  const fileName = path.basename(abs);
  return (
    `Plakat „${t}” już istnieje w „${cat}” / ${st} (${fileName}). ` +
    'Wybierz inny tytuł — nie generujemy ponownie pod tą samą nazwą pliku.'
  );
}

module.exports = {
  makeSafeFileBase,
  resolveMasterAbsPath,
  listDiskTitlesInCategoryStyle,
  collectExcludeTitles,
  masterExistsAt,
  assertMasterPathAvailable,
  collisionErrorMessage,
  PosterNameCollisionError,
};
