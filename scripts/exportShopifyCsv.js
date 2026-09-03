const fs = require('fs');
const path = require('path');
require('dotenv').config();
const {
  normalizeRelPath,
  evaluatePosterShopifyState,
  reconcileInventoryShopifyStates,
  resolveShopifyThumbsRel,
  flattenPosterDir,
  summarizeApprovedShopifyStates,
} = require('../src/shopifyState');
const { humanizePosterTitle, toPosterHandle } = require('../src/posterTitle');
const { findHandleCollisions } = require('../src/posterNameGuard');
const { fetchShopifyProductHandles, getHeadlessConfig } = require('../src/shopifyHeadless');

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'posters_inventory.json');
const outputDir = path.join(projectRoot, 'shopify_csv');
const outputCsvPath = path.join(outputDir, 'products_export_shopify.csv');
const settingsPath = path.join(projectRoot, 'shopify_export_settings.json');
const historyPath = path.join(projectRoot, 'shopify_export_history.json');

const DEFAULT_HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option1 Linked To',
  'Option2 Name',
  'Option2 Value',
  'Option2 Linked To',
  'Option3 Name',
  'Option3 Value',
  'Option3 Linked To',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Unit Price Total Measure',
  'Unit Price Total Measure Unit',
  'Unit Price Base Measure',
  'Unit Price Base Measure Unit',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Materiał ramy dzieła sztuki (product.metafields.shopify.artwork-frame-material)',
  'Kolor (product.metafields.shopify.color-pattern)',
  'Materiał dekoracyjny (product.metafields.shopify.decoration-material)',
  'Obsługiwany format (product.metafields.shopify.format-supported)',
  'Styl oprawki (product.metafields.shopify.frame-style)',
  'Materiał (product.metafields.shopify.material)',
  'Typ mocowania (product.metafields.shopify.mounting-type)',
  'Orientacja (product.metafields.shopify.orientation)',
  'Kształt (product.metafields.shopify.shape)',
  'Motyw (product.metafields.shopify.theme)',
  'Variant Image',
  'Variant Weight Unit',
  'Variant Tax Code',
  'Cost per item',
  'Status',
];

// Ceny zsynchronizowane ze sklepem reximprimis.com (PLN, Storefront API, 2026-08-03).
// 70x100 nie istnieje na sklepie — cena orientacyjna, rozmiar poza selectedSizes.
const SIZE_DEFS = [
  { key: '13x18', label: '13 × 18 cm (Small)', price: '16.00' },
  { key: '21x30', label: '21 × 30 cm (A4)', price: '26.00' },
  { key: '30x40', label: '30 × 40 cm (Medium)', price: '43.00' },
  { key: '40x50', label: '40 × 50 cm (Large)', price: '57.00' },
  { key: '50x70', label: '50 × 70 cm (Large)', price: '71.00' },
  { key: '70x100', label: '70 × 100 cm (Extra Large)', price: '99.00' },
];

/** Cena przekreślona = cena × mnożnik. Sklep prowadzi promocję −50%, więc 2. */
const DEFAULT_COMPARE_AT_MULTIPLIER = 2;

/** @returns {string} cena porównawcza sformatowana lub '' gdy mnożnik <= 1. */
function compareAtFor(price, multiplier) {
  const p = Number(String(price).replace(',', '.'));
  const m = Number(multiplier);
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(m) || m <= 1) return '';
  return (p * m).toFixed(2);
}

const PRINT_STYLES = [
  { label: 'Full Bleed', code: 'full' },
  { label: 'White Border', code: 'ramka' },
];

/**
 * Cena zestawu = cena pojedynczego plakatu tego rozmiaru × mnoznik.
 *
 * Lekki rabat wzgledem kupna osobno (3 × 43 zl = 129 zl, tryptyk 116 zl) jest
 * finansowany oszczednoscia na wysylce i obsludze: zestaw to JEDNA paczka i jedno
 * zamowienie zamiast trzech. Marza na zestawie wychodzi wyzsza niz na trzech
 * plakatach sprzedanych osobno, mimo nizszej ceny jednostkowej.
 *
 * Poziom sprawdzony wzgledem rynku: przy 2,70x nasza cena PRZEKRESLONA wypada
 * niemal 1:1 z cena konkurencji z Etsy po jej rabacie (232 vs 228 zl na 30x40),
 * a nasza cena promocyjna jest o polowe nizsza.
 */
const DEFAULT_SET_MULTIPLIERS = { duo: 1.85, tryptyk: 2.7 };

/** Zestawy sa WYLACZNIE full bleed — nie maja wariantu z passe-partout. */
const SET_PRINT_STYLES = [{ label: 'Full Bleed', code: 'full' }];

const { orientSizeKey, isLandscape } = require('../src/posterOrientation');
const {
  normalizeRooms,
  normalizeColors,
  normalizeOccasions,
  normalizeCollections,
  colorName,
  categoryName,
} = require('../src/taxonomy');
const { getRoomCollectionsForCategory } = require('../src/categoryStyles');

/**
 * Rozmiary opisane pod orientacje plakatu. Klient kupujacy plakat poziomy
 * ma zobaczyc 40 × 30 cm, a nie 30 × 40 — inaczej wymiar kloci sie z tym,
 * co widzi na zdjeciu. Dla pionu funkcja nic nie zmienia, wiec cala
 * dotychczasowa biblioteka eksportuje sie bajt w bajt tak samo.
 */
