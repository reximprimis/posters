/**
 * Opis produktu dla ZESTAWOW (dyptyk, tryptyk).
 *
 * Dotyczy wylacznie rekordow kind='set'. 162 istniejace plakaty zostaja z wlasnym,
 * krotszym opisem — decyzja uzytkownika: nie ruszamy produktow, ktore juz sprzedaja.
 *
 * Struktura wzorowana na ofertach konkurencji (akapit o motywie, informacja o zestawie,
 * gdzie powiesic, specyfikacja, uwaga o kolorach). Wzorem jest UKLAD sekcji, nigdy tekst.
 */

const { SET_LABELS } = require('./posterTitle');

/**
 * Czego NIE WOLNO pisac o naszym podlozu — kazda pozycja ma powod:
 *
 * - marka i nazwa handlowa: decyzja uzytkownika, konkurencja nie ma znac dostawcy,
 * - "satynowy": uzytkownik nie chce tego slowa w ofercie, mimo ze tak brzmi karta,
 * - "matowy": NIEPRAWDA wedlug karty producenta,
 * - "archiwalny"/"fine art"/"gicl e": niezgodne ze specyfikacja podloza.
 *
 * Lista jest tu po to, zeby dalo sie ja sprawdzic testem, a nie tylko przeczytac
 * w komentarzu — opis idzie do klienta i podlega GPSR.
 */
const ZAKAZANE_OKRESLENIA = [
  // marka podloza — po polsku i angielsku brzmi tak samo
  'ignisafe',
  // wykonczenie: uzytkownik nie chce tego slowa, mimo ze tak brzmi karta
  'satynow',
  'satin',
  // NIEPRAWDA wedlug karty producenta
  'matow',
  'matte',
  // niezgodne ze specyfikacja podloza
  'archiwaln',
  'archival',
  'fine art',
  'giclee',
  'giclée',
  // rame dobiera sie w sklepie, wiec nie opisujemy jej jako braku
  'rama nie jest',
  'bez ramy',
  'frame not included',
  'unframed',
];

const PAPIER_GRAMATURA = '220 g/m²';

/**
 * ANGIELSKI JEST ZRODLEM.
 *
 * Caly katalog Shopify jest po angielsku — opisy plakatow brzmia "Experience the
 * tranquil beauty of...". Zestaw opisany po polsku odstawalby od reszty sklepu.
 * Polska wersja sluzy Allegro i tlumaczeniom, nie eksportowi glownemu.
 */
