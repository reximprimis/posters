/**
 * Generowanie zestawu (dyptyk / tryptyk) z wiersza polecen.
 *
 *   node scripts/generateSet.js --tytul "Misty Lake at Dawn" --kategoria Japonia --styl Illustration
 *   node scripts/generateSet.js --tytul "..." --kategoria Japonia --styl Illustration --uklad duo
 *   node scripts/generateSet.js --tytul "..." --kategoria Japonia --styl Illustration --bez-pdf
 *
 * UWAGA: wywoluj przez `node`, nie `npm run set --`. Na Windows npm gubi flagi
 * przekazane po podwojnym mysliniku i do skryptu docieraja same wartosci.
 *
 * Przebieg: panorama -> kontrola linii ciecia (powtarza az do czystego) -> panele
 * -> piec wizualizacji -> PDF-y kazdego panelu -> zapis do kartoteki.
 *
 * KOSZT: kazda proba panoramy to okolo 2 minuty i platne wywolanie API. Limit prob
 * ustawia SET_CUT_MAX_ATTEMPTS (domyslnie 8).
 */

const path = require('path');
require('dotenv').config({ quiet: true });

const ImageGen = require('../src/dalleImageGenerator');
const PdfGenerator = require('../src/pdfGenerator');
const { generateSet, buildSetPdfs, saveSetToInventory } = require('../src/posterSetGenerator');
const { toPosterHandle } = require('../src/posterTitle');
const { buildSetDescription } = require('../src/setDescription');

const ROOT = path.join(__dirname, '..');

function arg(nazwa, domyslna) {
  const i = process.argv.indexOf(`--${nazwa}`);
  if (i < 0) return domyslna;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

(async () => {
  const motyw = arg('tytul');
  const category = arg('kategoria');
  const style = arg('styl');
  const layout = String(arg('uklad', 'tryptyk'));
  const aesthetic = String(arg('estetyka', ''));
  // PDF-y NIE powstaja przy generowaniu — dopiero po zatwierdzeniu do druku
  // w aplikacji. Tryptyk to 18 plikow i okolo minuty pracy, a wiekszosc zestawow
  // odpada na ogladzie. --z-pdf wymusza je od razu, gdy wiadomo, ze zestaw wchodzi.
  const zPdf = !!arg('z-pdf', false);

  if (!motyw || !category || !style) {
    console.error('Brakuje argumentow. Przyklad:');
    console.error('  node scripts/generateSet.js --tytul "Misty Lake at Dawn" --kategoria Japonia --styl Illustration');
    console.error('  (nie uzywaj `npm run set --` — na Windows npm gubi flagi)');
    console.error('');
    console.error('  --uklad tryptyk|duo   (domyslnie tryptyk)');
    console.error('  --estetyka japandi    (domyslnie bez estetyki)');
    console.error('  --z-pdf               (PDF-y od razu; domyslnie po zatwierdzeniu do druku)');
    process.exit(1);
  }

  const fs = require('fs');
  const invPath = path.join(ROOT, 'posters_inventory.json');
  const inv = fs.existsSync(invPath) ? JSON.parse(fs.readFileSync(invPath, 'utf8')) : { posters: [] };

  // Tytul zestawu to SAM MOTYW, bez etykiety "Set of 3 Prints".
  //
  // Liczbe sztuk niesie badge na karcie produktu i pierwszy akapit opisu, wiec
  // tytul nie musi jej powtarzac — krotsza nazwa lepiej czyta sie w wynikach
  // wyszukiwania i na siatce kolekcji.
  //
  // Cena: handle zestawu jest teraz taki sam, jaki mialby plakat o tym motywie.
  // Guard ponizej to wylapie i zablokuje generowanie, gdyby motyw byl juz zajety.
  const tytulZestawu = motyw;

  console.log(`Zestaw: ${tytulZestawu}`);
  console.log(`  kategoria ${category} · styl ${style}${aesthetic ? ' · estetyka ' + aesthetic : ''}`);
  console.log('');

  const t0 = Date.now();
  const record = await generateSet({
    projectRoot: ROOT,
    imageGen: new ImageGen(),
    category,
    style,
    title: tytulZestawu,
    // Do promptu idzie sam motyw — inaczej model maluje "Set of 3 Prints".
    subjectTitle: motyw,
    aesthetic,
    layout,
    existingPosters: inv.posters,
    onProgress: (p) => {
      if (p.phase === 'generate') console.log(`  [proba ${p.attempt}/${p.maxAttempts}] panorama ...`);
      else if (p.phase === 'inspect') console.log(`  [proba ${p.attempt}] sprawdzam linie ciecia ...`);
      else console.log(`  ${p.phase} ...`);
    },
  });

  record.shopDescription = buildSetDescription({ layout, motyw });

  if (zPdf) {
    await buildSetPdfs({
      projectRoot: ROOT,
      pdfGen: new PdfGenerator(),
      record,
      onProgress: (p) => console.log(`  PDF panel ${p.panel}/${p.total} ...`),
    });
  }

  saveSetToInventory(ROOT, record);

  const min = Math.round((Date.now() - t0) / 6000) / 10;
  console.log('');
  console.log(`GOTOWE w ${min} min`);
  console.log(`  prob panoramy: ${record.setMeta.attempts} (odrzuconych ${record.setMeta.rejectedAttempts})`);
  console.log(`  panele:        ${record.panelCount}`);
  console.log(`  wizualizacje:  packshot, salon, salon 2, arkusze`);
  console.log(`  PDF-y:         ${zPdf ? record.panelCount * 6 : 'po zatwierdzeniu do druku'}`);
  console.log('');
  console.log('  Zestaw jest w bibliotece jako JEDEN kafelek, niezatwierdzony do druku.');
  console.log('  Obejrzyj go w aplikacji i dopiero tam zatwierdz — pliki do druku');
  console.log('  powstana automatycznie po zatwierdzeniu.');
})().catch((e) => {
  console.error('BLAD:', e.message);
  process.exit(1);
});