function sizeDefsForOrientation(defs, orientation) {
  if (!isLandscape(orientation)) return defs;
  return defs.map((s) => {
    const key = orientSizeKey(s.key, orientation);
    const [w, h] = key.split('x');
    return { ...s, key, label: s.label.replace(/^\s*\d+\s*×\s*\d+/, `${w} × ${h}`) };
  });
}

/**
 * Ile dni plakat liczy sie jako nowosc.
 *
 * "Nowosci" ma kazdy sklep w branzy, ale u wszystkich jest to reczna kolekcja.
 * U nas wynika z daty powstania, wiec utrzymuje sie sama przy kazdym eksporcie.
 */
const DNI_NOWOSCI = 30;

/**
 * Tagi z przestrzeniami nazw.
 *
 * Shopify nie ma osobnego pola na "os katalogu" — kolekcje automatyczne
 * i filtry w Search & Discovery czytaja WLASNIE tagi. Prefiks pozwala
 * zbudowac z nich osobne wymiary zamiast jednej plaskiej listy, w ktorej
 * "photography" i "living-room" leza obok siebie bez zadnej struktury.
 *
 * `poster` zostaje bez prefiksu — to typ, nie wymiar.
 */
/**
 * Rozmiar do tagu: zawsze krotszy bok pierwszy.
 * @param {string} klucz np. "70x50" albo "50x70"
 * @returns {string} np. "50x70"
 */
function kanonicznyRozmiar(klucz) {
  const m = String(klucz || '').match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (!m) return String(klucz || '');
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  return Math.min(a, b) + 'x' + Math.max(a, b);
}

function zbudujTagi(p, categoryTag, styleTag, rozmiary) {
  const t = ['poster'];
  if (categoryTag) t.push('category:' + categoryTag);
  if (styleTag) t.push('style:' + styleTag);
  t.push('orientation:' + (p.orientation === 'landscape' ? 'landscape' : 'portrait'));

  // Gdy rekord nie ma wlasnych pomieszczen — a 69 ze 158 zatwierdzonych nie
  // mialo — bierzemy domyslne dla kategorii. Pomieszczenie jest cecha tematu:
  // botanika pasuje do sypialni i lazienki niezaleznie od tego, czy ktos
  // wypelnil pole w rekordzie.
  const pokoje = normalizeRooms(p.rooms || p.roomCollections);
  const pokojeFinalne = pokoje.length
    ? pokoje
    : normalizeRooms(getRoomCollectionsForCategory(p.category));
  for (const r of pokojeFinalne) t.push('room:' + r);
  for (const c of normalizeColors(p.colors)) t.push('color:' + c);
  for (const o of normalizeOccasions(p.occasions)) t.push('occasion:' + o);
  for (const k of normalizeCollections(p.collections)) t.push('collection:' + k);
  // Tag rozmiaru zawsze w postaci KANONICZNEJ (krotszy bok pierwszy).
  // Nazwa wariantu slusznie idzie za orientacja ("70 × 50 cm" dla poziomego),
  // ale tag filtra nie moze — inaczej plakat poziomy dostaje size:70x50,
  // strona zna tylko size:50x70 i poziome wypadaja z filtra rozmiaru.
  for (const s of rozmiary) t.push('size:' + kanonicznyRozmiar(s.key));

  // Nowosci licza sie z daty powstania — bez tego kolekcje trzeba by
  // odswiezac recznie, a przy kazdym eksporcie i tak przeliczamy wszystko.
  const powstal = Date.parse(p.createdAt || '');
  if (Number.isFinite(powstal) && Date.now() - powstal <= DNI_NOWOSCI * 86400000) {
    t.push('collection:new-arrivals');
  }
  return t.filter(Boolean).join(', ');
}

/**
 * Opis SEO przycinany PO GRANICY SLOWA.
 *
 * Wczesniej ucinalismy na sztywno po 160 znakach, wiec opis konczyl sie
 * w polowie wyrazu — w wynikach wyszukiwania wyglada to na blad, a nie
 * na skrot.
 */
function przytnijSeo(tekst, limit = 160) {
  const s = String(tekst || '').replace(/\s+/g, ' ').trim();
  if (s.length <= limit) return s;
  const uciety = s.slice(0, limit);
  const spacja = uciety.lastIndexOf(' ');
  const bazowy = spacja > limit * 0.6 ? uciety.slice(0, spacja) : uciety;
  return bazowy.replace(/[\s,;:.\-–—]+$/, '') + '…';
}

/**
 * Kategoria w taksonomii Shopify. Bez niej produkt nie mapuje sie na Google
 * Shopping ani na natywne filtry sklepu. Jesli Shopify nie rozpozna napisu,
 * po prostu zostawi pole puste — nic sie nie psuje.
 */
const KATEGORIA_SHOPIFY = 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork';

const SIZE_KEYS = SIZE_DEFS.map((s) => s.key);
const DEFAULT_PRICES = Object.fromEntries(SIZE_DEFS.map((s) => [s.key, s.price]));

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

// toHandle() zyje teraz w src/posterTitle.js jako toPosterHandle - wspolne zrodlo
// prawdy dla eksportu i guarda nazw, zeby oba nie mogly sie znowu rozjechac.
const toHandle = toPosterHandle;

