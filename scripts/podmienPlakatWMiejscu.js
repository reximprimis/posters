#!/usr/bin/env node
/**
 * Podmienia GRAFIKE zatwierdzonego plakatu, zachowujac rekord w kartotece.
 *
 * `przegenerujPlakaty.js` celowo odmawia ruszania zatwierdzonych plakatow:
 * kasuje rekord i katalog, wiec plakat wyeksportowany do sklepu straci
 * powiazanie z produktem. Tutaj id, tytul i handle zostaja nietkniete —
 * zmienia sie sam obraz i wszystko, co z niego wynika.
 *
 * Przebieg dla kazdego plakatu:
 *   1. kopia zapasowa calego katalogu do kopie_podmian/,
 *   2. nowy prompt z aktualnych builderow (estetyka odczytana ze starego promptu),
 *   3. nowy master PNG w to samo miejsce — finalizeMasterImageForPrint sam
 *      kasuje ramke, miniatury i PDF-y ramki oraz zeruje pola w rekordzie,
 *   4. skasowanie starych mockupow (nikt ich nie unieważnia, a generator
 *      pomija plakat, gdy pliki leza na dysku — zostalby stary obraz),
 *   5. odbudowa: master standard, ramka, miniatury, PDF-y pelne i ramkowe, mockupy.
 *
 * Po podmianie shopifyState schodzi na `pending_assets` — plakat trzeba
 * wyeksportowac ponownie, zeby sklep dostal nowa grafike.
 *
 *   node scripts/podmienPlakatWMiejscu.js "Tytul A" "Tytul B"
 *   node scripts/podmienPlakatWMiejscu.js --wykonaj "Tytul A"
 *   node scripts/podmienPlakatWMiejscu.js --wykonaj --estetyka=ukiyo-e "Tytul A"
 *   node scripts/podmienPlakatWMiejscu.js --wykonaj --bez-mockupow "Tytul A"
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const KOPIE = path.join(ROOT, 'kopie_podmian');

const { AESTHETICS, isKnownAesthetic } = require('../src/aesthetics');
const { tempGenerationPathFromFinal } = require('../src/safePrintFraming');

const norm = (p) => String(p || '').split('\\').join('/');
const abs = (rel) => (path.isAbsolute(rel) ? rel : path.join(ROOT, norm(rel)));

const argumenty = process.argv.slice(2);
const zapis = argumenty.includes('--wykonaj');
const bezMockupow = argumenty.includes('--bez-mockupow');
const wymuszonaEstetyka = (argumenty.find((a) => a.startsWith('--estetyka=')) || '').slice(11).trim();
const tytuly = argumenty.filter((a) => !a.startsWith('--'));

if (!tytuly.length) {
  console.error('Podaj tytuly plakatow do podmiany.');
  process.exit(1);
}
if (wymuszonaEstetyka && !isKnownAesthetic(wymuszonaEstetyka)) {
  console.error(`Nieznana estetyka: ${wymuszonaEstetyka}`);
  process.exit(1);
}

/**
 * Estetyka nie jest zapisywana w rekordzie osobnym polem — jedyny slad to
 * naglowek bloku doklejonego do promptu. Bez odczytania jej plakat zmienilby
 * przy podmianie nie tylko temat, ale i cala palete.
 * @param {string} prompt
 */
function wykryjEstetyke(prompt) {
  const m = String(prompt || '').match(/AESTHETIC OVERRIDE — ([^:\n]+):/);
  if (!m) return '';
  const etykieta = m[1].trim().toLowerCase();
  for (const a of Object.values(AESTHETICS)) {
    if (String(a.label || '').trim().toLowerCase() === etykieta) return a.id;
  }
  return '';
}

function kopiaZapasowa(katalogAbs, baza) {
  const stempel = new Date().toISOString().replace(/[:.]/g, '-');
  const cel = path.join(KOPIE, `${baza}_${stempel}`);
  fs.mkdirSync(cel, { recursive: true });
  fs.cpSync(katalogAbs, cel, { recursive: true });
  return cel;
}

