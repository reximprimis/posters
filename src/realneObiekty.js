/**
 * ZAKAZ PLAKATOW UDAJACYCH KONKRETNY, ISTNIEJACY OBIEKT.
 *
 * Model nie zna lokalnych zabytkow. Poproszony o "Lomnica Palace" nie
 * odmawia — RYSUJE WYMYSLONY PALAC i robi to przekonujaco. Powstal wtedy
 * ogromny barok z ogrodem francuskim, podczas gdy prawdziwy Palac Lomnica
 * to skromny zolty dwor z dwiema wiezyczkami i czerwonym dachem. Klient
 * z regionu rozpoznaje falsz natychmiast, a produkt sprzedawany pod nazwa
 * istniejacego miejsca wprowadza w blad.
 *
 * NIE dotyczy to obiektow, ktore model faktycznie zna (Sniezka z obserwatorium
 * wyszla wiernie) ani TYPOW architektonicznych ("stave church", "Tyrolean
 * house") — tam nie obiecujemy konkretnego adresu, tylko charakter budowli.
 *
 * Granicy nie da sie wyznaczyc automatycznie, wiec skrypt nie zgaduje:
 * WYKRYWA ryzyko i wymaga jawnego potwierdzenia. Domyslnie blokuje.
 */

'use strict';

/**
 * Slowa, ktore w tytule oznaczaja KONKRETNY obiekt, a nie motyw.
 * "Mountain Hut" to dowolna chata, ale "Karpniki Castle" to jeden zamek
 * pod jednym adresem.
 */
const OBIEKTY = [
  'castle', 'palace', 'chateau', 'manor', 'cathedral', 'basilica', 'abbey',
  'monastery', 'town hall', 'market square', 'museum', 'theatre', 'opera',
  'bridge of', 'tower of', 'gate of', 'spa house', 'colonnade', 'observatory',
];

/**
 * Nazwy wlasne rozpoznajemy po wielkiej literze w miejscu, gdzie nie zaczyna
 * sie zdanie. Lista wyjatkow zawiera slowa, ktore pisane sa wielka litera,
 * a nazwa miejsca nie sa.
 */
const NIE_NAZWY = new Set([
  'The', 'A', 'An', 'Of', 'In', 'On', 'At', 'And', 'With', 'Over', 'Under',
  'Castle', 'Palace', 'Church', 'Tower', 'Bridge', 'Square', 'Park', 'Garden',
  'House', 'Hall', 'Gate', 'Ruins', 'Facade', 'Reflection', 'View', 'Study',
  'Morning', 'Evening', 'Dawn', 'Dusk', 'Autumn', 'Winter', 'Spring', 'Summer',
  'Stave', 'Tyrolean', 'Spa', 'Colonnade', 'Market', 'Old', 'New', 'Great',
]);

/**
 * @param {string} tytul
 * @returns {{ ryzyko: boolean, obiekt: string|null, nazwa: string|null, powod: string }}
 */
function ocenTytul(tytul) {
  const t = String(tytul || '').trim();
  const niski = t.toLowerCase();

  const obiekt = OBIEKTY.find((o) => niski.includes(o)) || null;
  if (!obiekt) {
    return { ryzyko: false, obiekt: null, nazwa: null, powod: 'brak slowa wskazujacego konkretny obiekt' };
  }

  // Nazwa wlasna: wyraz z wielka litera, ktory nie jest ani pierwszy,
  // ani slowem z listy wyjatkow.
  const slowa = t.split(/\s+/);
  const nazwa = slowa.find((w, i) => i >= 0 && /^[A-ZŁŚŻŹĆŃÓĄĘ]/.test(w) && !NIE_NAZWY.has(w)) || null;

  if (!nazwa) {
    return {
      ryzyko: false,
      obiekt,
      nazwa: null,
      powod: 'obiekt bez nazwy wlasnej — to typ budowli, nie konkretny adres',
    };
  }

  return {
    ryzyko: true,
    obiekt,
    nazwa,
    powod: `"${nazwa}" + "${obiekt}" wskazuje KONKRETNY istniejacy obiekt`,
  };
}

/**
 * @param {string[]} tytuly
 * @returns {Array<{ tytul: string, obiekt: string, nazwa: string, powod: string }>}
 */
function znajdzRyzykowne(tytuly) {
  const out = [];
  for (const t of tytuly || []) {
    const o = ocenTytul(t);
    if (o.ryzyko) out.push({ tytul: t, obiekt: o.obiekt, nazwa: o.nazwa, powod: o.powod });
  }
  return out;
}

module.exports = { OBIEKTY, ocenTytul, znajdzRyzykowne };
