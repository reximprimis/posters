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

const SLOWA_PUSTE = new Set(['the', 'and', 'in', 'on', 'at', 'of', 'a', 'to', 'over', 'with', 'study', 'lines']);
const znaczace = (t) =>
  new Set(String(t).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !SLOWA_PUSTE.has(w)));

const SYNONIMY = [
  ['soccer', 'football'], ['grass', 'turf', 'meadow'], ['mist', 'misty', 'fog', 'haze'],
  ['peak', 'summit', 'ridge'], ['vinyl', 'record'], ['sea', 'ocean', 'coast'],
  ['dune', 'dunes', 'sand'], ['neon', 'glow'], ['moon', 'lunar'],
];

function zbytPodobne(a, b) {
  const A = znaczace(a);
  const B = znaczace(b);
  for (const w of A) if (B.has(w)) return true;
  for (const g of SYNONIMY) if (g.some((w) => A.has(w)) && g.some((w) => B.has(w))) return true;
  return false;
}

/**
 * Tytuly, ktore filtr bezpieczenstwa OpenAI odrzuca jako tresc seksualna.
 *
 * Kategoria line-art-figures dotyczy ludzkiej sylwetki, wiec slowa nazywajace
 * cialo wprost ("torso", "reclining", "nude") wchodza w klasyfikator, mimo ze
 * prompt mowi jasno "anatomy suggested, never explicit". Decyduje sam TYTUL.
 * Sprawdzone na produkcji: "Contour Torso Study" odrzucone bledem 400.
 */
const RYZYKOWNE = /\b(torso|nude|reclining|bare|naked|intimate|lingerie)\b/i;

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
        !RYZYKOWNE.test(t) &&
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
