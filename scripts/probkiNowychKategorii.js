/**
 * Generuje po jednej probce z kazdej nowej kategorii — bez PDF, sam PNG.
 *
 * Cel jest diagnostyczny, nie produkcyjny: chcemy zobaczyc, czy opis kategorii,
 * wskazowka kierunku i pula tytulow daja sensowny obraz, ZANIM puscimy serie.
 * Typografia dostaje dwie probki, bo modele obrazu notorycznie mylą litery
 * i jedna sztuka nie wystarczy, zeby to ocenic.
 *
 *   node scripts/probkiNowychKategorii.js
 */

'use strict';

require('dotenv').config();
const PosterBatchGenerator = require('../src/posterGenerator');
const ContentGenerator = require('../src/contentGenerator');
const pools = require('../src/categoryTitlePools');
const { getAllowedStylesForCategory } = require('../src/categoryStyles');

const PULE = pools.CATEGORY_TITLE_POOLS || pools;

/** Kategoria, styl i orientacja dobrane tak, zeby probka byla reprezentatywna. */
const PROBKI = [
  { kat: 'typography-quotes', styl: 'Minimalism', tytul: 'Good Morning Lettering' },
  { kat: 'typography-quotes', styl: 'Abstract', tytul: 'One Word Breathe' },
  { kat: 'line-art-figures', styl: 'Line art', tytul: 'Single Line Portrait' },
  // Poziomo — przy okazji sprawdzamy swiezo wdrozona orientacje na produkcji.
  { kat: 'mountains-hiking', styl: 'Photography', tytul: 'Alpine Ridge Morning', orientacja: 'landscape' },
  { kat: 'bar-cocktails', styl: 'Photography', tytul: 'Coupe Glass Reflection' },
  { kat: 'zodiac-astrology', styl: 'Line art', tytul: 'Leo Constellation Chart' },
  { kat: 'fitness-gym', styl: 'Minimalism', tytul: 'Kettlebell Shadow Study' },
  { kat: 'fashion-beauty', styl: 'Illustration', tytul: 'Perfume Bottle Light' },
  { kat: 'love-romance', styl: 'Line art', tytul: 'Two Hands Entwined' },
];

(async () => {
  const gen = new PosterBatchGenerator();
  const cg = new ContentGenerator();
  const wyniki = [];

  for (let i = 0; i < PROBKI.length; i++) {
    const p = PROBKI[i];
    const nr = `[${i + 1}/${PROBKI.length}]`;
    console.log('');
    console.log(`${nr} ${p.kat} / ${p.styl} / ${p.orientacja || 'portrait'} — "${p.tytul}"`);

    const style = getAllowedStylesForCategory(p.kat);
    if (!style.includes(p.styl)) {
      console.error(`   x styl ${p.styl} niedozwolony dla ${p.kat} (dozwolone: ${style.join(', ')})`);
      wyniki.push({ ...p, blad: 'niedozwolony styl' });
      continue;
    }

    try {
      // generateImagePrompt zwraca { text }, nie { imagePrompt }. Pierwsza wersja
      // tego skryptu brala zla nazwe pola, dostawala undefined i generator
      // cichcem schodzil na prompt zapasowy — probki byly slabsze niz produkcja.
      const { text: imagePrompt } = await cg.generateImagePrompt(p.tytul, p.kat, p.styl, {});
      if (!imagePrompt) throw new Error('pusty prompt z generateImagePrompt');
      console.log(`   prompt: ${String(imagePrompt).slice(0, 100)}…`);
      const r = await gen.generateOnePoster(p.kat, p.tytul, p.styl, imagePrompt, {
        generatePdf: false,
        orientation: p.orientacja || 'portrait',
      });
      console.log(`   -> ${r.imagePath}`);
      wyniki.push({ ...p, sciezka: r.imagePath });
    } catch (e) {
      console.error(`   x ${e.message}`);
      wyniki.push({ ...p, blad: e.message });
    }
    gen.reloadDatabase();
  }

  console.log('');
  console.log('=========== PODSUMOWANIE ===========');
  for (const w of wyniki) {
    console.log((w.blad ? 'BLAD  ' : 'OK    ') + w.kat.padEnd(20) + (w.blad || w.sciezka));
  }
  const ok = wyniki.filter((w) => !w.blad).length;
  console.log('');
  console.log(ok + '/' + wyniki.length + ' probek wygenerowanych');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
