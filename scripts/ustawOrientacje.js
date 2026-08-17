/**
 * Stempluje pole `orientation` na istniejacych rekordach.
 *
 * Orientacji nie zgadujemy — odczytujemy ja z faktycznych wymiarow pliku
 * master. Dzieki temu kartoteka zgadza sie z tym, co naprawde lezy na dysku,
 * a nie z tym, co akurat stalo w IMAGE_GENERATION_SIZE w chwili generowania.
 *
 * Zestawy pomijamy — panorama ma wlasna geometrie i nie miesci sie w podziale
 * pion/poziom.
 *
 *   node scripts/ustawOrientacje.js             — proba
 *   node scripts/ustawOrientacje.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PORTRAIT, LANDSCAPE } = require('../src/posterOrientation');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const zapis = process.argv.includes('--wykonaj');

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  let ustawione = 0;
  let poziome = 0;
  let bezPliku = 0;
  const zmiany = [];

  for (const p of inv.posters) {
    if (p.kind === 'set') continue;
    const abs = path.join(ROOT, norm(p.imagePath));
    if (!fs.existsSync(abs)) {
      bezPliku++;
      continue;
    }
    const meta = await sharp(abs).metadata();
    const orientacja = (meta.width || 0) > (meta.height || 0) ? LANDSCAPE : PORTRAIT;
    if (p.orientation === orientacja) continue;

    zmiany.push({ rekord: p, poprzednia: p.orientation, nowa: orientacja, meta });
    if (orientacja === LANDSCAPE) poziome++;
    ustawione++;
  }

  for (const z of zmiany) {
    if (z.nowa === LANDSCAPE || z.poprzednia != null) {
      console.log(
        '   ' + z.rekord.title + '  (' + z.rekord.category + ')  ' +
        z.meta.width + 'x' + z.meta.height + '  ' +
        (z.poprzednia || '—') + ' -> ' + z.nowa
      );
    }
  }

  console.log('');
  console.log('do ostemplowania: ' + ustawione + '  (w tym poziomych: ' + poziome + ')');
  if (bezPliku) console.log('pominietych bez pliku: ' + bezPliku);

  if (!zapis) {
    console.log('');
    console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
    return;
  }

  for (const z of zmiany) z.rekord.orientation = z.nowa;
  fs.writeFileSync(INVENTORY, JSON.stringify(inv, null, 2), 'utf8');
  console.log('');
  console.log('Zapisane.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
