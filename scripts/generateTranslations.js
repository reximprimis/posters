/**
 * Generowanie tresci sprzedazowej w jezykach innych niz angielski.
 *
 * Tlumaczenia powstaja TUTAJ, a nie przy eksporcie. Dzieki temu eksport
 * zostaje operacja czysta i offline, tresc mozna przejrzec i poprawic przed
 * publikacja, a za wygenerowanie placi sie raz, nie przy kazdym pliku.
 *
 * Zapisuje wylacznie pole translations[jezyk] — pola zrodlowe (title,
 * shopDescription) pozostaja nietkniete, wiec eksport Shopify nic nie zauwaza.
 *
 * Uzycie:
 *   node scripts/generateTranslations.js --lang=pl                 (wszystkie brakujace)
 *   node scripts/generateTranslations.js --lang=pl --limit=5       (tylko kilka)
 *   node scripts/generateTranslations.js --lang=pl --id=<posterId> (jeden plakat)
 *   node scripts/generateTranslations.js --lang=pl --force         (nadpisz istniejace)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const ContentGenerator = require('../src/contentGenerator');
const { setTranslation, normalizeLanguage, translationCoverage } = require('../src/translations');

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'posters_inventory.json');

function parseArgs(argv) {
  const out = { lang: 'pl', limit: 0, id: '', force: false };
  for (const raw of argv) {
    const a = String(raw || '').trim();
    if (a === '--force') out.force = true;
    else if (a.startsWith('--lang=')) out.lang = a.slice('--lang='.length);
    else if (a.startsWith('--limit=')) out.limit = parseInt(a.slice('--limit='.length), 10) || 0;
    else if (a.startsWith('--id=')) out.id = a.slice('--id='.length);
  }
  return out;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const lang = normalizeLanguage(cli.lang);
  if (lang === 'en') throw new Error('Angielski jest źródłem — nie tłumaczymy go.');

  if (!fs.existsSync(inventoryPath)) throw new Error('Brak posters_inventory.json');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const all = Array.isArray(inventory.posters) ? inventory.posters : [];

  let cele = all.filter((p) => p && p.approvedForPrint === true);
  if (cli.id) cele = cele.filter((p) => p.id === cli.id);
  if (!cli.force) {
    cele = cele.filter((p) => {
      const t = p.translations && p.translations[lang];
      return !(t && String(t.description || '').trim());
    });
  }
  if (cli.limit > 0) cele = cele.slice(0, cli.limit);

  const przed = translationCoverage(all.filter((p) => p.approvedForPrint === true), lang);
  console.log(`Język: ${lang} | pokrycie przed: ${przed.translated}/${przed.total}`);
  console.log(`Do wygenerowania: ${cele.length}\n`);
  if (!cele.length) {
    console.log('Nic do zrobienia.');
    return;
  }

  const cg = new ContentGenerator();
  if (!cg.resolveLlmProvider(null)) throw new Error('Brak skonfigurowanego dostawcy LLM (OPENAI_API_KEY).');

  let zapisane = 0;
  let bledy = 0;
  for (let i = 0; i < cele.length; i++) {
    const p = cele[i];
    process.stdout.write(`[${i + 1}/${cele.length}] ${p.title} … `);
    try {
      const wynik = await cg.generateLocalizedListing({
        title: p.title,
        category: p.category,
        style: p.artStyle,
        description: p.shopDescription,
        language: lang,
      });
      if (!wynik.description) {
        console.log('POMINIĘTO (pusta odpowiedź)');
        bledy += 1;
        continue;
      }
      setTranslation(p, lang, wynik);
      zapisane += 1;
      console.log(`OK — „${wynik.name}”`);
      // Zapis po kazdej pozycji: przerwany przebieg nie traci tego, co juz gotowe.
      fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf8');
    } catch (err) {
      console.log(`BŁĄD: ${err.message}`);
      bledy += 1;
    }
  }

  const po = translationCoverage(all.filter((p) => p.approvedForPrint === true), lang);
  console.log(`\nZapisane: ${zapisane} | błędy: ${bledy}`);
  console.log(`Pokrycie po: ${po.translated}/${po.total} (brakuje ${po.missing})`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
