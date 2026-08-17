/**
 * Przenosi KOD z polskich nazw kategorii na angielskie klucze taksonomii.
 *
 * Podmiana jest strukturalna, nie tekstowa. Slepy find/replace zniszczylby
 * kod, bo te same slowa wystepuja w zupelnie innych rolach:
 *
 *   'Retro Radio Cabinet'          <- TYTUL plakatu, nie kategoria
 *   buildRetroPhotographyPrompt    <- nazwa funkcji
 *   'Retro travel-poster illustr…' <- angielska proza w promcie
 *
 * Dlatego ruszamy wylacznie trzy klasy, w ktorych nazwa NA PEWNO jest
 * kategoria (nazwa domknieta cudzyslowem albo dwukropkiem):
 *
 *   1. napis w cudzyslowie      'Botanika'          -> 'botanical'
 *   2. goly klucz obiektu       Botanika:           -> 'botanical':
 *   3. klucz zlozony            'Botanika|Photography' -> 'botanical|Photography'
 *
 * Uwaga na klasa 2: nowe klucze maja myslnik (ai-technology), wiec NIE moga
 * byc golymi kluczami JS — musza isc w cudzyslowie.
 *
 * "Japonia" nie ma odpowiednika, bo rozpada sie na cztery kategorie. Jej
 * wpisy sa tylko RAPORTOWANE — usuwa sie je recznie, bo kazdy wymaga decyzji.
 *
 *   node scripts/migrujTaksonomieKod.js             — proba
 *   node scripts/migrujTaksonomieKod.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { CATEGORIES } = require('../src/taxonomy');

const ROOT = path.join(__dirname, '..');
const zapis = process.argv.includes('--wykonaj');

const PLIKI = [
  'src/categoryPromptModes.js', 'src/categoryStyles.js', 'src/categoryTitlePools.js',
  'src/contentGenerator.js', 'src/mockupInteriorScenes.js', 'src/newSalesCategoryPrompts.js',
  'src/posterPromptLayers.js', 'src/promptBuilders.js', 'src/promptRouter.js',
  'src/safePrintFraming.js', 'src/setRoomBackgrounds.js', 'src/shopifyState.js',
  'src/titleSubjectConsistency.js', 'src/salesCategoryPrompts.js', 'src/childrenPosterPrompts.js',
  'src/minimalismSubject.js', 'src/marketplaceExport.js',
  'index.js', 'preview.js', 'public/index.html',
  'scripts/validateCategoryStyles.js', 'scripts/testAesthetics.js',
  'scripts/testDuplicateGuard.js', 'scripts/testMarketplaces.js',
  'scripts/runPosterQualityTest.js', 'scripts/resumeQualityTestGeneration.js',
];

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pary polska nazwa -> klucz; najdluzsze pierwsze, zeby krotsza nie zjadla fragmentu dluzszej. */
const PARY = [];
for (const c of CATEGORIES) {
  for (const pl of c.legacyPl) PARY.push({ pl, key: c.key });
}
PARY.sort((a, b) => b.pl.length - a.pl.length);

/** Nazwy jednowyrazowe sa wieloznaczne — poza struktura ich nie ruszamy. */
const wieloczlonowa = (pl) => pl.trim().includes(' ');

let podmianRazem = 0;
let japoniaRazem = 0;
const raport = [];

for (const plik of PLIKI) {
  const abs = path.join(ROOT, plik);
  if (!fs.existsSync(abs)) continue;
  let tekst = fs.readFileSync(abs, 'utf8');
  const przed = tekst;
  let wPliku = 0;

  for (const { pl, key } of PARY) {
    const n = esc(pl);

    // 1. napis w cudzyslowie — pojedynczym lub podwojnym
    tekst = tekst.replace(new RegExp("'" + n + "'", 'g'), () => { wPliku++; return "'" + key + "'"; });
    tekst = tekst.replace(new RegExp('"' + n + '"', 'g'), () => { wPliku++; return '"' + key + '"'; });

    // 3. klucz zlozony 'Kategoria|Styl' — robiony przed golym kluczem,
    //    bo tez zaczyna sie cudzyslowem
    tekst = tekst.replace(new RegExp("'" + n + "\\|", 'g'), () => { wPliku++; return "'" + key + '|'; });

    // 2. goly klucz obiektu na poczatku linii -> zawsze w cudzyslowie,
    //    bo klucze z myslnikiem nie sa poprawnymi identyfikatorami JS
    tekst = tekst.replace(new RegExp('^(\\s*)' + n + ':', 'gm'), (_, sp) => { wPliku++; return sp + "'" + key + "':"; });

    // Komentarze i etykiety logow — tylko dla nazw wieloczlonowych, bo one
    // nie moga trafic przypadkiem w tytul plakatu ani nazwe funkcji.
    if (wieloczlonowa(pl)) {
      tekst = tekst.replace(new RegExp(n, 'g'), () => { wPliku++; return key; });
    }
  }

  // "Japonia" — tylko raport, nie ruszamy
  const jap = (tekst.match(/Japonia/g) || []).length;
  japoniaRazem += jap;

  if (tekst !== przed) {
    podmianRazem += wPliku;
    raport.push({ plik, podmian: wPliku, japonia: jap });
    if (zapis) fs.writeFileSync(abs, tekst, 'utf8');
  } else if (jap) {
    raport.push({ plik, podmian: 0, japonia: jap });
  }
}

console.log('PODMIANY W KODZIE:');
for (const r of raport) {
  console.log(
    '   ' + String(r.podmian).padStart(4) + '  ' + r.plik +
    (r.japonia ? '   [Japonia x' + r.japonia + ' — do recznego usuniecia]' : '')
  );
}
console.log('');
console.log('razem podmian: ' + podmianRazem + ',  wystapien "Japonia" do recznej decyzji: ' + japoniaRazem);

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
}
