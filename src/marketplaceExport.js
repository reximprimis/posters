/**
 * Eksport na rynki inne niz Shopify.
 *
 * Odpowiada za to, co wspolne dla kazdego kanalu: wybor gotowych plakatow,
 * rozwiazanie tresci w zadanym jezyku, zbudowanie URL-i obrazow i zapis pliku.
 * Wiedza specyficzna dla rynku siedzi wylacznie w adapterze.
 *
 * Operacja jest CZYSTA I OFFLINE — zadnych wywolan API. To swiadomy warunek:
 * eksport nie moze zalezec od sieci ani generowac kosztow przy kazdym uruchomieniu.
 * Tlumaczenia powstaja wczesniej i sa zapisane w kartotece.
 */

const fs = require('fs');
const path = require('path');

const { normalizeRelPath, resolveShopifyThumbsRel, evaluatePosterShopifyState } = require('./shopifyState');
const { resolveContent, normalizeLanguage, translationCoverage } = require('./translations');
const { getMarketplace, rowsToCsv, buildOutputPath } = require('./marketplaces');

/**
 * Publiczny URL obrazu. Korzystamy z tego samego CDN co Shopify — miniatury
 * juz tam sa, wiec nowy rynek nie wymaga osobnej infrastruktury obrazow.
 */
function makeImageUrlResolver(projectRoot) {
  const base = String(process.env.SHOPIFY_IMAGE_BASE_URL || '').trim().replace(/\/+$/, '');
  return function imageUrl(relPath) {
    const p = normalizeRelPath(relPath);
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    if (!base) return '';
    const shopRel = resolveShopifyThumbsRel(projectRoot, p);
    const cleaned = shopRel || (p.startsWith('posters/') ? p.slice('posters/'.length) : p);
    return `${base}/${encodeURI(cleaned)}`;
  };
}

/** Plakaty gotowe do wystawienia: zatwierdzone, z kompletem assetow, bez duplikatow. */
function selectExportablePosters(projectRoot, inventory) {
  const all = Array.isArray(inventory && inventory.posters) ? inventory.posters : [];
  const byImage = new Map();
  for (const p of all) {
    if (!p || p.approvedForPrint !== true) continue;
    const key = normalizeRelPath(p.imagePath).toLowerCase();
    if (!key) continue;
    const t = Date.parse(p.createdAt || '') || 0;
    const prev = byImage.get(key);
    if (!prev || t >= prev._t) byImage.set(key, { poster: p, _t: t });
  }
  return [...byImage.values()]
    .map((x) => x.poster)
    .filter((p) => evaluatePosterShopifyState(projectRoot, p).state === 'ready');
}

/**
 * @param {object} opts
 * @param {string} opts.projectRoot
 * @param {string} opts.marketplaceId
 * @param {string} [opts.language] domyslnie jezyk rynku
 * @param {object} [opts.settings] nadpisania ustawien rynku
 * @param {number} [opts.limit] ogranicz liczbe plakatow — do testu jednej pozycji
 * @param {string} [opts.onlyPosterId] wyeksportuj wylacznie ten plakat
 * @param {boolean} [opts.dryRun] policz, ale nie zapisuj pliku
 * @returns {{ ok, marketplace, language, filePath, rowCount, posterCount, warnings, coverage, preview }}
 */
function exportMarketplace(opts) {
  const {
    projectRoot,
    marketplaceId,
    language,
    settings,
    limit,
    onlyPosterId,
    dryRun = false,
  } = opts || {};

  const marketplace = getMarketplace(marketplaceId);
  if (!marketplace) throw new Error(`Nieznany rynek: ${marketplaceId}`);

  const lang = normalizeLanguage(language || marketplace.defaultLanguage);

  const inventoryPath = path.join(projectRoot, 'posters_inventory.json');
  if (!fs.existsSync(inventoryPath)) throw new Error('Brak posters_inventory.json');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

  let posters = selectExportablePosters(projectRoot, inventory);

  if (onlyPosterId) {
    posters = posters.filter((p) => p.id === onlyPosterId);
    if (!posters.length) throw new Error(`Plakat o id "${onlyPosterId}" nie jest gotowy do eksportu.`);
  }
  if (Number.isFinite(limit) && limit > 0) posters = posters.slice(0, limit);

  const { rows, warnings } = marketplace.buildRows({
    posters,
    settings,
    content: (poster) => resolveContent(poster, lang),
    imageUrl: makeImageUrlResolver(projectRoot),
  });

  const csv = rowsToCsv(marketplace.columns, rows);

  let filePath = '';
  if (!dryRun && rows.length) {
    filePath = buildOutputPath(projectRoot, marketplace, lang);
    // UTF-8 bez BOM — Allegro odrzuca BOM w niektorych narzedziach importu.
    fs.writeFileSync(filePath, csv, { encoding: 'utf8' });
  }

  return {
    ok: true,
    marketplace: marketplace.id,
    language: lang,
    filePath: filePath ? path.relative(projectRoot, filePath).replace(/\\/g, '/') : '',
    rowCount: rows.length,
    posterCount: posters.length,
    warnings,
    coverage: translationCoverage(posters, lang),
    // Podglad pierwszych wierszy — pozwala sprawdzic plik bez otwierania go.
    preview: csv.split('\n').slice(0, 3).join('\n'),
  };
}

module.exports = {
  makeImageUrlResolver,
  selectExportablePosters,
  exportMarketplace,
};
