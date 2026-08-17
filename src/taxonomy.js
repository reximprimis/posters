/**
 * Taksonomia katalogu — jedno zrodlo prawdy dla kategorii i okazji.
 *
 * DLACZEGO TRZY POLA NA KATEGORIE, A NIE JEDNO
 *
 * Do tej pory nazwa kategorii pelnila trzy role naraz: byla kluczem w kodzie,
 * nazwa katalogu na dysku i napisem dla klienta. Polskie znaki w nazwie
 * katalogu daly mojibake (w roomCollections zyly obok siebie "Do lazienki"
 * i "Do Ĺ‚azienki" — ta sama pula rozbita na duplikaty), a polski napis
 * trafial do angielskiego sklepu. Dlatego role sa rozdzielone:
 *
 *   key   — identyfikator w kodzie i w kartotece; stabilny, nigdy sie nie zmienia
 *   slug  — nazwa katalogu i fragment URL w CDN; ASCII, bez spacji i '&'
 *   name  — napis dla klienta w Shopify; moze miec '&', spacje, cokolwiek
 *
 * Klucz i slug sa dzis identyczne, ale to zbieg okolicznosci, nie regula:
 * nazwe w sklepie mozna zmienic w kazdej chwili, sluga nie — bo za nim stoja
 * adresy CDN.
 *
 * DLACZEGO OKAZJA NIE JEST KATEGORIA
 *
 * Swiateczny plakat nie przestaje byc botaniczny: wieniec to Botanical,
 * renifer to Animals. Gdyby okazja byla kategoria, kazdy taki plakat musialby
 * wybrac jedna szufladke, a katalog urosl by do 28 x 12 kubelkow. Jako osobna
 * os okazja jest opcjonalna i wielokrotna — plakat moze nie miec zadnej albo
 * miec trzy. Do promptu wchodzi tak samo jak estetyka: nadpisuje palete
 * i rekwizyty, nie rusza tematu ani kadrowania.
 */

'use strict';

/**
 * @typedef {Object} Kategoria
 * @property {string} key   identyfikator w kodzie i kartotece
 * @property {string} slug  katalog na dysku i w CDN
 * @property {string} name  napis w sklepie
 * @property {string[]} legacyPl dawne polskie nazwy, ktore maja sie na to mapowac
 */

