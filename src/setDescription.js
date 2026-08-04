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
  'ignisafe',
  'satynow',
  'matow',
  'archiwaln',
  'fine art',
  'giclee',
  'giclée',
  'rama nie jest',
  'bez ramy',
];

const PAPIER_GRAMATURA = '220 g/m²';

/** Gdzie zestaw dobrze wyglada — bez obiecywania konkretnego wnetrza. */
const MIEJSCA = 'nad sofą, łóżkiem, komodą lub w jadalni';

/**
 * @param {{ title: string, layout: string, motyw?: string, opisMotywu?: string }} args
 * @returns {string} opis gotowy do wstawienia w karte produktu
 */
function buildSetDescription({ layout, motyw, opisMotywu } = {}) {
  const label = SET_LABELS[String(layout || '').trim()];
  if (!label) throw new Error(`Nieznany układ zestawu: ${layout}`);

  const sztuk = label.count;
  const nazwaUkladu = sztuk === 3 ? 'tryptyk' : 'dyptyk';
  const temat = String(motyw || '').trim();

  const akapity = [];

  // 1. Motyw — jesli mamy gotowy opis grafiki, uzywamy go zamiast ogolnika.
  if (opisMotywu && String(opisMotywu).trim()) {
    akapity.push(String(opisMotywu).trim());
  } else if (temat) {
    akapity.push(
      `„${temat}” rozpisany na ${sztuk === 3 ? 'trzy' : 'dwa'} panele — spójna kompozycja ` +
        'o wyciszonym, dopracowanym charakterze.'
    );
  }

  // 2. NAJWAZNIEJSZY akapit: ile sztuk i ze panele lacza sie w jedna scene.
  // Bez tego zamowienie zestawu konczy sie reklamacja, a klient nie rozumie,
  // za co placi wiecej niz za pojedynczy plakat.
  akapity.push(
    `To ${nazwaUkladu} — zestaw ${sztuk} osobnych plakatów, które razem tworzą jedną, ciągłą scenę. ` +
      `Motyw przechodzi płynnie z arkusza na arkusz, więc powieszone obok siebie czytają się jak jedno dzieło, ` +
      `a każdy z osobna broni się jako samodzielna grafika.`
  );

  // 3. Gdzie powiesic — konkret pomaga wyobrazic sobie produkt u siebie.
  akapity.push(
    `Kompozycja pozioma sprawdza się ${MIEJSCA}. Zalecany odstęp między ramami to 3–5 cm — ` +
      `wtedy panele czytają się jako całość, zachowując oddech.`
  );

  // 4. Specyfikacja. Gramatura i sposob ekspozycji, bez marki i bez slow zakazanych.
  akapity.push(
    ['O wydruku:',
      // "3 osobne arkusze", ale "2 osobne arkusze" — polska liczba mnoga dla 2-4
      // jest ta sama, wiec wystarczy forma mianownikowa.
      `• ${sztuk} osobne arkusze tworzące jedną kompozycję`,
      `• Papier ${PAPIER_GRAMATURA}, dobrany wspólnie z ekspertami z branży, po wielu próbach`,
      '• Grafika idealnie eksponuje się za szkłem ramki — zachowuje głębię barw i czytelność detalu',
      '• Nadruk na całej powierzchni, bez marginesu',
      '• Starannie zapakowane do wysyłki',
    ].join('\n')
  );

  // 5. Standardowe zastrzezenie o kolorach — realnie ucina reklamacje o odcien.
  akapity.push(
    'Kolory mogą nieznacznie różnić się od tych na ekranie — zależy to od kalibracji monitora.'
  );

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
