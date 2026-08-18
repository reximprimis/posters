/**
 * Dogenerowuje po dwa plakaty w kategoriach, ktore maja ich najmniej.
 *
 * DLACZEGO ESTETYKI SA DOBRANE, A NIE LOSOWE: przebieg bez estetyki dal
 * 6 na 9 plakatow w kubelku "beige" — ten sam przechyl ma cala biblioteka.
 * Estetyka rozbija palete, ale losowa rotacja potrafi wsadzic ukiyo-e do
 * silowni. Dlatego kazda kategoria ma dwie pasujace do niej estetyki,
 * rozne miedzy soba, zeby dwa plakaty z tej samej kategorii nie wyszly
 * bliznniacze.
 *
 * Styl tez jest rozny w parze — inaczej dostajemy dwa warianty tego samego.
 *
 * PDF-ow NIE generujemy: powstaja przy zatwierdzeniu, a te plakaty najpierw
 * trzeba obejrzec.
 *
 *   node scripts/uzupelnijChudeKategorie.js             — plan
 *   node scripts/uzupelnijChudeKategorie.js --wykonaj   — generowanie
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const PosterBatchGenerator = require('../src/posterGenerator');
const ContentGenerator = require('../src/contentGenerator');
const { getAllowedStylesForCategory } = require('../src/categoryStyles');
const pools = require('../src/categoryTitlePools');

const PULE = pools.CATEGORY_TITLE_POOLS || pools;
const INVENTORY = path.join(__dirname, '..', 'posters_inventory.json');
const zapis = process.argv.includes('--wykonaj');

/**
 * Estetyki dobrane do kategorii — dwie rozne na kategorie.
 * Pusty ciag = bez estetyki, gdy kategoria ma juz wlasna mocna tozsamosc
 * (neon w gamingu nie potrzebuje nadpisania palety).
 */
const PLAN = {
  'ai-technology': [['Abstract', 'bauhaus'], ['Line art', 'black-white']],
  'bar-cocktails': [['Illustration', 'mid-century'], ['Photography', 'quiet-luxury']],
  'cities-travel': [['Illustration', 'exhibition'], ['Photography', 'black-white']],
  'fashion-beauty': [['Illustration', 'quiet-luxury'], ['Line art', 'black-white']],
  'fitness-gym': [['Photography', 'black-white'], ['Minimalism', 'bauhaus']],
  'gaming-esports': [['Illustration', ''], ['Abstract', 'bauhaus']],
  'line-art-figures': [['Line art', 'black-white'], ['Minimalism', 'japandi']],
  'love-romance': [['Illustration', 'ukiyo-e'], ['Line art', 'japandi']],
  'mountains-hiking': [['Photography', 'exhibition'], ['Illustration', 'scandi']],
  'music-sound': [['Abstract', 'mid-century'], ['Line art', 'bauhaus']],
  'nature-landscapes': [['Photography', 'wabi-sabi'], ['Minimalism', 'exhibition']],
  'space-astronomy': [['Illustration', 'exhibition'], ['Abstract', 'black-white']],
  'sports-hobbies': [['Illustration', 'bauhaus'], ['Photography', 'mid-century']],
  'typography-quotes': [['Abstract', 'exhibition'], ['Minimalism', 'bauhaus']],
  'zodiac-astrology': [['Illustration', 'exhibition'], ['Line art', 'ukiyo-e']],
};

/**
 * Poziome plakaty. Biblioteka ma ich tylko trzy, a klienci lubia wybor —
 * gory i miasta w poziomie maja sens same z siebie.
 */
const POZIOME = new Set(['mountains-hiking:0', 'cities-travel:0']);

/** Slowa, ktore nie swiadcza o temacie — nie liczymy ich przy porownaniu. */
const SLOWA_PUSTE = new Set([
  'the', 'and', 'in', 'on', 'at', 'of', 'a', 'to', 'over', 'with', 'study', 'lines',
]);

const znaczace = (tytul) =>
  new Set(
    String(tytul).toLowerCase().split(/[^a-z]+/)
      .filter((w) => w.length > 2 && !SLOWA_PUSTE.has(w))
  );

/**
 * Czy dwa tytuly mowia o tym samym.
 *
 * Pula bierze tytuly po kolei, a te ulozone obok siebie bywaja bliskoznaczne:
 * "Soccer Ball on Grass" i "Football on Turf" to jeden plakat w dwoch nazwach.
 * Wczoraj kasowalismy wlasnie takie blizniaki, wiec lepiej ich nie tworzyc.
 */
