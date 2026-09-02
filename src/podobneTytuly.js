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

/**
 * SLOWA, KTORE NIE SA TEMATEM.
 *
 * Sprawdzenie porownuje slowa znaczace, wiec lista slow pustych decyduje
 * o tym, co uznajemy za "ten sam plakat". Pierwsza wersja miala dwanascie
 * pozycji i przy puli 68 tytulow botanicznych zaczela odrzucac wszystko:
 * "Cactus Spine Detail" kolidowal z "Birch Bark Detail" przez slowo DETAIL,
 * "Chameleon Grip Branch" z "Red Panda Branch" przez BRANCH, a "Bison Winter
 * Herd" z "Lynx in Winter" przez WINTER. Kaktus i brzoza to nie jest ten sam
 * plakat — wspolne bylo tylko slowo opisujace kadr.
 *
 * Podzial jest prosty: TEMAT zostaje znaczacy (kaktus, brzoza, kameleon),
 * a slowa opisujace KADR, PORE, JAKOSC i CZESC — nie.
 *
 * Pory roku sa tu z osobnego powodu. Reguly okazji wymagaja slowa sezonu
 * W TYTULE, zeby plakat trafil do kolekcji sezonowej — a sprawdzenie karalo
 * dokladnie za to. Dwie zasady projektu walczyly ze soba i wygrywala ta,
 * ktora blokowala.
 */
const SLOWA_PUSTE = new Set([
  // spojniki i przyimki
  'the', 'and', 'in', 'on', 'at', 'of', 'a', 'to', 'over', 'with', 'under',
  'above', 'from', 'into', 'across', 'through', 'beside', 'near',
  // kadr i ujecie
  'study', 'lines', 'line', 'detail', 'close', 'macro', 'view', 'shot', 'scene',
  'profile', 'portrait', 'composition', 'form', 'shape', 'pattern', 'texture',
  'sequence', 'series', 'panorama', 'wide', 'long', 'tall', 'edge', 'curve',
  // pora i swiatlo
  'morning', 'evening', 'dawn', 'dusk', 'night', 'day', 'noon', 'sunrise',
  'sunset', 'light', 'shadow', 'glow', 'winter', 'spring', 'summer', 'autumn',
  // jakosc i nastroj
  'calm', 'soft', 'warm', 'cool', 'quiet', 'gentle', 'still', 'bold', 'deep',
  'classic', 'vintage', 'modern', 'minimal', 'abstract',
  // liczba i uklad
  'pair', 'duo', 'trio', 'two', 'three', 'row', 'rows', 'stack', 'cluster',
  'group', 'set', 'collection',
  // podpora, na ktorej siedzi temat — nie sam temat
  'branch', 'perch', 'bough',
  // czesc ciala i element, ktory ma prawie kazdy okaz; tematem jest GATUNEK
  'nest', 'shell', 'wing', 'wings', 'feather', 'seed', 'pod',
  // slownik ryciny przyrodniczej — te slowa nosi kazdy tytul w tej estetyce
  'specimen', 'plate', 'herbarium', 'section', 'anatomy', 'variety',
]);

const znaczace = (t) =>
  new Set(String(t).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !SLOWA_PUSTE.has(w)));

/**
 * Samo pokrycie slow nie wystarcza — "sea" i "ocean" nie maja wspolnej litery,
 * a opisuja to samo.
 */
const SYNONIMY = [
  ['soccer', 'football'], ['grass', 'turf', 'meadow'], ['mist', 'misty', 'fog', 'haze'],
  ['peak', 'summit', 'ridge'], ['vinyl', 'record'], ['sea', 'ocean', 'coast', 'shore', 'shoreline'],
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
