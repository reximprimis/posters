/**
 * REGULY OKAZJI — jedno miejsce dla calego projektu.
 *
 * Wyciagniete z przypiszOkazje.js, bo walidujPlan.js potrzebuje ich, zeby
 * sprawdzic, czy planowany tytul w ogole zlapie okazje, dla ktorej powstaje.
 * Skopiowanie ich do walidatora byloby SZOSTYM w tym projekcie przypadkiem
 * tej samej awarii: ta sama wiedza w dwoch plikach, ktore z czasem sie
 * rozjezdzaja. Pierwsza wersja walidatora miala wlasna, niepelna kopie —
 * znala szesc okazji z szesnastu i pokazywala "ZADNEJ" przy tytulach, ktore
 * regule spelnialy.
 *
 * Regula = okazja + warunek. Plakat moze dostac kilka okazji naraz
 * (zimowy las to i winter, i christmas, jesli ma w tytule odpowiednie slowa).
 *
 * test(plakat, tytulMalymiLiterami, kolory)
 */

'use strict';

/**
 * Regula: okazja + warunek. Kolejnosc nie ma znaczenia, plakat moze dostac
 * kilka okazji (jesienny las to i autumn, i cozy-home).
 */
const REGULY = [
  {
    okazja: 'autumn',
    // Sama barwa NIE wystarczy. Pierwsza wersja tej reguly brala kazdy plakat
    // z brazem i pomarancza — do jesieni trafialy kasety, winyle i espresso,
    // czyli cieple barwy bez zadnego zwiazku z sezonem. Kolekcja sezonowa
    // z przypadkowa polowa katalogu przestaje cokolwiek znaczyc.
    //
    // Teraz: slowo jesienne wystarcza samo, a barwa liczy sie TYLKO
    // w kategoriach, gdzie sezon jest w ogole widoczny — natura, botanika,
    // gory, morze, zwierzeta.
    test: (p, t, kolory) => {
      if (/\b(autumn|fall|maple|harvest|pumpkin)\b/.test(t)) return true;
      // Bez 'animals': pies w zlotej godzinie ma dokladnie te same kolory co
      // jesienny las (braz + pomarancz), a jesienia nie jest. Zwierze wchodzi
      // do sezonu tylko przez slowo w tytule, nie przez barwe.
      const SEZONOWE = ['botanical', 'nature-landscapes', 'mountains-hiking', 'sea-coast'];
      if (!SEZONOWE.includes(p.category)) return false;
      return kolory.includes('orange') && (kolory.includes('brown') || kolory.includes('beige'));
    },
  },
  {
    // Nazwa barwy w tytule wystarcza sama. Plakat nazwany "Plum Hills"
    // albo "Terracotta Arch" powstal POD kolekcje jesienna — wpada do niej
    // z zamiaru, nie z pomiaru pikseli. Bez tej reguly subtelne kompozycje
    // wypadaly: paproc w zieleni i szarosci ma tylko JEDEN kolor z palety,
    // a progu dwoch nie przechodzi, mimo ze jest wprost pod baner.
    okazja: 'autumn',
    test: (p, t) =>
      /\b(terracotta|clay|cocoa|plum|ochre|rust|chestnut|amber|deep green)\b/.test(t) &&
      ['botanical', 'nature-landscapes', 'mountains-hiking', 'abstract', 'sea-coast'].includes(p.category),
  },
  {
    // Osobna os pod baner "Kolory jesieni 2026": glina, kakao, kremowy,
    // gleboka zielen, sliwka. To NIE jest klasyczna ruda jesien, tylko
    // stonowana paleta wnetrzarska — dlatego wlasna regula, a nie autumn.
    okazja: 'autumn',
    test: (p, t, kolory) => {
      const PALETA = ['brown', 'beige', 'green', 'purple', 'orange'];
      const trafienia = PALETA.filter((k) => kolory.includes(k)).length;
      const SEZONOWE = ['botanical', 'nature-landscapes', 'mountains-hiking', 'abstract'];
      return trafienia >= 2 && SEZONOWE.includes(p.category);
    },
  },
  {
    okazja: 'winter',
    test: (p, t, kolory) =>
      /\b(winter|snow|frost|ice|glacier|frozen)\b/.test(t) ||
      (kolory.includes('white') && kolory.includes('blue') && /\b(peak|mountain|pine)\b/.test(t)),
  },
  {
    okazja: 'christmas',
    test: (p, t) => /\b(christmas|advent|nativity|reindeer|mistletoe)\b/.test(t),
  },
  {
    okazja: 'spring',
    test: (p, t) => /\b(spring|blossom|bloom|cherry|magnolia|tulip|daffodil)\b/.test(t),
  },
  {
    okazja: 'summer',
    test: (p, t) => /\b(summer|beach|shore|wave|palm|sunset over|coast)\b/.test(t),
  },
  {
    okazja: 'valentines-day',
    test: (p, t) => p.category === 'love-romance' && /\b(heart|kiss|love|couple|embrace|two)\b/.test(t),
  },
  {
    okazja: 'wedding',
    test: (p, t) => /\b(ring|wedding|vow|anniversary|bouquet)\b/.test(t),
  },
  {
    okazja: 'new-baby',
    test: (p) => p.category === 'kids-nursery',
  },
  {
    okazja: 'first-day-of-school',
    test: (p, t) => /\b(school|pencil|alphabet|abc|crayon)\b/.test(t),
  },
  {
    okazja: 'halloween',
    test: (p, t) => /\b(halloween|pumpkin|ghost|skull|spooky|raven)\b/.test(t),
  },
  {
    okazja: 'housewarming',
    // Motywy "domowe": kawa, kuchnia, wnetrze — klasyczny prezent na parapetowke.
    test: (p) => ['coffee-tea', 'kitchen-food', 'architecture'].includes(p.category),
  },
  {
    okazja: 'party-fun',
    test: (p) => ['bar-cocktails', 'humor-memes', 'gaming-esports'].includes(p.category),
  },
  {
    okazja: 'oktoberfest',
    test: (p, t) => /\b(beer|brew|pretzel|bavaria|alpine hut)\b/.test(t),
  },
  {
    okazja: 'new-year',
    test: (p, t) => /\b(new year|fireworks|midnight|champagne|toast)\b/.test(t),
  },
  {
    okazja: 'easter',
    test: (p, t) => /\b(easter|egg|bunny|rabbit)\b/.test(t),
  },
  {
    okazja: 'birthday',
    test: (p, t) => /\b(birthday|balloon|candle|celebration)\b/.test(t),
  },
];

module.exports = { REGULY };
