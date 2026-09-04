/**
 * Przywraca w kartotece wpisy mockupow, ktorych PLIKI istnieja na dysku.
 *
 * WYSCIG ZAPISOW, ktory to powoduje. Pipeline zasobow (PATCH bulk-approval)
 * trzyma kartoteke w PAMIECI przez caly dlugi przebieg i zapisuje ja na koniec.
 * Endpoint od mockupow czyta kartoteke z DYSKU przy kazdym wywolaniu i od razu
 * zapisuje. Gdy mockupy ida w trakcie pipeline'u, jego koncowy zapis nadpisuje
 * wszystko, co mockupy w miedzyczasie dopisaly.
 *
 * Objaw jest mylacy: skrypt mockupow konczy "gotowe: 28, bledow: 0", pliki
 * leza na dysku, a licznik pokazuje brak. Za pierwszym razem uznalem to za
 * stan przejsciowy, bo skrypt jeszcze pracowal i dopisywal wpisy z powrotem.
 * Nie byl przejsciowy — przy 28 plakatach przepadlo 19 wpisow na stale.
 *
 * Naprawa nie generuje nic od nowa: pliki sa, brakuje wylacznie wskaznika.
 * Regenerowanie ich to okolo 20 minut liczenia za nic.
 *
 * PRZED URUCHOMIENIEM upewnij sie, ze pipeline zasobow skonczyl — inaczej ta
 * naprawa zostanie nadpisana tak samo jak wpisy, ktore odtwarza.
 *
 *   node scripts/naprawWpisyMockupow.js             — proba
 *   node scripts/naprawWpisyMockupow.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const BS = String.fromCharCode(92);
const norm = (p) => String(p || '').split(BS).join('/');
const zapis = process.argv.includes('--wykonaj');

const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

const doNaprawy = [];
const bezPlikow = [];

for (const p of inv.posters) {
  if (p.kind === 'set' || p.kind === 'gallery' || p.kind === 'gallery-framed' || p.kind === 'frame' || !p.approvedForPrint) continue;
  const m = p.mockups || {};
  const kompletny = m.frame && m.interior &&
    fs.existsSync(path.join(ROOT, norm(m.frame))) &&
    fs.existsSync(path.join(ROOT, norm(m.interior)));
  if (kompletny) continue;

  const dir = path.join(ROOT, path.dirname(norm(p.imagePath)));
  const base = path.basename(norm(p.imagePath)).replace(/\.[^.]+$/, '');
  const frame = path.join(dir, base + '_mockup_frame.jpg');
  const inter = path.join(dir, base + '_mockup_interior.jpg');

  if (fs.existsSync(frame) && fs.existsSync(inter)) {
    doNaprawy.push({ poster: p, frame, inter });
  } else {
    bezPlikow.push(p.title);
  }
}

console.log('wpisy do odtworzenia (pliki sa): ' + doNaprawy.length);
doNaprawy.forEach((d) => console.log('   ' + d.poster.title));

if (bezPlikow.length) {
  console.log('');
  console.log('BRAK PLIKOW — te trzeba wygenerowac (dogenerujMockupy.js): ' + bezPlikow.length);
  bezPlikow.forEach((t) => console.log('   ' + t));
}

if (!zapis) {
  console.log('');
  console.log('To byla proba. Dodaj --wykonaj.');
  process.exit(0);
}

if (!doNaprawy.length) process.exit(0);

// Czytamy kartoteke PONOWNIE tuz przed zapisem: miedzy analiza a zapisem mogl
// ktos ja zmienic, a nadpisanie jej starym obrazem byloby dokladnie ta sama
// awaria, ktora naprawiamy.
const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const wgId = new Map(swieza.posters.map((p) => [p.id, p]));
let zapisane = 0;

for (const d of doNaprawy) {
  const cel = wgId.get(d.poster.id);
  if (!cel) continue;
  cel.mockups = {
    frame: path.relative(ROOT, d.frame).split(BS).join('/'),
    interior: path.relative(ROOT, d.inter).split(BS).join('/'),
    generatedAt: new Date(fs.statSync(d.frame).mtime).toISOString(),
  };
  zapisane++;
}

fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');
console.log('');
console.log('odtworzone wpisy: ' + zapisane);