function zbytPodobne(a, b) {
  const A = znaczace(a);
  const B = znaczace(b);
  for (const w of A) if (B.has(w)) return true;
  // Synonimy, ktorych porownanie slow nie zlapie.
  const SYN = [
    ['soccer', 'football'], ['grass', 'turf', 'meadow'], ['mist', 'misty', 'fog'],
    ['peak', 'summit', 'ridge'], ['vinyl', 'record'], ['sea', 'ocean'],
  ];
  for (const grupa of SYN) {
    if (grupa.some((w) => A.has(w)) && grupa.some((w) => B.has(w))) return true;
  }
  return false;
}

function zbudujPlan() {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const uzyte = new Set(inv.posters.map((p) => String(p.title || '').toLowerCase()));
  const plan = [];

  for (const [kat, pary] of Object.entries(PLAN)) {
    const wolne = (PULE[kat] || []).filter((t) => !uzyte.has(t.toLowerCase()));
    const dozwolone = getAllowedStylesForCategory(kat);
    const wziete = [];

    pary.forEach(([styl, estetyka], i) => {
      // Bierzemy pierwszy wolny tytul, ktory nie powtarza tematu poprzedniego
      // z tej samej kategorii.
      const tytul = wolne.find(
        (t) => !uzyte.has(t.toLowerCase()) && !wziete.some((w) => zbytPodobne(w, t))
      );
      if (!tytul) {
        console.warn(`  ! ${kat}: brak wolnego tytulu na pozycje ${i + 1}`);
        return;
      }
      wziete.push(tytul);
      if (!dozwolone.includes(styl)) {
        console.warn(`  ! ${kat}: styl ${styl} niedozwolony (${dozwolone.join(', ')})`);
        return;
      }
      // Rezerwujemy tytul juz na etapie planu, zeby dwie pozycje z tej samej
      // kategorii nie dostaly tego samego.
      uzyte.add(tytul.toLowerCase());
      plan.push({
        kat,
        styl,
        estetyka,
        tytul,
        orientacja: POZIOME.has(`${kat}:${i}`) ? 'landscape' : 'portrait',
      });
    });
  }
  return plan;
}

(async () => {
  const plan = zbudujPlan();
  console.log('');
  console.log('PLAN (' + plan.length + ' plakatow):');
  for (const p of plan) {
    console.log(
      '  ' + p.kat.padEnd(20) + p.styl.padEnd(14) +
      (p.estetyka || '—').padEnd(14) + p.orientacja.padEnd(11) + p.tytul
    );
  }
  const est = {};
  plan.forEach((p) => (est[p.estetyka || '—'] = (est[p.estetyka || '—'] || 0) + 1));
  console.log('');
  console.log('rozklad estetyk: ' + Object.entries(est).map(([k, v]) => k + ' ×' + v).join(', '));
  console.log('poziomych: ' + plan.filter((p) => p.orientacja === 'landscape').length);

  if (!zapis) {
    console.log('');
    console.log('To byl plan. Dodaj --wykonaj, zeby generowac.');
    return;
  }

  const gen = new PosterBatchGenerator();
  const cg = new ContentGenerator();
  let ok = 0;
  let blad = 0;
  const start = Date.now();

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const nr = `[${i + 1}/${plan.length}]`;
    console.log('');
    console.log(`${nr} ${p.kat} / ${p.styl} / ${p.estetyka || 'bez estetyki'} / ${p.orientacja} — "${p.tytul}"`);
    try {
      const { text: imagePrompt } = await cg.generateImagePrompt(p.tytul, p.kat, p.styl, {
        aesthetic: p.estetyka || undefined,
      });
      if (!imagePrompt) throw new Error('pusty prompt');
      await gen.generateOnePoster(p.kat, p.tytul, p.styl, imagePrompt, {
        generatePdf: false,
        orientation: p.orientacja,
        aesthetic: p.estetyka || undefined,
      });
      ok++;
      const sr = (Date.now() - start) / 1000 / ok;
      console.log(`   OK   (~${Math.round((sr * (plan.length - i - 1)) / 60)} min do konca)`);
    } catch (e) {
      blad++;
      console.error(`   BLAD ${e.message}`);
    }
    gen.reloadDatabase();
  }

  console.log('');
  console.log('gotowe: ' + ok + ',  bledow: ' + blad);
})().catch((e) => { console.error(e); process.exit(1); });
