/**
 * Wsadowe generowanie zestawow: 25 dyptykow i 25 tryptykow.
 *
 * DOBOR MOTYWOW NIE JEST DOWOLNY. Zestaw powstaje z JEDNEJ panoramy cietej
 * na panele, wiec dziala tylko wtedy, gdy motyw jest ciagly w poziomie:
 * pasmo gor, linia brzegu, galaz, mglawica, panorama miasta, pole barwne.
 * Pojedynczy przedmiot (szklanka, szminka, trabka) po przecieciu daje dwa
 * kalekie kawalki, a typografia rozpada sie na sylaby. Dlatego lista
 * obejmuje wylacznie kategorie o ciaglej kompozycji.
 *
 * TRYPTYK dostaje motywy najszersze (pasma, horyzonty, panoramy), DYPTYK
 * kadry blizsze i bardziej kameralne — przy dwoch panelach szeroka panorama
 * traci srodek, ktory jest jej najmocniejszym punktem.
 *
 * KOSZT — TRYPTYK JEST WIELOKROTNIE DROZSZY OD DYPTYKU. Z pomiarow przy
 * pierwszych szesciu zestawach: tryptyk potrzebuje 4-6 prob panoramy, dyptyk
 * zwykle jednej. Powod: tryptyk ma DWIE linie ciecia zamiast jednej, a kazda
 * musi wypasc czysto jednoczesnie. Kazda proba to platne wywolanie i ~2 min.
 *
 * Stad realny rachunek dla tego planu:
 *   25 tryptykow x ~5 prob = ~125 wywolan = ~4 h
 *   25 dyptykow  x ~1 proba =  ~25 wywolan = ~1 h
 *   razem ~150 wywolan, ~5 godzin
 *
 * Skrypt zapisuje kazdy zestaw osobno, wiec przerwanie w polowie niczego nie
 * traci — po ponownym uruchomieniu pomija juz zrobione.
 *
 *   node scripts/generujZestawyWsadowo.js              — plan i kontrola kolizji
 *   node scripts/generujZestawyWsadowo.js --wykonaj    — generowanie
 *   node scripts/generujZestawyWsadowo.js --wykonaj --ile 5   — tylko pierwsze 5
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');

const argumenty = process.argv.slice(2);
const zapis = argumenty.includes('--wykonaj');
const iIle = argumenty.indexOf('--ile');
const limit = iIle >= 0 ? Number(argumenty[iIle + 1]) || 0 : 0;

/**
 * TRYPTYKI — motywy najszersze. Srodkowy panel musi miec wlasna tresc,
 * inaczej zestaw wyglada jak przecieta na pol pocztowka z pustka w srodku.
 */
const TRYPTYKI = [
  { tytul: 'Alpine Ridge Panorama', kategoria: 'mountains-hiking', styl: 'Photography' },
  { tytul: 'Dolomite Towers at Dusk', kategoria: 'mountains-hiking', styl: 'Illustration' },
  { tytul: 'Glacier Valley Wide', kategoria: 'mountains-hiking', styl: 'Photography' },
  { tytul: 'Bavarian Foothills Morning', kategoria: 'mountains-hiking', styl: 'Minimalism' },
  { tytul: 'North Sea Long Shore', kategoria: 'sea-coast', styl: 'Photography' },
  { tytul: 'Baltic Dune Line', kategoria: 'sea-coast', styl: 'Minimalism' },
  { tytul: 'Cliffs Above Cold Water', kategoria: 'sea-coast', styl: 'Illustration' },
  { tytul: 'Pine Forest Panorama', kategoria: 'nature-landscapes', styl: 'Photography' },
  { tytul: 'Birch Stand in Fog', kategoria: 'nature-landscapes', styl: 'Minimalism' },
  { tytul: 'River Bend Through Meadow', kategoria: 'nature-landscapes', styl: 'Photography' },
  { tytul: 'Autumn Larch Slope', kategoria: 'nature-landscapes', styl: 'Photography' },
  { tytul: 'Wisteria Along the Wall', kategoria: 'botanical', styl: 'Illustration' },
  { tytul: 'Fern Wall Study', kategoria: 'botanical', styl: 'Photography' },
  { tytul: 'Olive Branch Spread', kategoria: 'botanical', styl: 'Line art' },
  { tytul: 'Milky Way Arch', kategoria: 'space-astronomy', styl: 'Photography' },
  { tytul: 'Nebula Field Wide', kategoria: 'space-astronomy', styl: 'Abstract' },
  { tytul: 'Lunar Phases Across', kategoria: 'space-astronomy', styl: 'Illustration' },
  { tytul: 'Berlin Skyline Long', kategoria: 'cities-travel', styl: 'Photography' },
  { tytul: 'Hamburg Harbour Line', kategoria: 'cities-travel', styl: 'Illustration' },
  { tytul: 'Bridge Span Rhythm', kategoria: 'architecture', styl: 'Photography' },
  { tytul: 'Concrete Arcade Repeat', kategoria: 'architecture', styl: 'Minimalism' },
  { tytul: 'Neon Waterfront Night', kategoria: 'cyberpunk-neon', styl: 'Illustration' },
  { tytul: 'Cranes Over Still Water', kategoria: 'animals', styl: 'Illustration' },
  { tytul: 'Horizontal Colour Fields', kategoria: 'abstract', styl: 'Abstract' },
  { tytul: 'Sand Ripple Sequence', kategoria: 'abstract', styl: 'Minimalism' },
];

