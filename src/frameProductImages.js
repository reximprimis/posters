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
 *   frames/products/<kolor>/front.jpg   — front na czystym tle, WSPOLNY dla
 *                                          wszystkich rozmiarow tego koloru
 *   frames/products/<kolor>/room.jpg    — front w pokoju (docelowo generowany
 *                                          jak salon zestawow), opcjonalny
 *   frames/products/_back/<rozmiar>.jpg — tyl z zaczepami/podpurka, WSPOLNY
 *                                          dla wszystkich kolorow tego rozmiaru
 *                                          (male 13x18/21x30 maja podpurke,
 *                                          duze tylko zaczepy — inne u kazdego
 *                                          rozmiaru, ale nie u kazdego koloru)
 */

'use strict';

const fs = require('fs');
const path = require('path');

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
  return {
    front: znajdzPlik(kolorDir, 'front'),
    room: znajdzPlik(kolorDir, 'room'),
    back: znajdzPlik(backDir, rekord.size),
  };
}

module.exports = { PRODUCTS_DIR, resolveFrameImages };