const TEKSTY = {
  en: {
    motyw: (t, sztuk) =>
      `“${t}” unfolds across ${sztuk === 3 ? 'three' : 'two'} panels — a calm, considered ` +
      'composition with a quiet, refined character.',
    zestaw: (sztuk, uklad) =>
      `This is a ${uklad} — a set of ${sztuk} separate prints that together form one continuous scene. ` +
      'The motif flows seamlessly from sheet to sheet, so hung side by side they read as a single artwork, ' +
      'while each panel still stands on its own.',
    miejsce:
      'The horizontal composition works beautifully above a sofa, a bed, a sideboard or in a dining room. ' +
      'Leave 3–5 cm between frames — that spacing lets the panels read as a whole while giving them room to breathe.',
    naglowekSpec: 'About the print:',
    spec: (sztuk) => [
      `• ${sztuk} separate sheets forming one composition`,
      `• ${PAPIER_GRAMATURA} paper, chosen together with industry experts after extensive testing`,
      '• Displays beautifully behind frame glass — keeps depth of colour and fine detail',
      '• Edge-to-edge print, no border',
      '• Carefully packaged for shipping',
    ],
    kolory:
      'Colours may vary slightly from what you see on screen, depending on your monitor calibration.',
    uklad: { 2: 'diptych', 3: 'triptych' },
  },
  pl: {
    motyw: (t, sztuk) =>
      `„${t}” rozpisany na ${sztuk === 3 ? 'trzy' : 'dwa'} panele — spójna kompozycja ` +
      'o wyciszonym, dopracowanym charakterze.',
    zestaw: (sztuk, uklad) =>
      `To ${uklad} — zestaw ${sztuk} osobnych plakatów, które razem tworzą jedną, ciągłą scenę. ` +
      'Motyw przechodzi płynnie z arkusza na arkusz, więc powieszone obok siebie czytają się jak jedno dzieło, ' +
      'a każdy z osobna broni się jako samodzielna grafika.',
    miejsce:
      'Kompozycja pozioma sprawdza się nad sofą, łóżkiem, komodą lub w jadalni. ' +
      'Zalecany odstęp między ramami to 3–5 cm — wtedy panele czytają się jako całość, zachowując oddech.',
    naglowekSpec: 'O wydruku:',
    spec: (sztuk) => [
      // Polska liczba mnoga dla 2-4 jest ta sama, wiec wystarczy forma mianownikowa.
      `• ${sztuk} osobne arkusze tworzące jedną kompozycję`,
      `• Papier ${PAPIER_GRAMATURA}, dobrany wspólnie z ekspertami z branży, po wielu próbach`,
      '• Grafika idealnie eksponuje się za szkłem ramki — zachowuje głębię barw i czytelność detalu',
      '• Nadruk na całej powierzchni, bez marginesu',
      '• Starannie zapakowane do wysyłki',
    ],
    kolory: 'Kolory mogą nieznacznie różnić się od tych na ekranie — zależy to od kalibracji monitora.',
    uklad: { 2: 'dyptyk', 3: 'tryptyk' },
  },
};

/**
 * @param {{ layout: string, motyw?: string, opisMotywu?: string, language?: 'en'|'pl' }} args
 * @returns {string} opis gotowy do wstawienia w karte produktu
 */
function buildSetDescription({ layout, motyw, opisMotywu, language } = {}) {
  const label = SET_LABELS[String(layout || '').trim()];
  if (!label) throw new Error(`Nieznany układ zestawu: ${layout}`);

  const lang = language === 'pl' ? 'pl' : 'en';
  const t = TEKSTY[lang];
  const sztuk = label.count;
  const temat = String(motyw || '').trim();

  const akapity = [];

  // 1. Motyw — jesli mamy gotowy opis grafiki, uzywamy go zamiast ogolnika.
  if (opisMotywu && String(opisMotywu).trim()) akapity.push(String(opisMotywu).trim());
  else if (temat) akapity.push(t.motyw(temat, sztuk));

  // 2. NAJWAZNIEJSZY akapit: ile sztuk i ze panele lacza sie w jedna scene.
  // Bez tego zamowienie zestawu konczy sie reklamacja, a klient nie rozumie,
  // za co placi wiecej niz za pojedynczy plakat.
  akapity.push(t.zestaw(sztuk, t.uklad[sztuk]));

  // 3. Gdzie powiesic — konkret pomaga wyobrazic sobie produkt u siebie.
  akapity.push(t.miejsce);

  // 4. Specyfikacja. Gramatura i sposob ekspozycji, bez marki i bez slow zakazanych.
  akapity.push([t.naglowekSpec, ...t.spec(sztuk)].join('\n'));

  // 5. Standardowe zastrzezenie o kolorach — realnie ucina reklamacje o odcien.
  akapity.push(t.kolory);

  return akapity.join('\n\n');
}

/**
 * Sprawdza, czy opis nie zawiera okreslen, ktorych uzywac nie wolno.
 * @returns {string[]} znalezione naruszenia, pusta lista gdy czysto
 */
function findForbiddenTerms(text) {
  const t = String(text || '').toLowerCase();
  return ZAKAZANE_OKRESLENIA.filter((s) => t.includes(s));
}

module.exports = {
  PAPIER_GRAMATURA,
  ZAKAZANE_OKRESLENIA,
  buildSetDescription,
  findForbiddenTerms,
};
