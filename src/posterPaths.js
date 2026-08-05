const path = require('path');
const config = require('../config');
const { assertCategoryStyleAllowed } = require('./categoryStyles');

/** Remove characters invalid in Windows/Unix path segments; keep spaces and Polish letters. */
function safeDirSegment(name) {
  return (
    String(name || '')
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '')
      .replace(/\.+$/g, '') || 'unknown'
  );
}

/**
 * Katalog wyjsciowy plakatu.
 *
 * Podanie `fileBase` daje KAZDEMU PLAKATOWI WLASNY KATALOG:
 *   posters/Kategoria/styl/Tytul/Tytul_30x40.pdf
 *
 * Bez niego pliki wszystkich plakatow ladowaly w jednym katalogu stylu —
 * po kilkunastu plakatach robilo sie tam ponad sto plikow i nie dalo sie
 * niczego znalezc. Nazwy plikow zostaja pelne, zeby plik wyslany do drukarni
 * albo wypakowany z archiwum nadal mowil, ktorego plakatu dotyczy.
 *
 * @param {string} category
 * @param {string} style
 * @param {string} [fileBase] bezpieczna nazwa bazowa plakatu
 */
function getPosterOutputDir(category, style, fileBase) {
  assertCategoryStyleAllowed(category, style);
  const catSeg = safeDirSegment(category);
  const styleSeg = String(style || '').trim();
  const dir = path.join(config.outputDir, catSeg, styleSeg);
  const baseSeg = safeDirSegment(fileBase);
  return fileBase && baseSeg !== 'unknown' ? path.join(dir, baseSeg) : dir;
}

module.exports = {
  safeDirSegment,
  getPosterOutputDir,
};
