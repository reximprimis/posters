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

/**
 * Etykiety zestawow. Angielski jest zrodlem (tak jak reszta katalogu),
 * polski sluzy Allegro i tlumaczeniu na karcie produktu.
 */
const SET_LABELS = {
  duo: { count: 2, en: 'Set of 2 Prints', pl: 'Zestaw 2 plakatów' },
  tryptyk: { count: 3, en: 'Set of 3 Prints', pl: 'Zestaw 3 plakatów' },
};

/**
 * Tytul zestawu: etykieta z liczba sztuk PRZED tytulem motywu.
 *
 * To nie jest zabieg marketingowy, tylko wymog techniczny. Handle Shopify
 * liczy sie z SAMEGO tytulu, wiec zestaw i pojedynczy plakat o tym samym
 * motywie daly by identyczny handle i jeden z produktow przepadlby przy
 * imporcie. Etykieta rozroznia je globalnie.
 *
 * Przy okazji mowi klientowi wprost, ile sztuk dostaje — bez tego
 * zamowienie zestawu konczy sie reklamacja.
 *
 * @param {string} title motyw, np. "Misty Lake at Dawn"
 * @param {string} layout 'duo' | 'tryptyk'
 * @param {{ language?: 'en' | 'pl' }} [opts]
 * @returns {string}
 */
function buildSetTitle(title, layout, opts = {}) {
  const motyw = String(title || '').trim();
  const label = SET_LABELS[String(layout || '').trim()];
  if (!label) throw new Error(`Nieznany układ zestawu: ${layout}`);
  if (!motyw) throw new Error('Zestaw musi mieć tytuł motywu.');

  const lang = opts.language === 'pl' ? 'pl' : 'en';
  return `${label[lang]} — ${motyw}`;
}

/** Odzyskuje motyw z tytulu zestawu — potrzebne przy tlumaczeniach i eksporcie. */
function stripSetLabel(setTitle) {
  const t = String(setTitle || '').trim();
  for (const label of Object.values(SET_LABELS)) {
    for (const lang of ['en', 'pl']) {
      const prefix = `${label[lang]} — `;
      if (t.startsWith(prefix)) return t.slice(prefix.length);
    }
  }
  return t;
}

module.exports = {
  humanizePosterTitle,
  titleFromFileName,
  isFilenameStyleTitle,
  toPosterHandle,
  SET_LABELS,
  buildSetTitle,
  stripSetLabel,
};