/** @type {Kategoria[]} */
const CATEGORIES = [
  { key: 'abstract', slug: 'abstract', name: 'Abstract', legacyPl: ['Abstrakcja'] },
  { key: 'ai-technology', slug: 'ai-technology', name: 'AI & Technology', legacyPl: ['AI i technologia'] },
  { key: 'animals', slug: 'animals', name: 'Animals', legacyPl: ['Zwierzęta'] },
  { key: 'architecture', slug: 'architecture', name: 'Architecture', legacyPl: ['Architektura'] },
  { key: 'bar-cocktails', slug: 'bar-cocktails', name: 'Bar & Cocktails', legacyPl: [] },
  { key: 'botanical', slug: 'botanical', name: 'Botanical', legacyPl: ['Botanika'] },
  { key: 'cities-travel', slug: 'cities-travel', name: 'Cities & Travel', legacyPl: ['Mapy i miasta'] },
  { key: 'coffee-tea', slug: 'coffee-tea', name: 'Coffee & Tea', legacyPl: ['Kawa i herbata'] },
  { key: 'cyberpunk-neon', slug: 'cyberpunk-neon', name: 'Cyberpunk & Neon', legacyPl: ['Cyberpunk i neon'] },
  { key: 'fashion-beauty', slug: 'fashion-beauty', name: 'Fashion & Beauty', legacyPl: [] },
  { key: 'fitness-gym', slug: 'fitness-gym', name: 'Fitness & Gym', legacyPl: [] },
  { key: 'gaming-esports', slug: 'gaming-esports', name: 'Gaming & Esports', legacyPl: ['Gaming i e-sport'] },
  { key: 'humor-memes', slug: 'humor-memes', name: 'Humor & Memes', legacyPl: ['Humor i memy'] },
  { key: 'kids-nursery', slug: 'kids-nursery', name: 'Kids & Nursery', legacyPl: ['Plakaty dla dzieci'] },
  { key: 'kitchen-food', slug: 'kitchen-food', name: 'Kitchen & Food', legacyPl: ['Kuchnia i jedzenie'] },
  { key: 'line-art-figures', slug: 'line-art-figures', name: 'Line Art & Figures', legacyPl: [] },
  { key: 'mountains-hiking', slug: 'mountains-hiking', name: 'Mountains & Hiking', legacyPl: [] },
  { key: 'music-sound', slug: 'music-sound', name: 'Music & Sound', legacyPl: ['Muzyka i dźwięk'] },
  { key: 'nature-landscapes', slug: 'nature-landscapes', name: 'Nature & Landscapes', legacyPl: ['Natura i krajobrazy'] },
  { key: 'retro-vintage', slug: 'retro-vintage', name: 'Retro & Vintage', legacyPl: ['Retro'] },
  { key: 'sea-coast', slug: 'sea-coast', name: 'Sea & Coast', legacyPl: ['Morze i plaża'] },
  { key: 'space-astronomy', slug: 'space-astronomy', name: 'Space & Astronomy', legacyPl: ['Kosmos i astronomia'] },
  { key: 'sports-hobbies', slug: 'sports-hobbies', name: 'Sports & Hobbies', legacyPl: ['Sport i hobby'] },
  { key: 'symbols-sacred-geometry', slug: 'symbols-sacred-geometry', name: 'Symbols & Sacred Geometry', legacyPl: ['Symbole i harmonia'] },
  { key: 'typography-quotes', slug: 'typography-quotes', name: 'Typography & Quotes', legacyPl: [] },
  { key: 'vehicles', slug: 'vehicles', name: 'Vehicles', legacyPl: ['Pojazdy'] },
  { key: 'wellness-yoga', slug: 'wellness-yoga', name: 'Wellness & Yoga', legacyPl: ['Wellness i joga'] },
  { key: 'zodiac-astrology', slug: 'zodiac-astrology', name: 'Zodiac & Astrology', legacyPl: [] },
];

/**
 * "Japonia" nie mapuje sie na jedna kategorie, bo nigdy nie byla kategoria
 * kraju — w srodku sa zurawie, koi, klon, bambus i sosny, czyli tematy
 * przyrodnicze w japonskim idiomie. Idiom przechodzi na os estetyk, a plakaty
 * wracaja tam, gdzie naleza tematycznie. Rozpisane po tytule, bo automat
 * nie odgadnie, ze latarnia kamienna to architektura.
 */
const JAPONIA_ROZPISKA = {
  'Koi Carp Turning': 'animals',
  'Crane Above Misty Peaks': 'animals',
  'Crane in Still Flight': 'animals',
  'Maple Leaves Autumn': 'botanical',
  'Bamboo Grove at Dawn': 'botanical',
  'Stone Lantern Moss': 'architecture',
  'Misty Lake at Dawn': 'nature-landscapes',
  'Still Pines in Snow': 'nature-landscapes',
};

/** Kategoria zapasowa dla plakatow z "Japonii", ktorych nie ma w rozpisce. */
const JAPONIA_FALLBACK = 'nature-landscapes';

/**
 * Okazje — czwarta os, obok kategorii, stylu i estetyki.
 * `promptHint` wchodzi do promptu tak jak blok estetyki: zmienia rekwizyty
 * i palete, nie temat.
 */