/**
 * DYPTYKI — kadry kameralne, dobrze znoszace podzial na dwie rowne polowy.
 * Dwa panele to uklad symetryczny, wiec motyw powinien miec dwa bieguny
 * albo rytm, a nie jeden srodek ciezkosci.
 */
const DYPTYKI = [
  { tytul: 'Two Peaks Facing', kategoria: 'mountains-hiking', styl: 'Minimalism' },
  { tytul: 'Trail Through Snowfield', kategoria: 'mountains-hiking', styl: 'Photography' },
  { tytul: 'Tide Line Study', kategoria: 'sea-coast', styl: 'Minimalism' },
  { tytul: 'Wave Break Sequence', kategoria: 'sea-coast', styl: 'Photography' },
  { tytul: 'Reed Bed Evening', kategoria: 'nature-landscapes', styl: 'Minimalism' },
  { tytul: 'Frozen Lake Edge', kategoria: 'nature-landscapes', styl: 'Photography' },
  { tytul: 'Monstera Leaf Pair', kategoria: 'botanical', styl: 'Photography' },
  { tytul: 'Eucalyptus Stems', kategoria: 'botanical', styl: 'Line art' },
  { tytul: 'Magnolia Bough Study', kategoria: 'botanical', styl: 'Minimalism' },
  { tytul: 'Dried Grass Duo', kategoria: 'botanical', styl: 'Illustration' },
  { tytul: 'Soft Arc Balance', kategoria: 'abstract', styl: 'Abstract' },
  { tytul: 'Two Tone Horizon', kategoria: 'abstract', styl: 'Minimalism' },
  { tytul: 'Torn Paper Edges', kategoria: 'abstract', styl: 'Abstract' },
  { tytul: 'Reclining Line Pair', kategoria: 'line-art-figures', styl: 'Line art' },
  { tytul: 'Facing Profiles', kategoria: 'line-art-figures', styl: 'Line art' },
  { tytul: 'Hands Reaching Across', kategoria: 'line-art-figures', styl: 'Minimalism' },
  { tytul: 'Saturn and Moon', kategoria: 'space-astronomy', styl: 'Illustration' },
  { tytul: 'Twin Constellations', kategoria: 'zodiac-astrology', styl: 'Line art' },
  { tytul: 'Window Light Pair', kategoria: 'architecture', styl: 'Minimalism' },
  { tytul: 'Stair Shadow Study', kategoria: 'architecture', styl: 'Photography' },
  { tytul: 'Morning Yoga Light', kategoria: 'wellness-yoga', styl: 'Minimalism' },
  { tytul: 'Two Cups Warm Light', kategoria: 'coffee-tea', styl: 'Photography' },
  { tytul: 'Deer Pair in Mist', kategoria: 'animals', styl: 'Photography' },
  { tytul: 'Flight of Two Birds', kategoria: 'animals', styl: 'Line art' },
  { tytul: 'Sleeping Fox Cubs', kategoria: 'kids-nursery', styl: 'Illustration' },
];

/**
 * Tryptyki i dyptyki ida NA PRZEMIAN, a nie blokami.
 *
 * Dwa powody. Po pierwsze --ile N ma dac probke obu ukladow, a nie piec
 * tryptykow. Po drugie przebieg trwa godzinami i bywa przerywany — przy
 * ukladzie blokowym przerwanie w polowie zostawiloby 25 tryptykow i zero
 * dyptykow, czyli katalog przechylony na jedna strone.
 */
const PLAN = [];
for (let i = 0; i < Math.max(TRYPTYKI.length, DYPTYKI.length); i++) {
  if (TRYPTYKI[i]) PLAN.push({ ...TRYPTYKI[i], uklad: 'tryptyk' });
  if (DYPTYKI[i]) PLAN.push({ ...DYPTYKI[i], uklad: 'duo' });
}

function wczytajKartoteke() {
  return JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
}