function htmlDescription(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const escaped = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<p>${escaped}</p>`;
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (!/[",\n\r]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function slugifyTag(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[ch] || ch))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withThumbSuffix(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  const dot = p.lastIndexOf('.');
  if (dot < 0) return '';
  return p.slice(0, dot) + '_thumb.jpg';
}

function withFramedSuffix(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  const dot = p.lastIndexOf('.');
  if (dot < 0) return '';
  return p.slice(0, dot) + '_ramka' + p.slice(dot);
}

function fileExists(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return false;
  const abs = path.join(projectRoot, p);
  return fs.existsSync(abs) && fs.statSync(abs).isFile();
}

function toPublicUrl(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = String(process.env.SHOPIFY_IMAGE_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  const shopRel = resolveShopifyThumbsRel(projectRoot, p);
  // Sciezka awaryjna dotyczy plakatow jeszcze niezsynchronizowanych do
  // shopify_thumbs. Musi byc PLASKA, bo tak zapisze je synchronizacja —
  // inaczej adres wskazywalby katalog plakatu, ktorego tam nigdy nie bedzie.
  const surowa = p.startsWith('posters/') ? p.slice('posters/'.length) : p;
  const cleaned = shopRel || flattenPosterDir(surowa);
  return `${base}/${encodeURI(cleaned)}`;
}

function dedupePosters(rows) {
  const map = new Map();
  for (const p of rows || []) {
    const k = normalizeRelPath(p && p.imagePath).toLowerCase();
    if (!k) continue;
    const prev = map.get(k);
    const t = Date.parse(p && p.createdAt ? p.createdAt : '') || 0;
    if (!prev || t >= prev._t) map.set(k, { ...p, _t: t });
  }
  return [...map.values()].map(({ _t, ...rest }) => rest);
}

function pickHeaders() {
  if (!fs.existsSync(outputCsvPath)) return DEFAULT_HEADERS;
  const firstLine = fs.readFileSync(outputCsvPath, 'utf8').split(/\r?\n/, 1)[0].trim();
  if (!firstLine) return DEFAULT_HEADERS;
  return firstLine.split(',').map((x) => x.trim()).filter(Boolean);
}

function makeRow(headers, data) {
  return headers.map((h) => csvEscape(data[h] || '')).join(',');
}

function parseArgs(argv) {
  const out = {
    all: false,
    onlyNew: false,
    onlyMissingOnStore: false,
    fetchStoreHandles: false,
    storeLimit: 5000,
    sizes: [],
    prices: {},
    timestamped: false,
    saveSettings: false,
  };
  for (const raw of argv) {
    const a = String(raw || '').trim();
    if (!a) continue;
    if (a === '--all') out.all = true;
    else if (a === '--only-new') out.onlyNew = true;
    else if (a === '--only-missing-on-store') out.onlyMissingOnStore = true;
    else if (a === '--fetch-store-handles') out.fetchStoreHandles = true;
    else if (a === '--timestamped') out.timestamped = true;
    else if (a === '--save-settings') out.saveSettings = true;
    else if (a.startsWith('--sizes=')) {
      out.sizes = a
        .slice('--sizes='.length)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => SIZE_KEYS.includes(s));
    } else if (a.startsWith('--price-')) {
      const m = a.match(/^--price-([0-9]+x[0-9]+)=(.+)$/);
      if (!m) continue;
      const key = m[1];
      const val = String(m[2]).trim().replace(',', '.');
      if (!SIZE_KEYS.includes(key)) continue;
      const n = Number(val);
      if (Number.isFinite(n) && n > 0) out.prices[key] = n.toFixed(2);
    } else if (a.startsWith('--store-limit=')) {
      const n = Number(a.slice('--store-limit='.length));
      if (Number.isFinite(n) && n > 0) out.storeLimit = Math.floor(n);
    }
  }
  if (out.onlyMissingOnStore) out.fetchStoreHandles = true;
  return out;
}

function loadSettings() {
  const base = {
    prices: { ...DEFAULT_PRICES },
    selectedSizes: [...SIZE_KEYS],
    compareAtMultiplier: DEFAULT_COMPARE_AT_MULTIPLIER,
    setMultipliers: { ...DEFAULT_SET_MULTIPLIERS },
  };
  if (!fs.existsSync(settingsPath)) return base;
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const prices = { ...base.prices };
    for (const k of SIZE_KEYS) {
      if (raw && raw.prices && raw.prices[k] != null) {
        const n = Number(String(raw.prices[k]).replace(',', '.'));
        if (Number.isFinite(n) && n > 0) prices[k] = n.toFixed(2);
      }
    }
    const selectedSizes = Array.isArray(raw && raw.selectedSizes)
      ? raw.selectedSizes.filter((k) => SIZE_KEYS.includes(k))
      : base.selectedSizes;
    let compareAtMultiplier = base.compareAtMultiplier;
    if (raw && raw.compareAtMultiplier != null) {
      const m = Number(String(raw.compareAtMultiplier).replace(',', '.'));
      if (Number.isFinite(m) && m >= 1) compareAtMultiplier = m;
    }
    // Mnozniki zestawow sa USTAWIENIEM, nie stala — zmiana ceny dyptyku czy
    // tryptyku ma byc jedna liczba w pliku, bez ruszania kodu.
    const setMultipliers = { ...base.setMultipliers };
    if (raw && raw.setMultipliers && typeof raw.setMultipliers === 'object') {
      for (const k of Object.keys(setMultipliers)) {
        const m = Number(String(raw.setMultipliers[k]).replace(',', '.'));
        if (Number.isFinite(m) && m > 0) setMultipliers[k] = m;
      }
    }

    return {
      prices,
      selectedSizes: selectedSizes.length ? selectedSizes : [...SIZE_KEYS],
      compareAtMultiplier,
      setMultipliers,
    };
  } catch (_) {
    return base;
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

function loadHistoryHandles() {
  if (!fs.existsSync(historyPath)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    const arr = Array.isArray(raw && raw.handles) ? raw.handles : [];
    return new Set(arr.map((x) => String(x || '').trim()).filter(Boolean));
  } catch (_) {
    return new Set();
  }
}

function saveHistoryHandles(prevSet, newHandles) {
  const merged = new Set(prevSet);
  for (const h of newHandles || []) merged.add(h);
  const out = {
    updatedAt: new Date().toISOString(),
    handles: [...merged].sort((a, b) => a.localeCompare(b)),
  };
  fs.writeFileSync(historyPath, JSON.stringify(out, null, 2), 'utf8');
}

async function main() {
  ensureOutputDir();
  if (!fs.existsSync(inventoryPath)) throw new Error('Brak posters_inventory.json');
  const cli = parseArgs(process.argv.slice(2));
  const settings = loadSettings();

  const prices = { ...settings.prices, ...cli.prices };
  const selectedSizes = (cli.sizes && cli.sizes.length ? cli.sizes : settings.selectedSizes).filter((k) => SIZE_KEYS.includes(k));
  const compareAtMultiplier = settings.compareAtMultiplier;
  const sizeDefs = SIZE_DEFS.filter((s) => selectedSizes.includes(s.key)).map((s) => {
    const price = prices[s.key] || s.price;
    return { ...s, price, compareAtPrice: compareAtFor(price, compareAtMultiplier) };
  });
  if (sizeDefs.length === 0) throw new Error('Brak wybranych rozmiarów do eksportu.');

  if (cli.saveSettings || Object.keys(cli.prices).length > 0 || (cli.sizes && cli.sizes.length > 0)) {
    saveSettings({ prices, selectedSizes, compareAtMultiplier });
  }

  const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const reconcileSummary = reconcileInventoryShopifyStates(projectRoot, inv);
  if (reconcileSummary.changed > 0) fs.writeFileSync(inventoryPath, JSON.stringify(inv, null, 2), 'utf8');

  const approvedOnly = !cli.all;
  const wszystkie = dedupePosters(inv.posters || []).filter((p) => (approvedOnly ? p.approvedForPrint === true : true));

  // Zestawy ida OSOBNA petla — maja wlasny cennik (mnoznik za uklad), brak
  // wariantu z passe-partout i inny zestaw zdjec. Trzymanie ich poza glowna
  // petla sprawia, ze wiersze plakatow pozostaja bajt w bajt niezmienione.
  const posters = wszystkie.filter((p) => p && p.kind !== 'set' && p.kind !== 'gallery');
  const zestawy = wszystkie.filter((p) => p && p.kind === 'set');
  const galerie = wszystkie.filter((p) => p && p.kind === 'gallery');

  // Siatka bezpieczenstwa: handle jest kluczem produktu w Shopify, wiec dwa plakaty
  // o tym samym handle zlalyby sie przy imporcie w jeden - jeden z nich przepadlby
  // po cichu. Lepiej nie wygenerowac CSV niz wygenerowac taki, ktory gubi produkt.
  const collisions = findHandleCollisions(posters);
  if (collisions.length > 0) {
    const detail = collisions
      .map(({ handle, posters: group }) => {
        const items = group
          .map((p) => `      - "${p.title}" (${p.category || '?'} / ${p.artStyle || '?'}) ${p.imagePath || ''}`)
          .join('\n');
        return `  handle "${handle}":\n${items}`;
      })
      .join('\n');
    throw new Error(
      `Przerwano eksport: ${collisions.length} kolizji handli Shopify.\n${detail}\n` +
        'Handle musi być unikalny w całym sklepie. Zmień tytuł jednego z plakatów w posters_inventory.json, ' +
        'a następnie uruchom: npm run audit:duplicates'
    );
  }

  const headers = pickHeaders();
  const lines = [headers.join(',')];
  const knownHandles = loadHistoryHandles();
  let storeHandles = null;
  if (cli.fetchStoreHandles) {
    const cfg = getHeadlessConfig();
    if (!cfg.storeDomain || !cfg.storefrontToken) {
      throw new Error(
        'Brak ENV dla headless porownania sklepu. Ustaw SHOPIFY_STORE_DOMAIN i SHOPIFY_STOREFRONT_API_TOKEN.'
      );
    }
    storeHandles = await fetchShopifyProductHandles(cli.storeLimit);
  }
  const exportedHandles = new Set();
  let skippedNoThumb = 0;
  let skippedNotReady = 0;
  let skippedKnown = 0;
  let skippedOnStore = 0;

  for (const p of posters) {
    const evalState = evaluatePosterShopifyState(projectRoot, p);
    if (evalState.state !== 'ready') {
      skippedNotReady += 1;
      continue;
    }
    const handle = toHandle(p.title);
    if (cli.onlyNew && knownHandles.has(handle)) {
      skippedKnown += 1;
      continue;
    }
    if (cli.onlyMissingOnStore && storeHandles && storeHandles.has(handle)) {
      skippedOnStore += 1;
      continue;
    }
    const title = humanizePosterTitle(p.title);
    const body = htmlDescription(p.shopDescription || p.prompt || '');
    const categoryTag = slugifyTag(p.category || '');
    const styleTag = slugifyTag(p.artStyle || '');
    const sizeDefsPlakatu = sizeDefsForOrientation(sizeDefs, p.orientation);
    const tags = zbudujTagi(p, categoryTag, styleTag, sizeDefsPlakatu);
    const seoTitle = title ? `${title} | REXIMPRIMIS` : '';
    const seoDescription = przytnijSeo(p.shopDescription);
    const masterThumbRel =
      (p.imagePathThumb && fileExists(p.imagePathThumb) && normalizeRelPath(p.imagePathThumb)) ||
      (withThumbSuffix(p.imagePath) && fileExists(withThumbSuffix(p.imagePath)) && withThumbSuffix(p.imagePath)) ||
      '';
    const framedSourceRel = p.imagePathFramed || withFramedSuffix(p.imagePath);
    const framedThumbRel =
      (p.imagePathFramedThumb && fileExists(p.imagePathFramedThumb) && normalizeRelPath(p.imagePathFramedThumb)) ||
      (withThumbSuffix(framedSourceRel) && fileExists(withThumbSuffix(framedSourceRel)) && withThumbSuffix(framedSourceRel)) ||
      '';
    if (!masterThumbRel) {
      skippedNoThumb += 1;
      continue;
    }

    const imageMaster = toPublicUrl(masterThumbRel);
    const imageFramed = toPublicUrl(framedThumbRel || masterThumbRel);

    // Mockup images (generated via GPT Image 2 edit API) — optional
    const mockupFrameRel = p.mockups && p.mockups.frame && fileExists(p.mockups.frame)
      ? normalizeRelPath(p.mockups.frame) : '';
    const mockupInteriorRel = p.mockups && p.mockups.interior && fileExists(p.mockups.interior)
      ? normalizeRelPath(p.mockups.interior) : '';
    const imageMockupFrame = mockupFrameRel ? toPublicUrl(mockupFrameRel) : '';
    const imageMockupInterior = mockupInteriorRel ? toPublicUrl(mockupInteriorRel) : '';

    // Kolejnosc galerii POJEDYNCZEGO plakatu:
    //   1. master   — sama grafika, to ona sprzedaje,
    //   2. ramka    — wariant z bialym marginesem, zeby klient widzial oba,
    //   3. packshot — plakat w ramie na czystym tle,
    //   4. salon    — efekt na scianie.
    // Zestawy maja wlasna kolejnosc, ustawiana nizej w petli zestawow.
    const IMAGE_SLOTS = [imageMaster, imageFramed, imageMockupFrame, imageMockupInterior].filter(Boolean);

    let rowIndex = 0;
    for (const printStyle of PRINT_STYLES) {
      for (const size of sizeDefsPlakatu) {
        const firstRowForProduct = rowIndex === 0;
        const imageSrcCell = rowIndex < IMAGE_SLOTS.length ? IMAGE_SLOTS[rowIndex] : '';
        const variantImageCell = imageSrcCell || (printStyle.code === 'ramka' ? imageFramed : imageMaster) || '';
        const row = {
          Handle: handle,
          Title: firstRowForProduct ? title : '',
          'Body (HTML)': firstRowForProduct ? body : '',
          Vendor: firstRowForProduct ? 'REXIMPRIMIS' : '',
          'Product Category': firstRowForProduct ? KATEGORIA_SHOPIFY : '',
          Type: firstRowForProduct ? 'poster' : '',
          Tags: firstRowForProduct ? tags : '',
          Published: firstRowForProduct ? (p.approvedForPrint ? 'true' : 'false') : '',
          'Option1 Name': firstRowForProduct ? 'Print Style' : '',
          'Option1 Value': printStyle.label,
          'Option1 Linked To': '',
          'Option2 Name': firstRowForProduct ? 'Size' : '',
          'Option2 Value': size.label,
          'Option2 Linked To': '',
          'Option3 Name': '',
          'Option3 Value': '',
          'Option3 Linked To': '',
          'Variant SKU': `${handle}-${printStyle.code}-${size.key}`,
          'Variant Grams': '0',
          'Variant Inventory Tracker': '',
          'Variant Inventory Qty': '',
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Price': size.price,
          'Variant Compare At Price': size.compareAtPrice || '',
          'Variant Requires Shipping': 'true',
          'Variant Taxable': 'true',
          'Unit Price Total Measure': '',
          'Unit Price Total Measure Unit': '',
          'Unit Price Base Measure': '',
          'Unit Price Base Measure Unit': '',
          'Variant Barcode': '',
          'Image Src': imageSrcCell,
          'Image Position': imageSrcCell ? String(rowIndex + 1) : '',
          'Image Alt Text': '',
          'Gift Card': firstRowForProduct ? 'false' : '',
          'SEO Title': firstRowForProduct ? seoTitle : '',
          'SEO Description': firstRowForProduct ? seoDescription : '',
          'Materiał ramy dzieła sztuki (product.metafields.shopify.artwork-frame-material)': '',
          // PUSTE CELOWO. To sa metapola typu metaobject_reference w taksonomii
          // Shopify, a nie pola tekstowe. Wpisanie w nie zwyklego napisu
          // odrzucalo KAZDY wiersz importu bledem o wymaganym metaobiekcie.
          // Te same informacje niosa tagi color:, orientation: i category:,
          // ktore i tak napedzaja filtry oraz kolekcje automatyczne.
          'Kolor (product.metafields.shopify.color-pattern)': '',
          'Materiał dekoracyjny (product.metafields.shopify.decoration-material)': '',
          'Obsługiwany format (product.metafields.shopify.format-supported)': '',
          'Styl oprawki (product.metafields.shopify.frame-style)': '',
          'Materiał (product.metafields.shopify.material)': '',
          'Typ mocowania (product.metafields.shopify.mounting-type)': '',
          // Standardowe metapole Shopify — napedza natywne filtry w sklepie.
          'Orientacja (product.metafields.shopify.orientation)': '',
          'Kształt (product.metafields.shopify.shape)': '',
          'Motyw (product.metafields.shopify.theme)': '',
          'Variant Image': variantImageCell,
          'Variant Weight Unit': 'kg',
          'Variant Tax Code': '',
          'Cost per item': '',
          Status: firstRowForProduct ? (p.approvedForPrint ? 'active' : 'draft') : '',
        };
        lines.push(makeRow(headers, row));
        rowIndex += 1;
      }
    }
    exportedHandles.add(handle);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ZESTAWY (dyptyk / tryptyk)
  //
  // Osobna petla, a nie rozszerzenie petli plakatow — dzieki temu wiersze
  // plakatow pozostaja bajt w bajt takie same i da sie to zweryfikowac suma
  // kontrolna. Zestaw rozni sie od plakatu w trzech rzeczach: cena (mnoznik),
  // brak wariantu z passe-partout i wlasny zestaw zdjec.
  // ─────────────────────────────────────────────────────────────────────────
  let zestawowWyeksportowanych = 0;
  let zestawowPominietych = 0;

  for (const z of zestawy) {
    const mnoznik = Number(settings.setMultipliers[z.layout]);
    if (!Number.isFinite(mnoznik) || mnoznik <= 0) {
      console.log(`⚠ Zestaw "${z.title}" — brak mnoznika dla ukladu "${z.layout}", pomijam.`);
      zestawowPominietych += 1;
      continue;
    }

    const handle = toPosterHandle(z.title);
    if (cli.onlyNew && knownHandles.has(handle)) { skippedKnown += 1; continue; }
    if (cli.onlyMissingOnStore && storeHandles && storeHandles.has(handle)) { skippedOnStore += 1; continue; }

    // Miniatura zestawu (panele obok siebie) — to ona identyfikuje produkt.
    const thumbRel = z.imagePathThumb && fileExists(z.imagePathThumb) ? normalizeRelPath(z.imagePathThumb) : '';
    if (!thumbRel) {
      console.log(`⚠ Zestaw "${z.title}" — brak miniatury, pomijam.`);
      zestawowPominietych += 1;
      continue;
    }

    const mk = z.mockups || {};
    const url = (rel) => (rel && fileExists(rel) ? toPublicUrl(normalizeRelPath(rel)) : '');
    // Kolejnosc galerii ustalona z uzytkownikiem: salon sprzedaje, packshot
    // pokazuje komplet ram, drugi salon daje inny kontekst, arkusze mowia
    // wprost, ile sztuk przyjdzie w paczce.
    const ZDJECIA = [
      // Kolejnosc galerii w sklepie. Zmiana tutaj przestawia zdjecia na karcie
      // produktu — reszta systemu nie ma na nia wplywu.
      //
      //   1. kaskada  — arkusze jeden na drugim; w miniaturze wynikow od razu
      //                 widac, ze to komplet, a motyw plynie miedzy nimi,
      //   2. packshot — komplet ram na czystym tle, bez rozpraszania wnetrzem,
      //   3. salon    — efekt na scianie nad sofa,
      //   4. salon 2  — drugie wnetrze, dobrane do kategorii,
      //   5. arkusze  — "co dostajesz": same wydruki bez ram,
      //   6. miniatura zestawu.
      url(mk.stack),
      url(mk.frame),
      url(mk.interior),
      url(mk.interior2),
      url(mk.sheets),
      toPublicUrl(thumbRel),
    ].filter(Boolean);

    const sztuk = z.panelCount || (z.layout === 'duo' ? 2 : 3);
    const title = humanizePosterTitle(z.title);
    const body = htmlDescription(z.shopDescription || '');
    // Te same przestrzenie nazw co przy pojedynczych plakatach — inaczej
    // zestawy wypadaja z kazdego filtra i z kazdej kolekcji automatycznej,
    // mimo ze sa najdrozszym produktem w katalogu.
    const tags = [
      'set',
      'set:' + (z.layout === 'duo' ? 'duo' : 'triptych'),
      'set:pieces-' + sztuk,
      // zbudujTagi dokłada juz 'poster' na poczatku, wiec tutaj go nie powtarzamy.
      zbudujTagi(z, slugifyTag(z.category || ''), slugifyTag(z.artStyle || ''), sizeDefs),
    ].filter(Boolean).join(', ');

    // ZESTAW MA TYLKO JEDNA OS WARIANTOW: rozmiar.
    //
    // Plakat ma dwie (Print Style + Size), bo istnieje w wersji pelnej i z bialym
    // marginesem. Zestaw jest wylacznie full bleed, wiec druga os miala by jedna
    // wartosc — Shopify wyswietlalby wtedy rozwijana liste z jednym wyborem,
    // co na karcie produktu wyglada jak niedokonczony produkt.
    let rowIndex = 0;
    {
      for (const size of sizeDefs) {
        const pierwszy = rowIndex === 0;
        // Cena rozmiaru × mnoznik ukladu, zaokraglona do peldnych groszy.
        const cena = (Number(String(size.price).replace(',', '.')) * mnoznik).toFixed(2);
        const imageSrcCell = rowIndex < ZDJECIA.length ? ZDJECIA[rowIndex] : '';
        const row = {
          Handle: handle,
          Title: pierwszy ? title : '',
          'Body (HTML)': pierwszy ? body : '',
          Vendor: pierwszy ? 'REXIMPRIMIS' : '',
          'Product Category': pierwszy ? KATEGORIA_SHOPIFY : '',
          Type: pierwszy ? 'poster set' : '',
          Tags: pierwszy ? tags : '',
          Published: pierwszy ? (z.approvedForPrint ? 'true' : 'false') : '',
          // Rozmiar jest JEDYNA osia wariantow zestawu — patrz komentarz wyzej.
          'Option1 Name': pierwszy ? 'Size' : '',
          'Option1 Value': size.label,
          'Option1 Linked To': '',
          'Option2 Name': '',
          'Option2 Value': '',
          'Option2 Linked To': '',
          'Option3 Name': '',
          'Option3 Value': '',
          'Option3 Linked To': '',
          'Variant SKU': '',
          'Variant Grams': '',
          'Variant Inventory Tracker': '',
          'Variant Inventory Qty': '',
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Price': cena,
          'Variant Compare At Price': compareAtFor(cena, settings.compareAtMultiplier),
          'Variant Requires Shipping': 'true',
          'Variant Taxable': 'true',
          'Unit Price Total Measure': '',
          'Unit Price Total Measure Unit': '',
          'Unit Price Base Measure': '',
          'Unit Price Base Measure Unit': '',
          'Variant Barcode': '',
          'Image Src': imageSrcCell,
          'Image Position': imageSrcCell ? String(rowIndex + 1) : '',
          'Image Alt Text': imageSrcCell && pierwszy ? title : '',
          'Gift Card': pierwszy ? 'false' : '',
          'SEO Title': pierwszy && title ? `${title} | REXIMPRIMIS` : '',
          'SEO Description': pierwszy ? String(z.shopDescription || '').slice(0, 160) : '',
          'Materiał ramy dzieła sztuki (product.metafields.shopify.artwork-frame-material)': '',
          'Kolor (product.metafields.shopify.color-pattern)': '',
          'Materiał dekoracyjny (product.metafields.shopify.decoration-material)': '',
          'Obsługiwany format (product.metafields.shopify.format-supported)': '',
          'Styl oprawki (product.metafields.shopify.frame-style)': '',
          'Materiał (product.metafields.shopify.material)': '',
          'Typ mocowania (product.metafields.shopify.mounting-type)': '',
          // Standardowe metapole Shopify — napedza natywne filtry w sklepie.
          'Orientacja (product.metafields.shopify.orientation)': '',
          'Kształt (product.metafields.shopify.shape)': '',
          'Motyw (product.metafields.shopify.theme)': '',
          'Variant Image': imageSrcCell || toPublicUrl(thumbRel),
          'Variant Weight Unit': 'kg',
          'Variant Tax Code': '',
          'Cost per item': '',
          Status: pierwszy ? (z.approvedForPrint ? 'active' : 'draft') : '',
        };
        lines.push(makeRow(headers, row));
        rowIndex += 1;
      }
    }
    exportedHandles.add(handle);
    zestawowWyeksportowanych += 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ZESTAWY SCIENNE (kind: 'gallery')
  //
  // Kompozycja z ISTNIEJACYCH plakatow w roznych rozmiarach. Trzy roznice
  // wobec dyptyku i tryptyku:
  //
  //   1. BRAK WARIANTOW. Rozmiary sa czescia produktu, nie wyborem klienta,
  //      wiec jest JEDEN wiersz. Shopify wymaga nazwy opcji, wiec dajemy
  //      "Title / Default Title" — tak zapisuje sie produkt bez wariantow.
  //   2. CENA Z REKORDU, nie z mnoznika ukladu. Wynika z sumy skladnikow minus
  //      rabat, policzonej przy budowie zestawu, bo skladniki maja rozne
  //      rozmiary i mnoznik nie mialby czego mnozyc.
  //   3. Compare-at to CENA OSOBNO, a nie dwukrotnosc jak przy plakatach —
  //      przekreslona kwota ma pokazywac realna oszczednosc, nie promocje.
  // ─────────────────────────────────────────────────────────────────────────
  let galeriiWyeksportowanych = 0;
  for (const g of galerie) {
    const handle = toPosterHandle(g.title);
    if (cli.onlyNew && knownHandles.has(handle)) { skippedKnown += 1; continue; }
    if (cli.onlyMissingOnStore && storeHandles && storeHandles.has(handle)) { skippedOnStore += 1; continue; }

    const thumbRel = g.imagePathThumb && fileExists(g.imagePathThumb) ? normalizeRelPath(g.imagePathThumb) : '';
    if (!thumbRel) { console.log(`⚠ Zestaw scienny "${g.title}" — brak podgladu, pomijam.`); continue; }
    const cena = Number(g.price);
    if (!Number.isFinite(cena) || cena <= 0) { console.log(`⚠ Zestaw scienny "${g.title}" — brak ceny, pomijam.`); continue; }

    const sztuk = g.pieceCount || (g.items || []).length;
    const rozmiary = [...new Set((g.items || []).map((i) => i.size))].join(', ');
    const title = humanizePosterTitle(g.title);
    const tags = [
      'gallery-set',
      'gallery-set:pieces-' + sztuk,
      g.wallColor ? 'wall:' + slugifyTag(g.wallColor) : '',
      zbudujTagi(g, slugifyTag(g.category || ''), slugifyTag(g.artStyle || ''), sizeDefs),
    ].filter(Boolean).join(', ');
    const opis = htmlDescription(
      String(g.shopDescription || '') +
      '\n\nW zestawie ' + sztuk + ' plakaty w rozmiarach ' + rozmiary + '.' +
      (g.priceSeparate ? ' Kupowane osobno kosztowalyby ' + g.priceSeparate + ' zl.' : '')
    );

    const row = {
      Handle: handle,
      Title: title,
      'Body (HTML)': opis,
      Vendor: 'REXIMPRIMIS',
      'Product Category': KATEGORIA_SHOPIFY,
      Type: 'gallery set',
      Tags: tags,
      Published: g.approvedForPrint ? 'true' : 'false',
      'Option1 Name': 'Title',
      'Option1 Value': 'Default Title',
      'Option1 Linked To': '',
      'Option2 Name': '', 'Option2 Value': '', 'Option2 Linked To': '',
      'Option3 Name': '', 'Option3 Value': '', 'Option3 Linked To': '',
      'Variant SKU': '',
      'Variant Grams': '',
      'Variant Inventory Tracker': '',
      'Variant Inventory Qty': '',
      'Variant Inventory Policy': 'deny',
      'Variant Fulfillment Service': 'manual',
      'Variant Price': cena.toFixed(2),
      'Variant Compare At Price': g.priceSeparate ? Number(g.priceSeparate).toFixed(2) : '',
      'Variant Requires Shipping': 'true',
      'Variant Taxable': 'true',
      'Unit Price Total Measure': '', 'Unit Price Total Measure Unit': '',
      'Unit Price Base Measure': '', 'Unit Price Base Measure Unit': '',
      'Variant Barcode': '',
      'Image Src': toPublicUrl(thumbRel),
      'Image Position': '1',
      'Image Alt Text': title,
      'Gift Card': 'false',
      'SEO Title': `${title} | REXIMPRIMIS`,
      'SEO Description': String(g.shopDescription || '').slice(0, 160),
      'Materiał ramy dzieła sztuki (product.metafields.shopify.artwork-frame-material)': '',
      'Kolor (product.metafields.shopify.color-pattern)': '',
      'Materiał dekoracyjny (product.metafields.shopify.decoration-material)': '',
      'Obsługiwany format (product.metafields.shopify.format-supported)': '',
      'Styl oprawki (product.metafields.shopify.frame-style)': '',
      'Materiał (product.metafields.shopify.material)': '',
      'Typ mocowania (product.metafields.shopify.mounting-type)': '',
      'Orientacja (product.metafields.shopify.orientation)': '',
      'Kształt (product.metafields.shopify.shape)': '',
      'Motyw (product.metafields.shopify.theme)': '',
      'Variant Image': toPublicUrl(thumbRel),
      'Variant Weight Unit': 'kg',
      'Variant Tax Code': '',
      'Cost per item': '',
      Status: g.approvedForPrint ? 'active' : 'draft',
    };
    lines.push(makeRow(headers, row));
    exportedHandles.add(handle);
    galeriiWyeksportowanych += 1;
  }

  const csvText = lines.join('\n') + '\n';
  fs.writeFileSync(outputCsvPath, csvText, 'utf8');
  let outputUsedPath = outputCsvPath;
  if (cli.timestamped || cli.onlyNew) {
    const datedName = `products_export_shopify_${nowStamp()}.csv`;
    outputUsedPath = path.join(outputDir, datedName);
    fs.writeFileSync(outputUsedPath, csvText, 'utf8');
  }

  if (exportedHandles.size > 0) saveHistoryHandles(knownHandles, [...exportedHandles]);

  console.log(`Shopify CSV exported: ${outputUsedPath}`);
  // Zestaw ma o polowe mniej wierszy niz plakat (jeden print style zamiast dwoch),
  // wiec liczba produktow nie da sie wyliczyc z samej liczby wierszy.
  // Zestaw ma jedna os wariantow (rozmiar), plakat dwie — stad rozne mnozniki.
  const wierszyZestawow = zestawowWyeksportowanych * sizeDefs.length;
  const wierszyPlakatow = lines.length - 1 - wierszyZestawow;
  console.log(
    `Products exported: ${Math.max(0, Math.floor(wierszyPlakatow / (sizeDefs.length * PRINT_STYLES.length)))}` +
      ` + ${zestawowWyeksportowanych} zestaw(ow), rows: ${lines.length - 1}`
  );
  if (zestawowWyeksportowanych > 0) {
    const opis = Object.entries(settings.setMultipliers).map(([k, v]) => `${k} ×${v}`).join(', ');
    console.log(`Mnozniki cen zestawow: ${opis}`);
  }
  if (zestawowPominietych > 0) console.log(`Skipped (zestawy): ${zestawowPominietych}`);
  console.log(`Sizes used: ${sizeDefs.map((s) => `${s.key}:${s.price}`).join(', ')}`);
  console.log(
    `Inventory state summary: ready=${reconcileSummary.ready}, pending_assets=${reconcileSummary.pending_assets}, legacy_blocked=${reconcileSummary.legacy_blocked}`
  );
  if (reconcileSummary.changed > 0) console.log(`Inventory records reconciled: ${reconcileSummary.changed}`);
  if (skippedNoThumb > 0) console.log(`Skipped (no thumb): ${skippedNoThumb}`);
  if (skippedNotReady > 0) console.log(`Skipped (not ready): ${skippedNotReady}`);
  if (skippedKnown > 0) console.log(`Skipped (already exported): ${skippedKnown}`);
  if (skippedOnStore > 0) console.log(`Skipped (already on Shopify store): ${skippedOnStore}`);
  if (storeHandles) console.log(`Live store handles loaded: ${storeHandles.size}`);
  if (!process.env.SHOPIFY_IMAGE_BASE_URL) console.log('Warning: SHOPIFY_IMAGE_BASE_URL is missing. CSV will be generated without image URLs.');
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
