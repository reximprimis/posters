/**
 * DWA TYTULY, JEDEN PLAKAT.
 *
 * Pule podaja tytuly po kolei, a sasiednie bywaja bliskoznaczne: "Soccer Ball
 * on Grass" i "Football on Turf" to ten sam plakat pod dwiema nazwami. Klient
 * przegladajacy kategorie widzi wtedy powtorke, a my placimy za dwa
 * generowania.
 *
 * Wyciagniete z uzupelnijKategorie.js, bo zbudujPlanUzupelnien.js tego nie
 * sprawdzal — plan na 50 plakatow wpuscil do sports-hobbies "Volleyball on
 * Sand" i "Volleyball Net Morning" naraz. Trzeci juz przypadek tej samej
 * awarii: wiedza w jednym skrypcie, drugi jej nie ma. Wczesniej tak zginela
 * lista slow odrzucanych przez filtr bezpieczenstwa i tabela estetyk.
 *
 * Samo pokrycie slow nie wystarcza — "sea" i "ocean" nie maja wspolnej litery,
 * a opisuja to samo. Stad lista synonimow.
 */

'use strict';

const SLOWA_PUSTE = new Set(['the', 'and', 'in', 'on', 'at', 'of', 'a', 'to', 'over', 'with', 'study', 'lines']);

const znaczace = (t) =>
  new Set(String(t).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !SLOWA_PUSTE.has(w)));

const SYNONIMY = [
  ['soccer', 'football'], ['grass', 'turf', 'meadow'], ['mist', 'misty', 'fog', 'haze'],
  ['peak', 'summit', 'ridge'], ['vinyl', 'record'], ['sea', 'ocean', 'coast'],
  ['dune', 'dunes', 'sand'], ['neon', 'glow'], ['moon', 'lunar'],
];

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean} czy tytuly opisuja ten sam plakat
 */
function zbytPodobne(a, b) {
  const A = znaczace(a);
  const B = znaczace(b);
  for (const w of A) if (B.has(w)) return true;
  for (const g of SYNONIMY) if (g.some((w) => A.has(w)) && g.some((w) => B.has(w))) return true;
  return false;
}

module.exports = { SLOWA_PUSTE, SYNONIMY, znaczace, zbytPodobne };
