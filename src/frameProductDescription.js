/**
 * Opis produktu dla RAMKI JAKO WLASNEGO PRODUKTU (kind: 'frame') —
 * niezalezny od opisu plakatow (setDescription.js): tu nie ma papieru ani
 * druku, tylko rama.
 *
 * Tekst o mocowaniu zalezy od PASMA ROZMIARU, nie od dokladnego rozmiaru:
 * male ramy (13x18, 21x30) maja skladana podpurke — moga stac lub wisiec;
 * duze (30x40, 40x50, 50x70) tylko wisza. Poniewaz kazdy rozmiar to OSOBNY
 * produkt w Shopify (potwierdzone na zywym sklepie — nie warianty jednego
 * produktu), ten tekst jest ustalany RAZ przy budowie rekordu, nie w JS
 * na stronie.
 */

'use strict';

const MALE_ROZMIARY = new Set(['13x18', '21x30']);

function jestMalyRozmiar(rozmiar) {
  return MALE_ROZMIARY.has(rozmiar);
}

const NAZWY_MATERIALU = {
  pl: { aluminium: 'aluminium', drewno: 'drewno' },
  en: { aluminium: 'aluminium', drewno: 'wood' },
};
const NAZWY_KOLORU = {
  pl: { 'czarny-mat': 'czarny mat', zloty: 'złoty', srebrny: 'srebrny', miedziany: 'miedziany', dab: 'dąb', bialy: 'biały', czarny: 'czarny' },
  en: { 'czarny-mat': 'matte black', zloty: 'gold', srebrny: 'silver', miedziany: 'copper', dab: 'oak', bialy: 'white', czarny: 'black' },
};

const TEKSTY = {
  pl: {
    montaz: (maly) =>
      maly
        ? 'Orientacja: pionowo i poziomo. Ramka ma podpórkę — możesz ją postawić lub powiesić.'
        : 'Orientacja: pionowo i poziomo. Ramka jest przeznaczona do zawieszenia na ścianie.',
    wstep: (kolor, material, rozmiar) =>
      `Rama ${material} w kolorze ${kolor}, rozmiar ${rozmiar} cm. Prosty, czysty profil, który nie odciąga uwagi od pracy w środku.`,
    naglowekSpec: 'O ramie:',
    spec: (maly) => [
      '• Przezroczysty front chroniący wydruk',
      maly ? '• Składana podpórka — do postawienia na półce lub biurku' : '• Zestaw do zawieszenia na ścianie w komplecie',
      '• Montaż pionowy i poziomy',
      '• Starannie zapakowana do wysyłki',
    ],
  },
  en: {
    montaz: (maly) =>
      maly
        ? 'Orientation: portrait and landscape. The frame has a stand — you can display it upright or hang it.'
        : 'Orientation: portrait and landscape. This frame is designed to be wall-mounted.',
    wstep: (kolor, material, rozmiar) =>
      `A ${kolor} ${material} frame, ${rozmiar} cm. A simple, clean profile that keeps the focus on the print inside.`,
    naglowekSpec: 'About this frame:',
    spec: (maly) => [
      '• Clear protective front',
      maly ? '• Foldable stand — for a shelf or desk' : '• Wall-mounting hardware included',
      '• Portrait and landscape mounting',
      '• Carefully packaged for shipping',
    ],
  },
};

/**
 * @param {{ frameColor: string, frameMaterial: string, size: string, language?: 'pl'|'en' }} args
 * @returns {string}
 */
function buildFrameProductDescription({ frameColor, frameMaterial, size, language } = {}) {
  const lang = language === 'en' ? 'en' : 'pl';
  const t = TEKSTY[lang];
  if (!frameColor) throw new Error('buildFrameProductDescription: brak frameColor');
  if (!frameMaterial) throw new Error('buildFrameProductDescription: brak frameMaterial');
  if (!size) throw new Error('buildFrameProductDescription: brak size');

  const kolor = NAZWY_KOLORU[lang][frameColor] || frameColor;
  const material = NAZWY_MATERIALU[lang][frameMaterial] || frameMaterial;
  const maly = jestMalyRozmiar(size);

  const akapity = [
    t.wstep(kolor, material, size),
    t.montaz(maly),
    [t.naglowekSpec, ...t.spec(maly)].join('\n'),
  ];
  return akapity.join('\n\n');
}

module.exports = { buildFrameProductDescription, jestMalyRozmiar, NAZWY_MATERIALU, NAZWY_KOLORU };
