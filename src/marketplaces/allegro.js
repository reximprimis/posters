/**
 * Adapter Allegro — format rozszerzony CSV ("Importuj i wystaw").
 *
 * Kolumny wziete z oficjalnego szablonu Allegro, nie z domyslu:
 * allegro_csv/ovf-template-dla-rozszerzonego-pliku-csv-dane.csv
 *
 * Roznica wobec Shopify, ktora ksztaltuje caly adapter: import Allegro jest
 * PLASKI. Jedna oferta = jeden wiersz. Nie ma wariantow, wiec plakat w pieciu
 * rozmiarach to piec osobnych ofert, a nie jeden produkt z piecioma wariantami.
 * Dlatego domyslnie eksportujemy tylko jeden styl wydruku — inaczej liczba
 * ofert (i prowizji) podwaja sie bez zysku sprzedazowego.
 *
 * GTIN: Allegro wymaga go w formacie podstawowym. Plakaty print-on-demand
 * go nie maja. Format rozszerzony pozwala wystawiac bez GTIN, pozwalajac AI
 * Allegro dobrac kategorie — kolumna zostaje pusta i to jest do przetestowania.
 */

const SIZE_LABELS = {
  '13x18': '13x18 cm',
  '21x30': '21x30 cm',
  '30x40': '30x40 cm',
  '40x50': '40x50 cm',
  '50x70': '50x70 cm',
  '70x100': '70x100 cm',
};

const IMAGE_SLOTS = 16;

const COLUMNS = [
  'GTIN',
  'EXTERNAL_ID',
  'NAME',
  'STOCK',
  'PRICE',
  'MPN',
  'DESCRIPTION',
  ...Array.from({ length: IMAGE_SLOTS }, (_, i) => `IMAGE${i + 1}`),
  'CATEGORY',
  'BRAND',
  'COLOR',
  'SIZE',
  'MATERIAL',
];

/** Wymogi Allegro dla kolumny NAME. */
const NAME_MIN = 12;
const NAME_MAX = 75;
const NAME_MIN_WORDS = 3;

const DEFAULT_SETTINGS = {
  // Ceny startowe skopiowane z Shopify — Allegro pobiera prowizje, wiec prawie
  // na pewno wymagaja podniesienia. Swiadomie NIE zgaduje marzy za uzytkownika.
  prices: {
    '13x18': '16.00',
    '21x30': '26.00',
    '30x40': '43.00',
    '40x50': '57.00',
    '50x70': '71.00',
  },
  selectedSizes: ['21x30', '30x40', '40x50', '50x70'],
  // Wersja z bialym marginesem (passe-partout) — tak plakaty prezentuje
  // konkurencja na tym rynku i tak lepiej wygladaja w miniaturze oferty.
  printStyle: 'ramka',
  stock: 100,
  /**
   * Ciag kategorii dopasowywany przez AI Allegro do jego wlasnego drzewa.
   *
   * Pierwsza proba ("Dom i Ogród/Wyposażenie wnętrz/Dekoracje/Obrazy i plakaty")
   * NIE zostala rozpoznana — oferty dostaly "kategoria: brak". Wartosc ponizej
   * odwzorowuje sciezke, ktora Allegro samo podpowiedzialo w oknie wyboru
   * kategorii, wiec dopasowanie jest znacznie pewniejsze.
   */
  category: 'Dom i Ogród - Wyposażenie - Dekoracje ścienne - Plakaty',
  /** Kategorie, ktore na Allegro maja wlasne, trafniejsze miejsce w drzewie. */
  categoryMap: {
    'Plakaty dla dzieci': 'Dom i Ogród - Dekoracje - Obrazki i plakaty dla dzieci',
  },
  brand: 'REXIMPRIMIS',
  material: 'Papier',
  namePrefix: 'Plakat',
};

/**
 * Nazwa oferty. Prefiks i rozmiar nie sa ozdoba — bez nich 7 ze 160 tytulow
 * lamie wymogi Allegro (min 12 znakow, min 3 slowa), a wtedy Allegro nadaje
 * produktowi wlasna nazwe.
 */
