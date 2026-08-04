/**
 * Tresci sprzedazowe w wielu jezykach.
 *
 * Jezyk jest PARAMETREM EKSPORTU, nie cecha rynku: Shopify wystawia ten sam
 * katalog w kilku jezykach, a Allegro potrzebuje polskiego. Jeden mechanizm
 * obsluguje oba przypadki.
 *
 * Model danych w posters_inventory.json jest CZYSTO ADDYTYWNY:
 *
 *   shopDescription: '...'            <- angielski, zrodlo prawdy, BEZ ZMIAN
 *   translations: {
 *     pl: { name: '...', description: '...' },
 *     de: { name: '...', description: '...' }
 *   }
 *
 * Istniejacy eksport Shopify czyta wylacznie shopDescription, wiec dodanie
 * pola translations jest dla niego niewidoczne. To byl warunek konieczny:
 * Shopify jest komercyjny i nie wolno go zepsuc przy okazji.
 */

/** Angielski nie jest tlumaczeniem — to zrodlo, wiec nie ma go w translations. */
const SOURCE_LANGUAGE = 'en';

const LANGUAGES = [
  { code: 'en', label: 'Angielski', native: 'English', isSource: true },
  { code: 'pl', label: 'Polski', native: 'Polski', isSource: false },
  { code: 'de', label: 'Niemiecki', native: 'Deutsch', isSource: false },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

function isKnownLanguage(code) {
  return BY_CODE.has(String(code || '').trim().toLowerCase());
}

function normalizeLanguage(code) {
  const c = String(code || '').trim().toLowerCase();
  return isKnownLanguage(c) ? c : SOURCE_LANGUAGE;
}

/**
 * Tresc plakatu w zadanym jezyku, z awaryjnym powrotem do angielskiego.
 *
 * Fallback jest celowy: brak tlumaczenia nie moze zatrzymac eksportu. Lepiej
 * wystawic pozycje po angielsku niz nie wystawic jej wcale — pole `fallback`
 * pozwala UI pokazac, ktore pozycje wymagaja jeszcze tlumaczenia.
 *
 * @param {object} poster rekord z inventory
 * @param {string} language kod jezyka
 * @returns {{ name: string, description: string, language: string, fallback: boolean }}
 */
function resolveContent(poster, language) {
  const lang = normalizeLanguage(language);
  const sourceName = String((poster && poster.title) || '').trim();
  const sourceDesc = String((poster && poster.shopDescription) || '').trim();

  if (lang === SOURCE_LANGUAGE) {
    return { name: sourceName, description: sourceDesc, language: SOURCE_LANGUAGE, fallback: false };
  }

  const t = (poster && poster.translations && poster.translations[lang]) || null;
  const name = String((t && t.name) || '').trim();
  const description = String((t && t.description) || '').trim();

  return {
    name: name || sourceName,
    description: description || sourceDesc,
    language: lang,
    // Fallback tylko gdy brakuje OPISU — nazwa czesto zostaje oryginalna celowo.
    fallback: !description,
  };
}

/**
 * Zapis tlumaczenia bez naruszania pozostalych jezykow ani zrodla.
 * Mutuje przekazany rekord i zwraca go.
 */
function setTranslation(poster, language, { name, description } = {}) {
  const lang = normalizeLanguage(language);
  if (lang === SOURCE_LANGUAGE) {
    throw new Error('Angielski jest źródłem — zapisuj go w polach title / shopDescription.');
  }
  if (!poster.translations || typeof poster.translations !== 'object') poster.translations = {};
  const prev = poster.translations[lang] || {};
  const next = { ...prev };
  if (typeof name === 'string') next.name = name.trim();
  if (typeof description === 'string') next.description = description.trim();
  poster.translations[lang] = next;
  return poster;
}

/** Ile pozycji ma juz tlumaczenie w danym jezyku — do wskaznika pokrycia w UI. */
function translationCoverage(posters, language) {
  const lang = normalizeLanguage(language);
  const list = Array.isArray(posters) ? posters : [];
  if (lang === SOURCE_LANGUAGE) {
    return { language: lang, total: list.length, translated: list.length, missing: 0 };
  }
  let translated = 0;
  for (const p of list) {
    const t = p && p.translations && p.translations[lang];
    if (t && String(t.description || '').trim()) translated += 1;
  }
  return { language: lang, total: list.length, translated, missing: list.length - translated };
}

module.exports = {
  SOURCE_LANGUAGE,
  LANGUAGES,
  isKnownLanguage,
  normalizeLanguage,
  resolveContent,
  setTranslation,
  translationCoverage,
};
