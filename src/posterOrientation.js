/**
 * Orientacja plakatu — jedyne zrodlo prawdy.
 *
 * Do tej pory orientacja byla zmienna srodowiskowa IMAGE_GENERATION_SIZE,
 * wspolna dla calego uruchomienia. Skutek: plakat wychodzil poziomy albo
 * pionowy zaleznie od tego, co akurat stalo w .env, a kartoteka o tym nie
 * wiedziala. Tutaj orientacja staje sie wlasciwoscia POJEDYNCZEGO plakatu
 * i wszystkie ogniwa (obraz, druk, PDF, mockupy, rozmiary w sklepie) czytaja
 * ja z jednego miejsca.
 *
 * Zestawy (dyptyk/tryptyk) maja wlasna logike panoramy i tu nie zagladaja.
 */

'use strict';

const PORTRAIT = 'portrait';
const LANDSCAPE = 'landscape';

/** Plakat bez zapisanej orientacji to plakat pionowy — tak powstala cala biblioteka. */
const DEFAULT_ORIENTATION = PORTRAIT;

const ALIASY = {
  portrait: PORTRAIT,
  pion: PORTRAIT,
  pionowy: PORTRAIT,
  pionowo: PORTRAIT,
  vertical: PORTRAIT,
  landscape: LANDSCAPE,
  poziom: LANDSCAPE,
  poziomy: LANDSCAPE,
  poziomo: LANDSCAPE,
  horizontal: LANDSCAPE,
};

/**
 * Sprowadza dowolny zapis orientacji do 'portrait' / 'landscape'.
 * Wartosc nierozpoznana cofa sie do pionu, zeby zla literowka w .env
 * nie wywrocila generowania.
 * @param {unknown} wartosc
 * @returns {'portrait'|'landscape'}
 */
function normalizeOrientation(wartosc) {
  const klucz = String(wartosc == null ? '' : wartosc).trim().toLowerCase();
  return ALIASY[klucz] || DEFAULT_ORIENTATION;
}

function isLandscape(orientacja) {
  return normalizeOrientation(orientacja) === LANDSCAPE;
}

/**
 * Ustawia pare wymiarow zgodnie z orientacja.
 * Przyjmuje wymiary "jak dla pionu" (krotszy bok pierwszy) i przy poziomie
 * zamienia je miejscami.
 * @param {number} krotszy
 * @param {number} dluzszy
 * @param {unknown} orientacja
 * @returns {{ width: number, height: number }}
 */
function orientDimensions(krotszy, dluzszy, orientacja) {
  return isLandscape(orientacja)
    ? { width: dluzszy, height: krotszy }
    : { width: krotszy, height: dluzszy };
}

/**
 * Rozmiar plotna wyjsciowego pod druk (piksele), z .env jako baza pionowa.
 * @param {unknown} orientacja
 * @returns {{ width: number, height: number }}
 */
function resolvePrintCanvas(orientacja) {
  const krotszy = parseInt(process.env.IMAGE_TARGET_WIDTH || process.env.DALLE_TARGET_WIDTH || '2000', 10);
  const dluzszy = parseInt(process.env.IMAGE_TARGET_HEIGHT || process.env.DALLE_TARGET_HEIGHT || '3000', 10);
  if (!Number.isFinite(krotszy) || !Number.isFinite(dluzszy)) {
    return orientDimensions(2000, 3000, orientacja);
  }
  // .env moze juz trzymac wartosci "odwrocone" — porzadkujemy, zeby zawsze
  // wchodzil krotszy bok jako pierwszy.
  return orientDimensions(Math.min(krotszy, dluzszy), Math.max(krotszy, dluzszy), orientacja);
}

/**
 * Zdanie do promptu obrazu — model musi wiedziec, w ktora strone komponuje.
 * @param {unknown} orientacja
 * @returns {string}
 */
function orientationPromptLine(orientacja) {
  return isLandscape(orientacja)
    ? 'The artwork is in LANDSCAPE orientation (wider than tall). Compose horizontally: the subject spreads across the width, with breathing room left and right.'
    : 'The artwork is in PORTRAIT orientation (taller than wide). Compose vertically: the subject stands within the height, with breathing room above and below.';
}

/**
 * Opis orientacji ramy do promptow mockupow.
 * @param {unknown} orientacja
 * @returns {string}
 */
function frameOrientationPhrase(orientacja) {
  return isLandscape(orientacja)
    ? 'landscape orientation (wider than tall)'
    : 'portrait orientation (taller than wide)';
}

/**
 * Etykieta rozmiaru druku. W poziomie centymetry zamieniaja sie miejscami,
 * zeby klient widzial 40 × 30, a nie 30 × 40 przy poziomym plakacie.
 * @param {string} klucz np. '30x40'
 * @param {unknown} orientacja
 * @returns {string} np. '40x30'
 */
function orientSizeKey(klucz, orientacja) {
  const m = String(klucz || '').match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (!m) return String(klucz || '');
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const { width, height } = orientDimensions(Math.min(a, b), Math.max(a, b), orientacja);
  return `${width}x${height}`;
}

/** Etykieta dla karty produktu / UI. */
function orientationLabel(orientacja) {
  return isLandscape(orientacja) ? 'Poziomy' : 'Pionowy';
}

module.exports = {
  PORTRAIT,
  LANDSCAPE,
  DEFAULT_ORIENTATION,
  normalizeOrientation,
  isLandscape,
  orientDimensions,
  resolvePrintCanvas,
  orientationPromptLine,
  frameOrientationPhrase,
  orientSizeKey,
  orientationLabel,
};
