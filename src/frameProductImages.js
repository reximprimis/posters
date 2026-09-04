/**
 * Rozwiazywanie zdjec produktowych dla ramek jako WLASNYCH produktow
 * (kind: 'frame') — po KONWENCJI SCIEZEK, nie po polu w kartotece.
 *
 * Powod: front i tyl ramki NIE ZMIENIAJA SIE miedzy rozmiarami tego samego
 * koloru (front) ani miedzy kolorami tego samego rozmiaru (tyl — mechanizm
 * mocowania jest ten sam niezaleznie od koloru lica). Gdyby te sciezki byly
 * polami zapisanymi w kazdym z 30 rekordow osobno, dodanie jednego zdjecia
 * wymagaloby aktualizacji wielu rekordow naraz i latwo o rozjazd — dokladnie
 * ten sam blad, ktory juz kilka razy w tym projekcie kosztowal godziny
 * (duplikaty cennika, list slow zakazanych). Jedno zdjecie na dysku, wiele
 * rekordow je czyta.
 *
 * Konwencja:
 *   frames/products/<kolor>/front.jpg          — front na czystym tle,
 *                                                 WSPOLNY dla wszystkich
 *                                                 rozmiarow tego koloru (sama
 *                                                 rama, bez kontekstu — nie ma
 *                                                 czego rozniciowac po rozmiarze)
 *   frames/products/<kolor>/room-<pasmo>.jpg   — aranzacja w pokoju, gdzie
 *                                                 pasmo = 'small' (13x18,
 *                                                 21x30 — rama STOI na
 *                                                 podpurce) albo 'large'
 *                                                 (30x40+, rama TYLKO wisi).
 *                                                 NIE wspolny dla calego
 *                                                 koloru — male ramy stojace
 *                                                 na polce i duze wiszace na
 *                                                 scianie to inna scena, wiec
 *                                                 jedno zdjecie na caly kolor
 *                                                 pasowaloby tylko czesci
 *                                                 rozmiarow (zauwazone przez
 *                                                 uzytkownika: "to samo
 *                                                 zdjecie nie pasuje np. do
 *                                                 50x70").
 *   frames/products/_back/<rozmiar>.jpg        — tyl z zaczepami/podpurka,
 *                                                 WSPOLNY dla wszystkich
 *                                                 kolorow tego rozmiaru
 *                                                 (mechanizm mocowania jest
 *                                                 ten sam niezaleznie od
 *                                                 koloru lica).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { jestMalyRozmiar } = require('./frameProductDescription');

const ROOT = path.join(__dirname, '..');
const PRODUCTS_DIR = path.join(ROOT, 'frames', 'products');

const ROZSZERZENIA = ['.jpg', '.jpeg', '.png'];

function znajdzPlik(dir, nazwaBezRozszerzenia) {
  for (const ext of ROZSZERZENIA) {
    const p = path.join(dir, nazwaBezRozszerzenia + ext);
    if (fs.existsSync(p)) return path.relative(ROOT, p).split(path.sep).join('/');
  }
  return '';
}

/**
 * @param {{ frameColor: string, size: string }} rekord
 * @returns {{ front: string, room: string, back: string }} sciezki wzgledne
 *   od katalogu projektu (puste jezeli plik jeszcze nie istnieje)
 */
function resolveFrameImages(rekord) {
  const kolorDir = path.join(PRODUCTS_DIR, rekord.frameColor);
  const backDir = path.join(PRODUCTS_DIR, '_back');
  const pasmo = jestMalyRozmiar(rekord.size) ? 'small' : 'large';
  return {
    front: znajdzPlik(kolorDir, 'front'),
    room: znajdzPlik(kolorDir, 'room-' + pasmo),
    back: znajdzPlik(backDir, rekord.size),
  };
}

module.exports = { PRODUCTS_DIR, resolveFrameImages };