const OCCASIONS = [
  {
    key: 'christmas',
    name: 'Christmas',
    promptHint: 'winter holiday mood: evergreen, holly, warm candlelight, deep green and burgundy with muted gold, soft snow — restrained and elegant, never kitsch',
  },
  {
    key: 'halloween',
    name: 'Halloween',
    promptHint: 'autumn dusk mood: pumpkins, bare branches, moths, deep orange and charcoal with muted purple — stylish and graphic, not gory',
  },
  {
    key: 'easter',
    name: 'Easter',
    promptHint: 'early spring mood: budding branches, eggs, young leaves, pale yellow, soft green and warm white',
  },
  {
    key: 'valentines',
    name: "Valentine's Day",
    promptHint: 'romantic mood: hearts used sparingly, dusty rose, deep red and warm cream, soft intimate light',
  },
  {
    key: 'new-year',
    name: 'New Year',
    promptHint: 'celebration at midnight: fireworks, champagne, deep midnight blue and black with restrained gold',
  },
  {
    key: 'birthday',
    name: 'Birthday',
    promptHint: 'birthday mood: candles, confetti, balloons used sparingly, bright but tasteful palette',
  },
  {
    key: 'wedding',
    name: 'Wedding',
    promptHint: 'wedding mood: white florals, rings, delicate lace texture, ivory, blush and soft gold',
  },
  {
    key: 'new-baby',
    name: 'New Baby',
    promptHint: 'nursery mood: soft pastel palette, gentle rounded forms, calm and reassuring, nothing harsh or high-contrast',
  },
  {
    key: 'housewarming',
    name: 'Housewarming',
    promptHint: 'new home mood: keys, doorways, warm interior light, welcoming earthy palette',
  },
  {
    key: 'party',
    name: 'Party & Fun',
    promptHint: 'party mood: confetti, playful energy, bold saturated palette, cheerful and loud',
  },
  // Dwie okazje specyficznie niemieckie — glowny rynek sklepu, a konkurencja
  // po angielsku praktycznie nie istnieje.
  {
    key: 'oktoberfest',
    name: 'Oktoberfest',
    promptHint: 'Bavarian folk festival mood: beer steins, pretzels, gingham blue and white, alpine folk ornament, warm tent light',
  },
  {
    key: 'einschulung',
    name: 'First Day of School',
    promptHint: 'first school day mood: the German Schultüte cone, satchel, pencils, bright optimistic primary palette, proud and excited',
  },
];

/**
 * Pomieszczenia — piata os, czysto sprzedazowa. Klient nie szuka "botaniki",
 * tylko "czegos nad kanape", wiec to bywa mocniejsze wejscie do katalogu niz
 * temat. Dane juz sa w kartotece (roomCollections), ale nigdy nie trafialy
 * do eksportu.
 *
 * `legacyPl` zawiera tez warianty z mojibake: w kartotece obok "Do lazienki"
 * zyje "Do Ĺ‚azienki" — ta sama pula rozbita przez podwojnie zakodowane UTF-8.
 * Oba warianty maja zejsc sie w jeden klucz, inaczej kolekcja "Bathroom"
 * zgubi polowe plakatow.
 */
const ROOMS = [
  { key: 'living-room', name: 'Living Room', legacyPl: ['Do salonu'] },
  { key: 'bedroom', name: 'Bedroom', legacyPl: ['Do sypialni'] },
  { key: 'kitchen', name: 'Kitchen', legacyPl: ['Do kuchni'] },
  { key: 'dining-room', name: 'Dining Room', legacyPl: ['Do jadalni'] },
  { key: 'office', name: 'Home Office', legacyPl: ['Do biura'] },
  { key: 'study', name: 'Study', legacyPl: ['Do gabinetu'] },
  { key: 'bathroom', name: 'Bathroom', legacyPl: ['Do łazienki', 'Do Ĺ‚azienki'] },
  { key: 'kids-room', name: 'Kids Room', legacyPl: ['Do pokoju dziecka'] },
  { key: 'teen-room', name: 'Teen Room', legacyPl: ['Do pokoju młodzieżowego', 'Do pokoju mĹ‚odzieĹĽowego'] },
  { key: 'cafe', name: 'Café', legacyPl: ['Do kawiarni'] },
];

const ROOM_BY_KEY = new Map(ROOMS.map((r) => [r.key, r]));
const ROOM_BY_LEGACY = new Map();
for (const r of ROOMS) {
  for (const pl of r.legacyPl) ROOM_BY_LEGACY.set(pl, r);
}

function roomName(key) {
  const r = ROOM_BY_KEY.get(String(key || '').trim());
  return r ? r.name : String(key || '');
}

/**
 * Sprowadza liste pomieszczen z kartoteki do angielskich kluczy, sklejajac
 * przy okazji warianty rozjechane przez mojibake i usuwajac powtorki.
 * @param {unknown} wartosc
 * @returns {string[]}
 */
