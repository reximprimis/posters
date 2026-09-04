/**
 * Opis produktu dla ZESTAWU PLAKATOW I RAMEK (kind: 'gallery-framed').
 *
 * JEDYNY produkt w katalogu, ktory MA WOLNO wprost napisac, ze rama jest
 * w cenie — bo tu, i tylko tu, to prawda. Kazdy inny produkt (pojedynczy
 * plakat, zestaw plakatow) milczy o ramie celowo: klient dobiera ja sam,
 * a napisanie czegokolwiek sugerowaloby wlaczenie lub jego brak (patrz
 * src/galleryDescription.js i src/setDescription.js — tam rama jest
 * pominieta, nie zaprzeczona).
 *
 * Specyfikacja PAPIERU i lista zakazanych okreslen sa nadal WSPOLNE z reszta
 * katalogu (setDescription.js) — dotycza wydruku, ktory tu jest taki sam
 * jak wszedzie indziej. Rama dostaje WLASNY, dodatkowy akapit.
 *
 * UWAGA PRZY SPRAWDZANIU: findForbiddenTerms() trzeba wolac na opisMotywu
 * (tekst wpisany recznie w definicji), NIE na calym gotowym opisie. Szablon
 * ponizej sam legalnie pisze "matowy"/"matte" — to prawdziwy atrybut
 * WYKONCZENIA RAMY (np. czarny-mat). Zakaz tego slowa istnieje wylacznie po
 * to, zeby nikt nie napisal, ze PAPIER jest matowy (jest satynowy) — to
 * ryzyko dotyczy tekstu wpisywanego recznie, nie naszego wlasnego szablonu.
 * scripts/zbudujZestawRamek.js sprawdza to poprawnie; kazdy inny kod, ktory
 * uzyje tego opisu, powinien robic tak samo.
 */

'use strict';

const { PAPIER_GRAMATURA, ZAKAZANE_OKRESLENIA, findForbiddenTerms } = require('./setDescription');
const { opisRamy } = require('./ramkiKatalog');

const NAZWY_MATERIALU = {
  pl: { aluminium: 'aluminium', drewno: 'drewno' },
  en: { aluminium: 'aluminium', drewno: 'wood' },
};
const NAZWY_KOLORU = {
  pl: { 'czarny-mat': 'czarny mat', zloty: 'złoty', srebrny: 'srebrny', miedziany: 'miedziany', dab: 'dąb', bialy: 'biały', czarny: 'czarny' },
  en: { 'czarny-mat': 'matte black', zloty: 'gold', srebrny: 'silver', miedziany: 'copper', dab: 'oak', bialy: 'white', czarny: 'black' },
};

const TEKSTY = {
  en: {
    zestaw: (sztuk) =>
      `A ready-to-hang wall set of ${sztuk} framed prints, arranged as one balanced grid — ` +
      'no separate frame to choose, no guessing what fits together.',
    rama: (material, kolor) =>
      `Each print comes framed in a ${kolor} ${material} frame, ready to hang straight out of the box.`,
    miejsce: 'Works as a compact grid on any wall — a hallway, a stairwell, above a desk or a small sofa.',
    naglowekSpec: 'About this set:',
    spec: (sztuk, material, kolor) => [
      `• ${sztuk} prints, each in its own ${kolor} ${material} frame`,
      `• ${PAPIER_GRAMATURA} paper, chosen together with industry experts after extensive testing`,
      '• Frame and hanging hardware included — ready to hang',
      '• Edge-to-edge print, no border',
      '• Carefully packaged for shipping',
    ],
    kolory: 'Colours may vary slightly from what you see on screen, depending on your monitor calibration.',
  },
  pl: {
    zestaw: (sztuk) =>
      `Gotowy do powieszenia zestaw ${sztuk} oprawionych plakatow, ulozonych w rowna krate — ` +
      'bez wybierania ramy osobno, bez zgadywania co do siebie pasuje.',
    rama: (material, kolor) =>
      `Kazdy plakat przychodzi oprawiony w rame ${material} w kolorze ${kolor}, gotowa do powieszenia prosto z pudelka.`,
    miejsce: 'Sprawdza sie jako zwarta krata na dowolnej scianie — korytarz, klatka schodowa, nad biurkiem lub mala sofa.',
    naglowekSpec: 'O zestawie:',
    spec: (sztuk, material, kolor) => [
      `• ${sztuk} plakaty, kazdy w wlasnej ramie ${material} w kolorze ${kolor}`,
      `• Papier ${PAPIER_GRAMATURA}, dobrany wspolnie z ekspertami z branzy, po wielu probach`,
      '• Rama i zawieszka w komplecie — gotowe do powieszenia',
      '• Nadruk na calej powierzchni, bez marginesu',
      '• Starannie zapakowane do wysylki',
    ],
    kolory: 'Kolory moga nieznacznie roznic sie od tych na ekranie — zalezy to od kalibracji monitora.',
  },
};

/**
 * @param {{ opisMotywu?: string, pieceCount: number, kolorRamy: string, language?: 'en'|'pl' }} args
 * @returns {string}
 */
function buildFramedDescription({ opisMotywu, pieceCount, kolorRamy, language } = {}) {
  const lang = language === 'pl' ? 'pl' : 'en';
  const t = TEKSTY[lang];
  const sztuk = Number(pieceCount);
  if (!sztuk) throw new Error('buildFramedDescription: brak pieceCount.');
  if (!kolorRamy) throw new Error('buildFramedDescription: brak kolorRamy.');

  const rama = opisRamy(kolorRamy);
  const material = NAZWY_MATERIALU[lang][rama.material];
  const kolor = NAZWY_KOLORU[lang][rama.kolor];

  const akapity = [];
  if (opisMotywu && String(opisMotywu).trim()) akapity.push(String(opisMotywu).trim());
  akapity.push(t.zestaw(sztuk));
  akapity.push(t.rama(material, kolor));
  akapity.push(t.miejsce);
  akapity.push([t.naglowekSpec, ...t.spec(sztuk, material, kolor)].join('\n'));
  akapity.push(t.kolory);

  return akapity.join('\n\n');
}

module.exports = { PAPIER_GRAMATURA, ZAKAZANE_OKRESLENIA, findForbiddenTerms, buildFramedDescription, NAZWY_MATERIALU, NAZWY_KOLORU };