function usunStareMockupy(katalogAbs) {
  let usuniete = 0;
  for (const nazwa of fs.readdirSync(katalogAbs)) {
    if (nazwa.includes('_mockup_frame') || nazwa.includes('_mockup_interior')) {
      fs.unlinkSync(path.join(katalogAbs, nazwa));
      usuniete += 1;
    }
  }
  return usuniete;
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const plan = [];

  for (const tytul of tytuly) {
    const rekord = inv.posters.find((p) => p.title === tytul);
    if (!rekord) {
      console.log('POMINIETE  ' + tytul + ' — brak w kartotece');
      continue;
    }
    if (rekord.kind === 'set') {
      console.log('POMINIETE  ' + tytul + ' — zestaw, nie pojedynczy plakat');
      continue;
    }
    const masterAbs = abs(rekord.imagePath);
    if (!fs.existsSync(masterAbs)) {
      console.log('POMINIETE  ' + tytul + ' — brak pliku ' + rekord.imagePath);
      continue;
    }
    plan.push({
      rekord,
      tytul,
      kategoria: rekord.category,
      styl: rekord.artStyle,
      orientacja: rekord.orientation || 'portrait',
      estetyka: wymuszonaEstetyka || wykryjEstetyke(rekord.prompt),
      masterAbs,
      katalogAbs: path.dirname(masterAbs),
    });
  }

  console.log('');
  for (const p of plan) {
    console.log(
      '  ' +
        p.tytul.padEnd(26) +
        p.kategoria.padEnd(20) +
        p.styl.padEnd(12) +
        p.orientacja.padEnd(10) +
        'estetyka: ' +
        (p.estetyka || '(brak)')
    );
  }
  console.log('');
  console.log('do podmiany: ' + plan.length);

  if (!zapis) {
    console.log('');
    console.log('To byla proba. Dodaj --wykonaj, zeby podmienic grafike.');
    return;
  }
  if (!plan.length) return;

  const PosterBatchGenerator = require('../src/posterGenerator');
  const ContentGenerator = require('../src/contentGenerator');
  const MockupGenerator = require('../src/mockupGenerator');
  const gen = new PosterBatchGenerator();
  const cg = new ContentGenerator();

  let ok = 0;
  let blad = 0;

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    console.log('');
    console.log(`[${i + 1}/${plan.length}] ${p.kategoria} / ${p.styl} / ${p.orientacja} — "${p.tytul}"`);
    try {
      const kopia = kopiaZapasowa(p.katalogAbs, path.basename(p.katalogAbs));
      console.log('   kopia zapasowa: ' + path.relative(ROOT, kopia));

      const wynikPromptu = await cg.generateImagePrompt(p.tytul, p.kategoria, p.styl, {
        aesthetic: p.estetyka || undefined,
      });
      const imagePrompt = wynikPromptu.text;
      if (!imagePrompt) throw new Error('pusty prompt');

      const tempPath = tempGenerationPathFromFinal(p.masterAbs);
      const { framingWarning } = await gen.generateImageWithFramingGuard(
        p.tytul,
        p.kategoria,
        p.styl,
        tempPath,
        p.masterAbs,
        {
          customPrompt: imagePrompt,
          category: p.kategoria,
          style: p.styl,
          orientation: p.orientacja,
          ...(p.rekord.printLayout && p.rekord.printLayout !== 'full'
            ? { matStyle: p.rekord.printLayout }
            : {}),
        }
      );

      const usuniete = usunStareMockupy(p.katalogAbs);
      if (usuniete) console.log(`   skasowane stare mockupy: ${usuniete}`);

      gen.reloadDatabase();
      const rek = gen.db.posters.find((x) => x.id === p.rekord.id);
      if (!rek) throw new Error('rekord zniknal z kartoteki w trakcie podmiany');
      rek.prompt = imagePrompt;
      rek.promptLlmProvider = wynikPromptu.promptLlm.promptLlmProvider;
      rek.promptLlmModel = wynikPromptu.promptLlm.promptLlmModel;
      rek.promptLlmLabel = wynikPromptu.promptLlm.promptLlmLabel;
      rek.regeneratedAt = new Date().toISOString();
      if (framingWarning) rek.framingWarning = framingWarning;
      else delete rek.framingWarning;
      delete rek.mockups;
      gen.saveDatabase();

      // Kolejnosc jak przy zatwierdzaniu w panelu (preview.js).
      await gen.enforceMasterStandardForPosterId(p.rekord.id);
      await gen.applyUniformFrameForPosterId(p.rekord.id);
      await gen.applyShopThumbnailsForPosterId(p.rekord.id);
      await gen.applyFullPrintPdfsForPosterId(p.rekord.id);
      await gen.applyFramedPrintPdfsForPosterId(p.rekord.id);

      if (!bezMockupow) {
        if (!process.env.OPENAI_API_KEY) {
          console.log('   mockupy pominiete — brak OPENAI_API_KEY');
        } else {
          const mg = new MockupGenerator();
          const slug = p.tytul.trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
          const { frame, interior } = await mg.generate(p.masterAbs, p.katalogAbs, slug, {
            category: p.kategoria,
            title: p.tytul,
            orientation: p.orientacja,
          });
          gen.reloadDatabase();
          const rek2 = gen.db.posters.find((x) => x.id === p.rekord.id);
          if (rek2) {
            rek2.mockups = {
              frame: path.relative(ROOT, frame).split('\\').join('/'),
              interior: path.relative(ROOT, interior).split('\\').join('/'),
              generatedAt: new Date().toISOString(),
            };
            gen.saveDatabase();
          }
        }
      }

      ok++;
      console.log('   OK');
    } catch (e) {
      blad++;
      console.error('   BLAD ' + (e && e.message ? e.message : e));
    }
    gen.reloadDatabase();
  }

  console.log('');
  console.log('gotowe: ' + ok + ',  bledow: ' + blad);
  console.log('Plakaty z podmieniona grafika wymagaja ponownego eksportu do Shopify.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
