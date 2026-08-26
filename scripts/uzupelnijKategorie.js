/**
 * Rozdziela zadana liczbe plakatow po kategoriach, zaczynajac od najchudszych.
 *
 * Nastepca uzupelnijChudeKategorie.js, ktory mial plan zaszyty na sztywno.
 * Tutaj podaje sie liczbe, a skrypt sam decyduje, gdzie ich najbardziej brakuje.
 *
 * TRZY ZASADY, ktore wynikaja z wczesniejszych przebiegow:
 *
 * 1. ESTETYKA ZAWSZE. Przebieg bez estetyki dal 6 na 9 plakatow w jednym
 *    kubelku koloru — cala biblioteka ma ten sam przechyl w bez i braz.
 *    Estetyka rozbija palete, ale musi pasowac do kategorii: ukiyo-e w silowni
 *    wyglada absurdalnie, dlatego kazda kategoria ma wlasna liste.
 *
 * 2. STYL I ESTETYKA ROTUJA. Dwa plakaty z tej samej kategorii nie moga dostac
 *    tej samej pary, bo wychodza warianty jednego obrazu.
 *
 * 3. TYTULY NIE MOGA SIE POWTARZAC TEMATEM. Pula podaje je po kolei, a sasiednie
 *    bywaja bliskoznaczne ("Soccer Ball on Grass" i "Football on Turf" to jeden
 *    plakat w dwoch nazwach). Wczesniej kasowalismy takie blizniaki recznie.
 *
 *   node scripts/uzupelnijKategorie.js 50            — plan dla 50 plakatow
 *   node scripts/uzupelnijKategorie.js 50 --wykonaj  — generowanie
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const PosterBatchGenerator = require('../src/posterGenerator');
const ContentGenerator = require('../src/contentGenerator');
const { getAllowedStylesForCategory } = require('../src/categoryStyles');
const { CATEGORIES } = require('../src/taxonomy');
const pools = require('../src/categoryTitlePools');

const PULE = pools.CATEGORY_TITLE_POOLS || pools;
const INVENTORY = path.join(__dirname, '..', 'posters_inventory.json');
const ILE = Number(process.argv[2]) || 20;
const zapis = process.argv.includes('--wykonaj');

/** Kategorie prowadzone recznie — generator ich nie dotyka. */
const POMIJANE = new Set(['club-orzel']);

const { ESTETYKI, LUBIA_POZIOM } = require('../src/categoryAesthetics');

const { zbytPodobne } = require('../src/podobneTytuly');

/**
 * Tytuly odrzucane przez filtr bezpieczenstwa dostawcy oraz obiecujace
 * konkretny istniejacy obiekt i cudze znaki towarowe — wszystko z jednego
 * modulu. Ten skrypt mial WLASNA, wezsza kopie listy slow (bez
 * "silhouette of a woman"), wiec przepuszczal tytuly, ktore drugi skrypt
 * planujacy zatrzymywal. Nie mial tez w ogole blokady znakow towarowych.
 */
const { ocenTytul } = require('../src/realneObiekty');

function zbudujPlan(ile) {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const uzyte = new Set(inv.posters.map((p) => String(p.title || '').toLowerCase()));
  const licz = {};
  inv.posters.filter((p) => p.kind !== 'set').forEach((p) => (licz[p.category] = (licz[p.category] || 0) + 1));

  const kategorie = CATEGORIES.filter((c) => !POMIJANE.has(c.key)).map((c) => c.key);
  const stan = {};
  for (const k of kategorie) {
    stan[k] = {
      ile: licz[k] || 0,
      wziete: [],
      style: getAllowedStylesForCategory(k),
      estetyki: ESTETYKI[k] && ESTETYKI[k].length ? ESTETYKI[k] : [''],
      i: 0,
    };
  }

  const plan = [];
  const odrzucone = [];

  while (plan.length < ile) {
    // Zawsze najchudsza kategoria — dzieki temu rozklad sam sie wyrownuje.
    const k = kategorie
      .filter((x) => stan[x].style.length)
      .sort((a, b) => stan[a].ile - stan[b].ile || a.localeCompare(b))[0];
    if (!k) break;
    const s = stan[k];

    const wolne = (PULE[k] || []).filter(
      (t) =>
        !uzyte.has(t.toLowerCase()) &&
        !ocenTytul(t).ryzyko &&
        !s.wziete.some((w) => zbytPodobne(w, t))
    );
    if (!wolne.length) {
      odrzucone.push(k + ' (brak wolnych tytulow)');
      s.style = []; // wypada z puli kandydatow
      continue;
    }

    const tytul = wolne[0];
    uzyte.add(tytul.toLowerCase());
    s.wziete.push(tytul);

    const styl = s.style[s.i % s.style.length];
    const estetyka = s.estetyki[s.i % s.estetyki.length];
    // Poziom co trzeci plakat w kategoriach, ktorym to sluzy.
    const orientacja = LUBIA_POZIOM.has(k) && s.i % 3 === 1 ? 'landscape' : 'portrait';

    plan.push({ kat: k, styl, estetyka, tytul, orientacja });
    s.i++;
    s.ile++;
  }

  return { plan, odrzucone };
}

(async () => {
  const { plan, odrzucone } = zbudujPlan(ILE);

  const wgKat = {};
  plan.forEach((p) => (wgKat[p.kat] = (wgKat[p.kat] || 0) + 1));
  const wgEst = {};
  plan.forEach((p) => (wgEst[p.estetyka || '—'] = (wgEst[p.estetyka || '—'] || 0) + 1));

  console.log('PLAN: ' + plan.length + ' plakatow w ' + Object.keys(wgKat).length + ' kategoriach');
  console.log('');
  for (const p of plan) {
    console.log(
      '  ' + p.kat.padEnd(24) + p.styl.padEnd(14) + (p.estetyka || '—').padEnd(14) +
      p.orientacja.padEnd(11) + p.tytul
    );
  }
  console.log('');
  console.log('na kategorie: ' + Object.entries(wgKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ×' + v).join(', '));
  console.log('estetyki:     ' + Object.entries(wgEst).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ×' + v).join(', '));
  console.log('poziomych:    ' + plan.filter((p) => p.orientacja === 'landscape').length);
  if (odrzucone.length) console.log('pominiete:    ' + odrzucone.join(', '));

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
    console.log('');
    console.log(`[${i + 1}/${plan.length}] ${p.kat} / ${p.styl} / ${p.estetyka || 'bez estetyki'} / ${p.orientacja} — "${p.tytul}"`);
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
