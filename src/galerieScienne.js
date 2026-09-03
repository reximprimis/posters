/**
 * ZESTAW SCIENNY — kompozycja z ISTNIEJACYCH plakatow w roznych rozmiarach.
 *
 * To NIE JEST to samo co "set" w kartotece. Roznica jest zasadnicza:
 *
 *   set (dyptyk/tryptyk)  jedna panorama pocieta na rowne panele; rozmiar jest
 *                         WARIANTEM, wszystkie panele maja go takiego samego
 *   gallery (ten plik)    kilka NIEZALEZNYCH plakatow z biblioteki, kazdy
 *                         w innym rozmiarze; rozmiary sa czescia produktu,
 *                         wiec wariantu nie ma wcale
 *
 * Produkt sprzedaje KURATORSTWO: dobrane pod kolor sciany, pomieszczenie
 * i temat. Klient nie musi sam zestawiac trzech plakatow i zgadywac, czy beda
 * do siebie pasowac.
 *
 * PLIKI PRODUKCYJNE. Kazdy plakat skladowy ma juz komplet PDF-ow we wszystkich
 * rozmiarach, wiec galeria nic nie generuje — tylko WSKAZUJE, ktory PDF
 * w ktorym rozmiarze nalezy wydrukowac. Kopie ladują w podkatalogu "druk",
 * zeby przy zamowieniu nie trzeba bylo niczego szukac.
 */

'use strict';

const SIZE_PRICES = { '13x18': 16, '21x30': 26, '30x40': 43, '40x50': 57, '50x70': 71, '70x100': 99 };

/**
 * Rabat wzgledem kupna plakatow osobno.
 *
 * Dwanascie procent to ten sam poziom co przy tryptyku (3 × 43 = 129 zl,
 * tryptyk 116 zl). Zestaw ma byc tansszy niz suma, ale nie na tyle, zeby
 * kanibalizowal sprzedaz pojedynczych plakatow.
 */
const RABAT = 0.12;

/** @returns {number} cena katalogowa sumy skladnikow */
function cenaOsobno(pozycje) {
  return pozycje.reduce((s, p) => {
    const c = SIZE_PRICES[p.rozmiar];
    if (!c) throw new Error('Nieznany rozmiar: ' + p.rozmiar);
    return s + c;
  }, 0);
}

/** @returns {number} cena zestawu, zaokraglona do pelnych zlotych */
function cenaZestawu(pozycje) {
  return Math.round(cenaOsobno(pozycje) * (1 - RABAT));
}

/**
 * Sprawdza definicje zestawu wobec kartoteki. Zwraca liste bledow — pusta
 * oznacza, ze zestaw da sie zbudowac.
 *
 * Sprawdzamy takze ISTNIENIE PDF-a w zadanym rozmiarze, a nie tylko rekordu.
 * Zestaw, ktorego nie da sie wydrukowac, jest gorszy niz jego brak: sprzeda
 * sie i dopiero wtedy okaze sie, ze nie ma czego wyslac do drukarni.
 */
function sprawdzDefinicje(def, inv, fileExists) {
  const bledy = [];
  if (!def.tytul) bledy.push('brak tytulu');
  if (!Array.isArray(def.pozycje) || def.pozycje.length < 2) bledy.push('zestaw musi miec co najmniej dwa plakaty');

  for (const poz of def.pozycje || []) {
    const p = inv.posters.find((x) => x.title === poz.tytul && x.kind !== 'set');
    if (!p) { bledy.push('brak w kartotece: ' + poz.tytul); continue; }
    if (!p.approvedForPrint) bledy.push('niezatwierdzony do druku: ' + poz.tytul);
    if (!SIZE_PRICES[poz.rozmiar]) { bledy.push('nieznany rozmiar ' + poz.rozmiar + ' przy ' + poz.tytul); continue; }
    const pdf = (p.pdfPaths || {})[poz.rozmiar];
    if (!pdf) bledy.push('brak PDF ' + poz.rozmiar + ' dla ' + poz.tytul);
    else if (!fileExists(pdf)) bledy.push('PDF wpisany, ale pliku nie ma: ' + pdf);
  }

  const tytuly = (def.pozycje || []).map((p) => p.tytul);
  if (new Set(tytuly).size !== tytuly.length) bledy.push('ten sam plakat wystepuje dwa razy');

  return bledy;
}

module.exports = { SIZE_PRICES, RABAT, cenaOsobno, cenaZestawu, sprawdzDefinicje };
