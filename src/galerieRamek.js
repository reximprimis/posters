/**
 * ZESTAW PLAKATOW I RAMEK (kind: 'gallery-framed') — rama WLICZONA w cene.
 *
 * Drugi produkt z tej samej rodziny co "zestaw plakatow" (src/galerieScienne.js,
 * kind: 'gallery'), ale z jedna zasadnicza roznica: tam klient dobiera rame
 * sam w sklepie, tu rama jest CZESCIA PRODUKTU — prawdziwy SKU ze sklepu
 * (src/ramkiKatalog.js), fizycznie pakowany przy wysylce.
 *
 * Konsekwencje tej roznicy sa wszedzie: inna cena (dolicza sie koszt ramy),
 * inny opis (WOLNO — i trzeba — wspomniec rame, bo faktycznie jest w srodku),
 * inny obraz glowny (pokazuje oprawione, bo tak wyglada to, co przyjedzie).
 *
 * Cena wydruku bierzemy z src/galerieScienne.js (SIZE_PRICES) — to jest
 * ta sama cena, ktora klient placi za sam plakat gdziekolwiek indziej
 * w katalogu. Druga kopia tej tabeli rozjechalaby sie z pierwsza predzej
 * czy pozniej — to juz sie w tym projekcie zdarzalo wielokrotnie.
 */

'use strict';

const { SIZE_PRICES } = require('./galerieScienne');
const { cenaRamy } = require('./ramkiKatalog');

/**
 * Rabat wzgledem kupna wydruku i ramy osobno. Ten sam poziom co przy
 * "zestawie plakatow" (src/galerieScienne.js) — spojnosc w calym katalogu,
 * a nie osobna liczba wyssana z palca dla kazdego nowego produktu.
 */
const RABAT = 0.12;

/**
 * @param {Array<{rozmiar:string}>} pozycje
 * @param {string} kolorRamy np. 'czarny-mat'
 * @returns {number} suma: wydruk + rama, kazda pozycja osobno
 */
function cenaOsobno(pozycje, kolorRamy) {
  return pozycje.reduce((s, p) => {
    const cenaWydruku = SIZE_PRICES[p.rozmiar];
    if (!cenaWydruku) throw new Error('Nieznany rozmiar: ' + p.rozmiar);
    return s + cenaWydruku + cenaRamy(kolorRamy, p.rozmiar);
  }, 0);
}

/** @returns {number} cena zestawu, zaokraglona do pelnych zlotych */
function cenaZestawu(pozycje, kolorRamy) {
  return Math.round(cenaOsobno(pozycje, kolorRamy) * (1 - RABAT));
}

/**
 * Sprawdza definicje wobec kartoteki I wobec katalogu ram. Zwraca liste
 * bledow — pusta oznacza, ze zestaw da sie zbudowac i wyslac.
 */
function sprawdzDefinicje(def, inv, fileExists) {
  const bledy = [];
  if (!def.tytul) bledy.push('brak tytulu');
  if (!def.kolorRamy) bledy.push('brak kolorRamy (patrz src/ramkiKatalog.js)');
  if (!Array.isArray(def.pozycje) || def.pozycje.length < 2) bledy.push('zestaw musi miec co najmniej dwa plakaty');

  for (const poz of def.pozycje || []) {
    const p = inv.posters.find((x) => x.title === poz.tytul && x.kind !== 'set' && x.kind !== 'gallery' && x.kind !== 'gallery-framed');
    if (!p) { bledy.push('brak w kartotece: ' + poz.tytul); continue; }
    if (!p.approvedForPrint) bledy.push('niezatwierdzony do druku: ' + poz.tytul);
    if (!SIZE_PRICES[poz.rozmiar]) { bledy.push('nieznany rozmiar ' + poz.rozmiar + ' przy ' + poz.tytul); continue; }
    const pdf = (p.pdfPaths || {})[poz.rozmiar];
    if (!pdf) bledy.push('brak PDF ' + poz.rozmiar + ' dla ' + poz.tytul);
    else if (!fileExists(pdf)) bledy.push('PDF wpisany, ale pliku nie ma: ' + pdf);
    if (def.kolorRamy) {
      try { cenaRamy(def.kolorRamy, poz.rozmiar); }
      catch (e) { bledy.push('rama "' + def.kolorRamy + '" nie istnieje w rozmiarze ' + poz.rozmiar + ' (' + poz.tytul + ')'); }
    }
  }

  const tytuly = (def.pozycje || []).map((p) => p.tytul);
  if (new Set(tytuly).size !== tytuly.length) bledy.push('ten sam plakat wystepuje dwa razy');

  return bledy;
}

module.exports = { RABAT, cenaOsobno, cenaZestawu, sprawdzDefinicje };