function normalizeRooms(wartosc) {
  const lista = Array.isArray(wartosc) ? wartosc : wartosc == null ? [] : [wartosc];
  const wynik = [];
  for (const x of lista) {
    const s = String(x || '').trim();
    if (!s) continue;
    const klucz = ROOM_BY_KEY.has(s) ? s : ROOM_BY_LEGACY.get(s) ? ROOM_BY_LEGACY.get(s).key : null;
    if (klucz && !wynik.includes(klucz)) wynik.push(klucz);
  }
  return wynik;
}

const CAT_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));
const CAT_BY_LEGACY = new Map();
for (const c of CATEGORIES) {
  for (const pl of c.legacyPl) CAT_BY_LEGACY.set(pl, c);
}
const OCC_BY_KEY = new Map(OCCASIONS.map((o) => [o.key, o]));

function getCategory(key) {
  return CAT_BY_KEY.get(String(key || '').trim()) || null;
}

function isKnownCategoryKey(key) {
  return CAT_BY_KEY.has(String(key || '').trim());
}

/**
 * Tlumaczy dawna polska nazwe na nowy klucz. Zwraca null, gdy nazwa jest juz
 * nowym kluczem albo gdy jej nie znamy — wolajacy decyduje, co z tym zrobic.
 * @param {string} nazwa
 * @param {string} [tytul] potrzebny tylko dla "Japonii", ktora sie rozpada
 * @returns {string|null}
 */
function legacyCategoryToKey(nazwa, tytul) {
  const n = String(nazwa || '').trim();
  if (!n) return null;
  if (CAT_BY_KEY.has(n)) return n;
  if (n === 'Japonia') {
    return JAPONIA_ROZPISKA[String(tytul || '').trim()] || JAPONIA_FALLBACK;
  }
  const c = CAT_BY_LEGACY.get(n);
  return c ? c.key : null;
}

/** Nazwa dla klienta; gdy klucz nieznany, oddajemy go bez zmian. */
function categoryName(key) {
  const c = getCategory(key);
  return c ? c.name : String(key || '');
}

/** Katalog na dysku i fragment URL w CDN. */
function categorySlug(key) {
  const c = getCategory(key);
  return c ? c.slug : String(key || '');
}

function getOccasion(key) {
  return OCC_BY_KEY.get(String(key || '').trim().toLowerCase()) || null;
}

function isKnownOccasion(key) {
  return OCC_BY_KEY.has(String(key || '').trim().toLowerCase());
}

/**
 * Odsiewa nieznane okazje i usuwa powtorki. Plakat moze nie miec zadnej
 * okazji albo miec kilka — swiateczny wieniec bywa tez prezentem na parapetowke.
 * @param {unknown} wartosc pojedyncza okazja albo lista
 * @returns {string[]}
 */
function normalizeOccasions(wartosc) {
  const lista = Array.isArray(wartosc) ? wartosc : wartosc == null ? [] : [wartosc];
  const wynik = [];
  for (const x of lista) {
    const k = String(x || '').trim().toLowerCase();
    if (isKnownOccasion(k) && !wynik.includes(k)) wynik.push(k);
  }
  return wynik;
}

/**
 * Blok okazji do promptu obrazu — swiadomie tym samym wzorem co
 * buildAestheticBlock: nadpisuje rekwizyty i palete, chroni temat i kadr.
 * @param {string} key
 * @returns {string}
 */
function buildOccasionBlock(key) {
  const o = getOccasion(key);
  if (!o) return '';
  return [
    `OCCASION OVERRIDE — ${o.name.toUpperCase()}:`,
    'Reinterpret the subject for this occasion. This changes palette, props and atmosphere only — it must NOT change the subject itself, the composition rules, or the safe print framing above.',
    `Occasion mood: ${o.promptHint}.`,
    'Keep it a piece of wall art someone would hang for the season, not a greeting card: no banners, no slogans, no printed dates.',
  ].join('\n');
}

module.exports = {
  CATEGORIES,
  OCCASIONS,
  ROOMS,
  roomName,
  normalizeRooms,
  JAPONIA_ROZPISKA,
  JAPONIA_FALLBACK,
  getCategory,
  isKnownCategoryKey,
  legacyCategoryToKey,
  categoryName,
  categorySlug,
  getOccasion,
  isKnownOccasion,
  normalizeOccasions,
  buildOccasionBlock,
};
