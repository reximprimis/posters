/**
 * Przebieg kontrolny: poprawiona sciezka promptu + rotacja estetyk.
 *
 * Pierwsza partia probek wyszla w 6 na 9 bezowa, bo szla bez estetyki i bez
 * bogatego promptu z routera. Ten przebieg sprawdza dwie rzeczy naraz:
 *   1. czy prompt z routera daje wyrazniejszy efekt niz zapasowy,
 *   2. czy os estetyk realnie rozbija palete.
 *
 * Estetyki dobrane pod maksymalny rozjazd kolorow — jesli po tym przebiegu
 * kolory nadal beda bezowe, problem jest glebiej niz w doborze estetyki.
 *
 *   node scripts/probkiKontrolne.js
 */

'use strict';

require('dotenv').config();
const PosterBatchGenerator = require('../src/posterGenerator');
const ContentGenerator = require('../src/contentGenerator');
const { getAllowedStylesForCategory } = require('../src/categoryStyles');

const PROBKI = [
  // Typografia w Abstract — styl, ktory w pierwszej partii wypadl lepiej.
  { kat: 'typography-quotes', styl: 'Abstract', tytul: 'Stay Wild Script', est: 'bauhaus' },
  { kat: 'line-art-figures', styl: 'Line art', tytul: 'Two Faces Meeting', est: 'black-white' },
  { kat: 'bar-cocktails', styl: 'Illustration', tytul: 'Negroni Orange Twist', est: 'mid-century' },
  { kat: 'zodiac-astrology', styl: 'Minimalism', tytul: 'Scorpio Star Lines', est: 'exhibition' },
  { kat: 'love-romance', styl: 'Illustration', tytul: 'Embrace In Shadow', est: 'ukiyo-e' },
];

(async () => {
  const gen = new PosterBatchGenerator();
  const cg = new ContentGenerator();
  const wyniki = [];

  for (let i = 0; i < PROBKI.length; i++) {
    const p = PROBKI[i];
    console.log('');
    console.log(`[${i + 1}/${PROBKI.length}] ${p.kat} / ${p.styl} / estetyka: ${p.est} — "${p.tytul}"`);

    if (!getAllowedStylesForCategory(p.kat).includes(p.styl)) {
      console.error('   x niedozwolony styl');
      wyniki.push({ ...p, blad: 'niedozwolony styl' });
      continue;
    }
    try {
      const { text: imagePrompt, aesthetic } = await cg.generateImagePrompt(p.tytul, p.kat, p.styl, {
        aesthetic: p.est,
      });
      if (!imagePrompt) throw new Error('pusty prompt');
      if (aesthetic !== p.est) throw new Error('estetyka nie doszla: ' + aesthetic);
      const r = await gen.generateOnePoster(p.kat, p.tytul, p.styl, imagePrompt, {
        generatePdf: false,
        orientation: 'portrait',
        aesthetic: p.est,
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
  wyniki.forEach((w) => console.log((w.blad ? 'BLAD  ' : 'OK    ') + w.kat.padEnd(20) + w.est.padEnd(13) + (w.blad || 'ok')));
  console.log('');
  console.log(wyniki.filter((w) => !w.blad).length + '/' + wyniki.length + ' probek kontrolnych');
})().catch((e) => { console.error(e); process.exit(1); });