function buildName({ title, sizeKey, prefix }) {
  const parts = [String(prefix || '').trim(), String(title || '').trim(), SIZE_LABELS[sizeKey] || sizeKey];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

/** @returns {string[]} lista problemow; pusta = nazwa poprawna */
function validateName(name) {
  const n = String(name || '').trim();
  const problems = [];
  if (n.length < NAME_MIN) problems.push(`za krótka (${n.length} zn., min ${NAME_MIN})`);
  if (n.length > NAME_MAX) problems.push(`za długa (${n.length} zn., max ${NAME_MAX})`);
  if (n.split(/\s+/).filter(Boolean).length < NAME_MIN_WORDS) problems.push('mniej niż 3 słowa');
  return problems;
}

const DOUBLE_QUOTE = String.fromCharCode(34);

/**
 * Czysci opis przed wystawieniem.
 *
 * Cztery opisy w kartotece maja nieparzysta liczbe cudzyslowow — przy generowaniu
 * zgubil sie cudzyslow otwierajacy, wiec tekst zaczyna sie od `Tytul" ...`.
 * Usuwamy osierocone cudzyslowy zamiast zgadywac, gdzie mial stac brakujacy.
 * Danych zrodlowych NIE zmieniamy — to zadanie osobne i wymagajace decyzji.
 *
 * @returns {{ text: string, repaired: boolean }}
 */
function sanitizeDescription(raw) {
  const text = String(raw || '').trim();
  const count = (text.match(new RegExp(DOUBLE_QUOTE, 'g')) || []).length;
  if (count % 2 === 0) return { text, repaired: false };
  return { text: text.split(DOUBLE_QUOTE).join('').replace(/\s{2,}/g, ' ').trim(), repaired: true };
}

/** Cena w formacie Allegro: sama liczba, kropka dziesietna, bez waluty. */
function formatPrice(value) {
  const n = Number(String(value == null ? '' : value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return '';
  return n.toFixed(2);
}

/**
 * @param {object} ctx
 * @param {object[]} ctx.posters rekordy inventory (juz przefiltrowane do gotowych)
 * @param {object} ctx.settings ustawienia rynku
 * @param {(poster: object) => {name: string, description: string, fallback: boolean}} ctx.content
 *        rozwiazanie tresci w wybranym jezyku — wstrzykiwane, zeby adapter nie
 *        wiedzial nic o mechanizmie tlumaczen
 * @param {(relPath: string) => string} ctx.imageUrl budowanie publicznego URL
 * @returns {{ rows: object[], warnings: string[] }}
 */
function buildRows({ posters, settings, content, imageUrl }) {
  const cfg = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const prices = { ...DEFAULT_SETTINGS.prices, ...(cfg.prices || {}) };
  const sizes = (Array.isArray(cfg.selectedSizes) ? cfg.selectedSizes : []).filter((s) => SIZE_LABELS[s]);
  const rows = [];
  const warnings = [];

  if (!sizes.length) {
    warnings.push('Nie wybrano żadnego rozmiaru — plik byłby pusty.');
    return { rows, warnings };
  }

  for (const poster of posters || []) {
    const { name: baseName, description: rawDescription, fallback } = content(poster);
    if (fallback) {
      warnings.push(`Brak tłumaczenia opisu: „${poster.title}” — użyto angielskiego.`);
    }
    const { text: description, repaired } = sanitizeDescription(rawDescription);
    if (repaired) {
      warnings.push(`Naprawiono osierocony cudzysłów w opisie: „${poster.title}” (dane źródłowe bez zmian).`);
    }

    const framed = cfg.printStyle === 'ramka';
    const mainThumb = framed ? poster.imagePathFramedThumb : poster.imagePathThumb;
    const mockups = (poster && poster.mockups) || {};
    // Kolejnosc ma znaczenie: pierwszy obraz jest miniatura oferty. Potem
    // wnetrze i packshot ramy, bo zdjecia aranzacyjne najmocniej sprzedaja,
    // a na koncu wariant alternatywny.
    const images = [
      mainThumb,
      mockups.interior,
      mockups.frame,
      framed ? poster.imagePathThumb : poster.imagePathFramedThumb,
    ]
      .map((p) => imageUrl(p))
      .filter(Boolean)
      .filter((url, i, arr) => arr.indexOf(url) === i)
      .slice(0, IMAGE_SLOTS);

    if (!images.length) {
      warnings.push(`Pomijam „${poster.title}” — brak obrazu do wystawienia.`);
      continue;
    }

    for (const sizeKey of sizes) {
      const price = formatPrice(prices[sizeKey]);
      if (!price) {
        warnings.push(`Pomijam rozmiar ${sizeKey} dla „${poster.title}” — brak ceny.`);
        continue;
      }

      const name = buildName({ title: baseName, sizeKey, prefix: cfg.namePrefix });
      const problems = validateName(name);
      if (problems.length) {
        warnings.push(`Nazwa „${name}” — ${problems.join(', ')}.`);
      }

      const sku = `${poster.id || baseName}-${cfg.printStyle}-${sizeKey}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const row = {
        GTIN: '', // Puste swiadomie — patrz naglowek pliku.
        EXTERNAL_ID: sku,
        NAME: name,
        STOCK: String(cfg.stock),
        PRICE: price,
        MPN: sku,
        DESCRIPTION: description,
        CATEGORY: (cfg.categoryMap && cfg.categoryMap[poster.category]) || cfg.category,
        BRAND: cfg.brand,
        COLOR: '', // Plakat nie ma jednego koloru — zostawiamy Allegro.
        SIZE: SIZE_LABELS[sizeKey],
        MATERIAL: cfg.material,
      };
      images.forEach((url, i) => {
        row[`IMAGE${i + 1}`] = url;
      });

      rows.push(row);
    }
  }

  return { rows, warnings };
}

module.exports = {
  id: 'allegro',
  label: 'Allegro',
  /** Rynek polski — domyslny jezyk eksportu. */
  defaultLanguage: 'pl',
  fileBaseName: 'allegro_offers',
  outputDir: 'allegro_csv',
  columns: COLUMNS,
  defaultSettings: DEFAULT_SETTINGS,
  sizeLabels: SIZE_LABELS,
  buildName,
  validateName,
  formatPrice,
  sanitizeDescription,
  buildRows,
};
