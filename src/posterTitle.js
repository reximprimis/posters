/**
 * Turn filename / slug titles into shop-facing Title Case labels.
 */

function humanizePosterTitle(raw) {
  let t = String(raw || '').trim();
  if (!t) return '';

  const hadUnderscores = t.includes('_');
  if (hadUnderscores) {
    t = t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }

  t = t.replace(/\s+safe\s+frame\s*$/i, '').trim();
  t = t.replace(/\s+/g, ' ').trim();
  if (!t) return '';

  if (!hadUnderscores) return t;

  return t.replace(/\b\w+\b/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function titleFromFileName(fileName) {
  const base = String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .trim();
  return humanizePosterTitle(base) || 'Manual Import';
}

function isFilenameStyleTitle(title) {
  const t = String(title || '').trim();
  if (!t) return false;
  return t.includes('_') || /\bsafe\s+frame\s*$/i.test(t);
}

module.exports = {
  humanizePosterTitle,
  titleFromFileName,
  isFilenameStyleTitle,
};
