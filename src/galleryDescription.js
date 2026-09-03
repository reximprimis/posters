/**
 * Opis produktu dla ZESTAWOW SCIENNYCH (kind: 'gallery').
 *
 * Ta sama polityka co przy dyptykach i tryptykach (src/setDescription.js),
 * ale INNA TRESC srodkowego akapitu — i to jest istotne, nie kosmetyczne.
 * Dyptyk/tryptyk to jedna pocieta panorama: "motyw przechodzi plynnie
 * z arkusza na arkusz". Zestaw scienny to NIEZALEZNE motywy w dobranych
 * rozmiarach — napisanie o nim "jedna ciagla scena" byloby nieprawda
 * o produkcie, ktora klient zweryfikuje w dwie sekundy po otwarciu paczki.
 *
 * SPECYFIKACJA PODLOZA I ZAKAZANE OKRESLENIA sa WSPOLNE ze zestawami — brane
 * z setDescription.js, a nie przepisywane. Dwie kopie tej samej listy
 * zakazanych slow rozjechalyby sie prędzej czy pozniej, tak jak juz sie stalo
 * w tym projekcie z lista slow odrzucanych przez filtr bezpieczenstwa
 * dostawcy i z tabela estetyk.
 *
 * RAMA: produkt jest wyceniony i sprzedawany DOKLADNIE jak reszta katalogu —
 * same wydruki, cena skladnikow razem minus rabat (src/galerieScienne.js).
 * Rama jest osobnym produktem w sklepie, dobieranym przez klienta. Packshot
 * i salon POKAZUJA oprawione plakaty wylacznie jako wizualizacje efektu —
 * to ten sam zabieg, co przy KAZDYM pojedynczym plakacie w katalogu, ktory
 * tez ma zdjecie w ramie, a sprzedawany jest bez niej. Nie piszemy w opisie
 * ani ze rama jest w cenie, ani ze jej brakuje — po prostu jej nie wspominamy,
 * zgodnie z ta sama zasada co reszta katalogu.
 */

const { PAPIER_GRAMATURA, ZAKAZANE_OKRESLENIA, findForbiddenTerms } = require('./setDescription');

const TEKSTY = {
  en: {
    zestaw: (sztuk, rozmiary) =>
      `A curated wall set of ${sztuk} independent prints in complementary sizes` +
      (rozmiary ? ` (${rozmiary})` : '') +
      ', chosen to work together on one wall — each piece is a complete artwork on its own, ' +
      'grouped so you don’t have to guess what goes together.',
    miejsce:
      'Arrange with the largest piece as the anchor and the smaller ones alongside it, ' +
      'leaving 3–5 cm between frames. Works well above a sofa, a bed or a sideboard.',
    naglowekSpec: 'About the prints:',
    spec: (sztuk) => [
      `• ${sztuk} independent prints, sized to be hung together`,
      `• ${PAPIER_GRAMATURA} paper, chosen together with industry experts after extensive testing`,
      '• Displays beautifully behind frame glass — keeps depth of colour and fine detail',
      '• Edge-to-edge print, no border',
      '• Carefully packaged for shipping',
    ],
    kolory: 'Colours may vary slightly from what you see on screen, depending on your monitor calibration.',
  },
  pl: {
    zestaw: (sztuk, rozmiary) =>
      `Kuratorski zestaw ${sztuk} niezaleznych plakatow w dobranych rozmiarach` +
      (rozmiary ? ` (${rozmiary})` : '') +
      ' — dobrane tak, by dzialaly razem na jednej scianie. Kazdy z osobna jest kompletna grafika, ' +
      'a caly komplet oszczedza Ci zgadywania, co do siebie pasuje.',
    miejsce:
      'Ulozenie: najwiekszy element jako kotwica, mniejsze obok niego, odstep 3–5 cm miedzy ramami. ' +
      'Sprawdza sie nad sofa, lozkiem lub komoda.',
    naglowekSpec: 'O wydruku:',
    spec: (sztuk) => [
      `• ${sztuk} niezalezne wydruki, dobrane tak, by wisialy razem`,
      `• Papier ${PAPIER_GRAMATURA}, dobrany wspolnie z ekspertami z branzy, po wielu probach`,
      '• Grafika idealnie eksponuje sie za szklem ramki — zachowuje glebie barw i czytelnosc detalu',
      '• Nadruk na calej powierzchni, bez marginesu',
      '• Starannie zapakowane do wysylki',
    ],
    kolory: 'Kolory moga nieznacznie roznic sie od tych na ekranie — zalezy to od kalibracji monitora.',
  },
};

/**
 * @param {{ opisMotywu?: string, pieceCount: number, sizes?: string[], language?: 'en'|'pl' }} args
 * @returns {string} opis gotowy do wstawienia w karte produktu
 */
function buildGalleryDescription({ opisMotywu, pieceCount, sizes, language } = {}) {
  const lang = language === 'pl' ? 'pl' : 'en';
  const t = TEKSTY[lang];
  const sztuk = Number(pieceCount) || (sizes || []).length;
  if (!sztuk) throw new Error('buildGalleryDescription: brak pieceCount/sizes.');
  const rozmiary = (sizes || []).join(', ');

  const akapity = [];
  if (opisMotywu && String(opisMotywu).trim()) akapity.push(String(opisMotywu).trim());
  akapity.push(t.zestaw(sztuk, rozmiary));
  akapity.push(t.miejsce);
  akapity.push([t.naglowekSpec, ...t.spec(sztuk)].join('\n'));
  akapity.push(t.kolory);

  return akapity.join('\n\n');
}

module.exports = { PAPIER_GRAMATURA, ZAKAZANE_OKRESLENIA, findForbiddenTerms, buildGalleryDescription };
