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

function getPosterOutputDir(category, style) {
  assertCategoryStyleAllowed(category, style);
  const catSeg = safeDirSegment(category);
  const styleSeg = String(style || '').trim();
  return path.join(config.outputDir, catSeg, styleSeg);
}

module.exports = {
  safeDirSegment,
  getPosterOutputDir,
};
