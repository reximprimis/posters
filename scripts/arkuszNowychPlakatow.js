/**
 * Arkusz stykowy plakatow z ostatnich N godzin — do oceny przed zatwierdzeniem.
 *
 * Grupuje po kategorii i wypisuje legende z estetyka i orientacja, zeby dalo
 * sie ocenic nie tylko "ladny/brzydki", ale i czy estetyka faktycznie zadzialala.
 *
 *   node scripts/arkuszNowychPlakatow.js [godzin]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const norm = (p) => String(p || '').split('\\').join('/');
const GODZIN = Number(process.argv[2]) || 6;

const SZER = 260;
const KOL = 6;

(async () => {
  const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'posters_inventory.json'), 'utf8'));
  const prog = Date.now() - GODZIN * 3600000;

  const nowe = inv.posters
    .filter((p) => p.kind !== 'set' && Date.parse(p.createdAt || '') >= prog)
    .filter((p) => fs.existsSync(path.join(ROOT, norm(p.imagePath))))
    .sort((a, b) => String(a.category).localeCompare(String(b.category)));

  if (!nowe.length) {
    console.log('brak nowych plakatow z ostatnich ' + GODZIN + ' h');
    return;
  }

  const WYS = Math.round(SZER * 1.4);
  const bufy = [];
  for (const p of nowe) {
    bufy.push(
      await sharp(path.join(ROOT, norm(p.imagePath)))
        .resize(SZER, WYS, { fit: 'contain', background: '#eeece8' })
        .toBuffer()
    );
  }
  const wierszy = Math.ceil(bufy.length / KOL);
  const cel = path.join(ROOT, '_kopie_kartoteki', '_nowe_plakaty.jpg');

  await sharp({ create: { width: KOL * SZER, height: wierszy * WYS, channels: 3, background: '#eeece8' } })
    .composite(bufy.map((b, i) => ({ input: b, left: (i % KOL) * SZER, top: Math.floor(i / KOL) * WYS })))
    .jpeg({ quality: 86 })
    .toFile(cel);

  console.log('LEGENDA (' + nowe.length + ' plakatow, ' + KOL + ' w rzedzie):');
  let ostatnia = '';
  nowe.forEach((p, i) => {
    if (p.category !== ostatnia) {
      console.log('  --- ' + p.category + ' ---');
      ostatnia = p.category;
    }
    const poz = '[' + (Math.floor(i / KOL) + 1) + ',' + ((i % KOL) + 1) + ']';
    console.log(
      '    ' + poz + ' ' + String(p.title).padEnd(28) +
      String(p.artStyle).padEnd(14) +
      String(p.orientation || 'portrait').padEnd(11) +
      (p.colors || []).join(', ')
    );
  });
  console.log('');
  console.log('arkusz: _kopie_kartoteki/_nowe_plakaty.jpg');
})().catch((e) => { console.error(e); process.exit(1); });