(async () => {
  const inv = wczytajKartoteke();
  const istniejace = new Set(inv.posters.map((p) => String(p.title).trim().toLowerCase()));

  // Tytul musi dawac unikalny handle GLOBALNIE, nie tylko wsrod zestawow —
  // kolizja z pojedynczym plakatem nadpisalaby produkt w sklepie.
  const kolizje = PLAN.filter((z) => istniejace.has(z.tytul.trim().toLowerCase()));
  const wPlanie = {};
  for (const z of PLAN) wPlanie[z.tytul] = (wPlanie[z.tytul] || 0) + 1;
  const wewnetrzne = Object.entries(wPlanie).filter(([, n]) => n > 1);

  console.log('PLAN: ' + PLAN.length + ' zestawow  (' + TRYPTYKI.length + ' tryptykow, ' + DYPTYKI.length + ' dyptykow)');
  console.log('');

  const wgKat = {};
  const wgStyl = {};
  for (const z of PLAN) {
    wgKat[z.kategoria] = (wgKat[z.kategoria] || 0) + 1;
    wgStyl[z.styl] = (wgStyl[z.styl] || 0) + 1;
  }
  console.log('kategorie: ' + Object.entries(wgKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' x' + v).join(', '));
  console.log('style:     ' + Object.entries(wgStyl).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' x' + v).join(', '));
  console.log('');

  if (kolizje.length) {
    console.log('KOLIZJE TYTULOW z istniejacymi plakatami:');
    kolizje.forEach((z) => console.log('   ' + z.tytul));
  }
  if (wewnetrzne.length) {
    console.log('POWTORZONE TYTULY W PLANIE:');
    wewnetrzne.forEach(([t, n]) => console.log('   ' + t + ' x' + n));
  }
  if (kolizje.length || wewnetrzne.length) {
    console.log('');
    console.log('Popraw tytuly przed generowaniem — kazdy musi dac unikalny handle.');
    process.exit(1);
  }
  console.log('kontrola tytulow: OK, wszystkie unikalne');

  // Sprawdzenie kombinacji kategoria+styl. Niedozwolona para przerwalaby
  // przebieg dopiero przy swoim zestawie, po godzinie generowania.
  const { CATEGORY_STYLES } = require('../src/categoryStyles');
  const zle = PLAN.filter((z) => !(CATEGORY_STYLES[z.kategoria] || []).includes(z.styl));
  if (zle.length) {
    console.log('');
    console.log('NIEDOZWOLONE PARY kategoria+styl:');
    zle.forEach((z) => console.log('   ' + z.tytul + ': ' + z.kategoria + ' + ' + z.styl +
      '   (dozwolone: ' + (CATEGORY_STYLES[z.kategoria] || []).join(', ') + ')'));
    process.exit(1);
  }
  console.log('kontrola par kategoria+styl: OK');

  if (!zapis) {
    console.log('');
    PLAN.forEach((z, i) => {
      console.log('  ' + String(i + 1).padStart(2) + '  ' + z.uklad.padEnd(8) + z.tytul.padEnd(28) + z.kategoria.padEnd(20) + z.styl);
    });
    console.log('');
    console.log('To byl plan. Dodaj --wykonaj, zeby generowac.');
    // Tryptyk liczony po ~5 prob, dyptyk po ~1 — pomiary z pierwszych szesciu
    // zestawow. Wspolna srednia zanizalaby rachunek ponad dwukrotnie.
    const proby = TRYPTYKI.length * 5 + DYPTYKI.length * 1;
    console.log('KOSZT: ~' + proby + ' wywolan API (' + TRYPTYKI.length + ' tryptykow x ~5 prob + ' +
      DYPTYKI.length + ' dyptykow x ~1), okolo ' + Math.round((proby * 2) / 60) + ' h.');
    console.log('Tryptyk ma DWIE linie ciecia i obie musza wypasc czysto naraz — stad rozpietosc.');
    return;
  }

  const doZrobienia = (limit ? PLAN.slice(0, limit) : PLAN).filter(
    (z) => !istniejace.has(z.tytul.trim().toLowerCase())
  );
  console.log('');
  console.log('do wygenerowania: ' + doZrobienia.length);

  let ok = 0;
  let blad = 0;
  const start = Date.now();
  for (let i = 0; i < doZrobienia.length; i++) {
    const z = doZrobienia[i];
    console.log('');
    console.log(`[${i + 1}/${doZrobienia.length}] ${z.uklad} — "${z.tytul}"  (${z.kategoria} / ${z.styl})`);
    try {
      execFileSync(
        process.execPath,
        [path.join(__dirname, 'generateSet.js'),
          '--tytul', z.tytul, '--kategoria', z.kategoria, '--styl', z.styl, '--uklad', z.uklad],
        { cwd: ROOT, stdio: 'inherit' }
      );
      ok++;
      const sr = (Date.now() - start) / 1000 / ok;
      console.log(`   OK   (~${Math.round((sr * (doZrobienia.length - i - 1)) / 60)} min do konca)`);
    } catch (e) {
      blad++;
      console.error('   BLAD ' + (e && e.message ? e.message : e));
    }
  }

  console.log('');
  console.log('gotowe: ' + ok + ',  bledow: ' + blad);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
