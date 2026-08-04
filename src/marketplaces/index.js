/**
 * Rejestr rynkow sprzedazy.
 *
 * Dodanie kolejnego kanalu (TikTok Shop, agentowe zakupy w ChatGPT/Claude,
 * cokolwiek jeszcze powstanie) to JEDEN nowy plik w tym katalogu plus wpis
 * w tablicy ponizej. Nic innego nie wymaga zmiany.
 *
 * Shopify swiadomie NIE jest tu zarejestrowany. Dziala, jest komercyjny
 * i przynosi przychod — przepisywanie go teraz byloby ryzykiem bez zysku.
 * Zostaje na wlasnej, sprawdzonej sciezce (scripts/exportShopifyCsv.js),
 * a nowe kanaly ida ta. Gdy wzorzec sie sprawdzi, Shopify mozna zmigrowac.
 */

const fs = require('fs');
const path = require('path');

const allegro = require('./allegro');

const MARKETPLACES = [allegro];

const BY_ID = new Map(MARKETPLACES.map((m) => [m.id, m]));

function listMarketplaces() {
  return MARKETPLACES.map((m) => ({
    id: m.id,
    label: m.label,
    defaultLanguage: m.defaultLanguage,
    columns: m.columns.slice(),
    defaultSettings: JSON.parse(JSON.stringify(m.defaultSettings)),
  }));
}

function getMarketplace(id) {
  return BY_ID.get(String(id || '').trim()) || null;
}

function isKnownMarketplace(id) {
  return BY_ID.has(String(id || '').trim());
}

/** Wartosc pola w CSV wg regul Allegro: cudzyslowy gdy przecinek, nowa linia lub cudzyslow. */
function csvEscape(value) {
  const v = String(value == null ? '' : value);
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * Sklada plik CSV z wierszy adaptera.
 * UTF-8 bez BOM, przecinek jako separator — zgodnie z szablonem Allegro.
 */
function rowsToCsv(columns, rows) {
  const head = columns.join(',');
  const body = (rows || []).map((r) => columns.map((c) => csvEscape(r[c])).join(','));
  return [head, ...body].join('\n') + '\n';
}

/** Sciezka pliku wyjsciowego ze znacznikiem czasu — nigdy nie nadpisujemy poprzednich. */
function buildOutputPath(projectRoot, marketplace, language) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const dir = path.join(projectRoot, marketplace.outputDir);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${marketplace.fileBaseName}_${language}_${stamp}.csv`);
}

module.exports = {
  MARKETPLACES,
  listMarketplaces,
  getMarketplace,
  isKnownMarketplace,
  csvEscape,
  rowsToCsv,
  buildOutputPath,
};
