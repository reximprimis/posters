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

/**
 * Handle produktu Shopify liczony z tytulu plakatu.
 *
 * Jedyne zrodlo prawdy - uzywaja go zarowno eksport CSV, jak i guard nazw.
 * Rozjechanie tych dwoch miejsc bylo przyczyna kolizji handli w katalogu.
 *
 * @param {string} title
 * @returns {string} slug bezpieczny dla Shopify, nigdy pusty
 */
function toPosterHandle(title) {
  return (
    String(title || '')
      .trim()
      .toLowerCase()
      .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'poster'
  );
}

module.exports = {
  humanizePosterTitle,
  titleFromFileName,
  isFilenameStyleTitle,
  toPosterHandle,
};
