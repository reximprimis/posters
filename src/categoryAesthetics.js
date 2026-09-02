/**
 * ESTETYKA I ORIENTACJA WEDLUG KATEGORII.
 *
 * Wyciagniete z uzupelnijKategorie.js, bo zbudujPlanUzupelnien.js tej wiedzy
 * NIE MIAL i budowal plany bez estetyki w ogole. To nie drobiazg: przebieg
 * bez estetyki dal kiedys 6 na 9 plakatow w jednym kubelku koloru, przez co
 * cala biblioteka przechylila sie w bez i braz. Dwa skrypty planujace musza
 * czerpac z jednego zrodla, inaczej jedno z nich znowu to zgubi — dokladnie
 * tak zginela lista slow odrzucanych przez filtr bezpieczenstwa.
 *
 * Estetyka musi pasowac do kategorii: ukiyo-e w silowni wyglada absurdalnie,
 * dlatego kazda kategoria ma wlasna liste. Kolejnosc ma znaczenie — rotacja
 * bierze je po kolei, wiec pierwsza jest najczestsza.
 */

'use strict';

/**
 * Estetyki pasujace do kategorii. Kolejnosc ma znaczenie — rotacja bierze je
 * po kolei, wiec pierwsza jest najczestsza.
 */
const ESTETYKI = {
  'abstract': ['bauhaus', 'mid-century', 'exhibition', 'black-white'],
  'ai-technology': ['bauhaus', 'black-white', 'exhibition'],
  'animals': ['scandi', 'japandi', 'black-white', 'ukiyo-e'],
  'architecture': ['bauhaus', 'black-white', 'exhibition', 'mid-century'],
  'bar-cocktails': ['mid-century', 'quiet-luxury', 'exhibition'],
  'botanical': ['japandi', 'scandi', 'wabi-sabi', 'black-white', 'ukiyo-e'],
  'cities-travel': ['exhibition', 'black-white', 'mid-century', 'bauhaus'],
  'coffee-tea': ['japandi', 'wabi-sabi', 'mid-century'],
  'cyberpunk-neon': ['', 'bauhaus'],
  'fashion-beauty': ['quiet-luxury', 'black-white', 'exhibition'],
  'fitness-gym': ['black-white', 'bauhaus', 'exhibition'],
  'gaming-esports': ['', 'bauhaus'],
  'humor-memes': ['mid-century', 'scandi', 'bauhaus'],
  'kids-nursery': ['scandi', 'boho', 'japandi'],
  'kitchen-food': ['wabi-sabi', 'mid-century', 'japandi'],
  'line-art-figures': ['black-white', 'japandi', 'exhibition'],
  'love-romance': ['japandi', 'ukiyo-e', 'quiet-luxury'],
  'mountains-hiking': ['exhibition', 'scandi', 'wabi-sabi', 'black-white'],
  'music-sound': ['mid-century', 'bauhaus', 'black-white'],
  'nature-landscapes': ['wabi-sabi', 'exhibition', 'scandi', 'japandi'],
  'retro-vintage': ['mid-century', 'exhibition'],
  'sea-coast': ['scandi', 'wabi-sabi', 'exhibition', 'japandi'],
  'space-astronomy': ['exhibition', 'black-white', 'bauhaus'],
  'sports-hobbies': ['bauhaus', 'mid-century', 'black-white', 'exhibition'],
  'symbols-sacred-geometry': ['black-white', 'bauhaus', 'exhibition'],
  // BEZ ESTETYKI, i to nie jest przeoczenie.
  //
  // Tozsamoscia tej kategorii SA LITERY. Kazda estetyka opisuje ksztalty
  // i formy, a model idzie za nimi zamiast za napisem — sprawdzone na
  // produkcji: "Hello Sunshine Type" z estetyka wystawowa wyszlo jako
  // abstrakcyjne luki, a "Bloom Where Planted" z bauhausem jako kwiatek.
  // Ani jednej litery. Te same tytuly bez estetyki daja poprawny napis.
  // Zdanie "SUBJECT STAYS" w promcie tego nie ratuje.
  'typography-quotes': [''],
  'vehicles': ['mid-century', 'black-white', 'exhibition'],
  'wellness-yoga': ['japandi', 'wabi-sabi', 'scandi'],
  'zodiac-astrology': ['exhibition', 'ukiyo-e', 'black-white'],
};

/** Kategorie, w ktorych poziom ma sens sam z siebie. */
const LUBIA_POZIOM = new Set([
  'mountains-hiking', 'nature-landscapes', 'sea-coast', 'cities-travel', 'space-astronomy',
]);


/**
 * TYTUL OBIECUJACY KOLOR ALBO MATERIAL NIE MOZE DOSTAC ESTETYKI CZARNO-BIALEJ.
 *
 * Estetyka nadpisuje palete, wiec "Server Rack Blue" wyszedl weglowym
 * monochromem bez grama blekitu, a "Saxophone Golden Light" bez grama zlota.
 * Sam plakat bywa dobry — sprzeczny jest PRODUKT: klient czyta tytul, ktory
 * obiecuje kolor, i dostaje jego brak.
 *
 * DRUGA LISTA, MATERIALY, powstala po dwoch kolejnych wpadkach tego samego
 * rodzaju, ktorych pierwsza wersja blokady nie lapala. "Slate Roof Pattern"
 * dostal pomaranczowo-zielone dachowki, bo lupek niesie kolor dopiero przez
 * material. "Wooden Dashboard Dials" wyszedl ciemnym metalem — drewna nie
 * bylo wcale. Nazwa materialu jest dla kupujacego taka sama obietnica jak
 * nazwa koloru, wiec traktujemy ja tak samo.
 *
 * Sprawdzamy TYTUL, a nie prompt, bo to tytul widzi kupujacy.
 */
const KOLOR_W_TYTULE = /\b(blue|golden|gold|red|green|pink|purple|amber|crimson|azure|teal|orange|yellow|silver|copper|rose|violet|indigo|emerald|turquoise|scarlet|lilac|mint|coral|ruby|jade)\b/i;

/**
 * Materialy, ktore niosa CIEPLY kolor — czarno-biala im go odbiera.
 *
 * Nie ma tu lupka, marmuru, stali ani szkla: one sa szare albo bezbarwne
 * z natury, wiec w monochromie wygladaja wiarygodnie. "Slate Roof Pattern"
 * po przegenerowaniu na czarno-biala wyszedl poprawnie, bo lupek JEST szary —
 * jego pierwsza wpadka miala inna przyczyne: estetyka mid-century narzucila
 * cieply pomaranczowo-zielony kafel materialowi, ktory taki nie jest.
 * Tego ta blokada nie lapie i nie udaje, ze lapie — wychwycil to przeglad.
 */
const MATERIAL_W_TYTULE = /\b(wooden|wood|oak|walnut|teak|mahogany|brass|bronze|terracotta|rust|rusted|leather)\b/i;

/**
 * @param {string} tytul
 * @param {string} estetyka
 * @returns {boolean}
 */
function estetykaPasujeDoTytulu(tytul, estetyka) {
  if (estetyka !== 'black-white') return true;
  const t = String(tytul || '');
  return !KOLOR_W_TYTULE.test(t) && !MATERIAL_W_TYTULE.test(t);
}

module.exports = { ESTETYKI, LUBIA_POZIOM, KOLOR_W_TYTULE, MATERIAL_W_TYTULE, estetykaPasujeDoTytulu };

