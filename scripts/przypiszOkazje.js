/**
 * Przypisuje plakatom OKAZJE — os, ktora strona zna, a my mielismy pusta.
 *
 * Strona filtruje po tagach occasion:* (16 wartosci w catalog-taxonomy.ts),
 * ale w kartotece pole occasions bylo puste przy WSZYSTKICH 288 plakatach.
 * Szesnascie filtrow i kolekcji sezonowych nie mialo czego pokazac.
 *
 * Nie zgadujemy z powietrza: okazje wynikaja z trzech przeslanek, ktore juz
 * mamy — kategorii, slow w tytule i wyliczonych kolorow. Sezon dostaja tylko
 * plakaty, ktore faktycznie go niosa, bo kolekcja jesienna z przypadkowa
 * polowa katalogu przestaje cokolwiek znaczyc.
 *
 *   node scripts/przypiszOkazje.js             — proba i rozklad
 *   node scripts/przypiszOkazje.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const zapis = process.argv.includes('--wykonaj');

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

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const zatwierdzone = inv.posters.filter((p) => p.approvedForPrint);

const rozklad = {};
const zmiany = [];
for (const p of zatwierdzone) {
  const t = String(p.title || '').toLowerCase();
  const kolory = p.colors || [];
  const okazje = [];
  for (const r of REGULY) {
    try {
      if (r.test(p, t, kolory) && !okazje.includes(r.okazja)) okazje.push(r.okazja);
    } catch (_) { /* regula nie pasuje do rekordu */ }
  }
  okazje.forEach((o) => (rozklad[o] = (rozklad[o] || 0) + 1));
  const obecne = (p.occasions || []).join(',');
  if (okazje.join(',') !== obecne) zmiany.push({ rekord: p, okazje });
}

console.log('zatwierdzonych: ' + zatwierdzone.length);
console.log('do zmiany: ' + zmiany.length);
console.log('');
console.log('ROZKLAD OKAZJI:');
const posort = Object.entries(rozklad).sort((a, b) => b[1] - a[1]);
for (const [k, v] of posort) console.log('   ' + String(v).padStart(4) + '  occasion:' + k);
const bez = zatwierdzone.filter((p) => {
  const t = String(p.title || '').toLowerCase();
  return !REGULY.some((r) => { try { return r.test(p, t, p.colors || []); } catch (_) { return false; } });
}).length;
console.log('');
console.log('bez zadnej okazji: ' + bez + ' (to normalne — nie kazdy plakat jest sezonowy)');

console.log('');
console.log('PRZYKLADY occasion:autumn:');
zatwierdzone
  .filter((p) => {
    const t = String(p.title || '').toLowerCase();
    return REGULY.filter((r) => r.okazja === 'autumn').some((r) => r.test(p, t, p.colors || []));
  })
  .slice(0, 10)
  .forEach((p) => console.log('   ' + String(p.title).slice(0, 34).padEnd(36) + (p.colors || []).join(', ')));

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
  process.exit(0);
}

// Kartoteke wczytujemy ponownie tuz przed zapisem — miedzy odczytem a zapisem
// mogl ja zmienic serwer podgladu albo trwajaca generacja.
const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const wgId = new Map(zmiany.map((z) => [z.rekord.id, z.okazje]));
let zapisanych = 0;
for (const p of swieza.posters) {
  if (wgId.has(p.id)) {
    p.occasions = wgId.get(p.id);
    zapisanych++;
  }
}
fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2), 'utf8');
console.log('');
console.log('zapisane: ' + zapisanych);
