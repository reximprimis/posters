/**
 * Uzupelnia pole orientation dla zestawow.
 *
 * UWAGA NA POZORNA SPRZECZNOSC: panorama zestawu jest POZIOMA (3840x1920),
 * ale klient kupuje i wiesza PANELE, a te sa pionowe 2:3 — jak zwykly plakat.
 * Orientacja produktu musi opisywac to, co trafia na sciane, inaczej filtr
 * "poziome" w sklepie zwracalby zestawy zlozone z pionowych arkuszy.
 *
 * Dlatego czytamy proporcje PANELU, a nie panoramy.
 *
 *   node scripts/ustawOrientacjeZestawow.js             — proba
 *   node scripts/ustawOrientacjeZestawow.js --wykonaj   — zapis
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');
const zapis = process.argv.includes('--wykonaj');

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const zestawy = inv.posters.filter((p) => p.kind === 'set');

  const zmiany = [];
  const rozklad = {};
  let bezPanelu = 0;

  for (const z of zestawy) {
    const panel = (z.panels || [])[0];
    const rel = typeof panel === 'string' ? panel : panel && panel.imagePath;
    const abs = rel ? path.join(ROOT, norm(rel)) : null;
    if (!abs || !fs.existsSync(abs)) {
      bezPanelu++;
      continue;
    }
    const m = await sharp(abs).metadata();
    const orientacja = m.width > m.height ? 'landscape' : 'portrait';
    rozklad[orientacja] = (rozklad[orientacja] || 0) + 1;
    if (z.orientation !== orientacja) zmiany.push({ rekord: z, orientacja, wym: m.width + 'x' + m.height });
  }

  console.log('zestawow: ' + zestawy.length + (bezPanelu ? ',  bez panelu: ' + bezPanelu : ''));
  console.log('rozklad wg panelu: ' + Object.entries(rozklad).map(([k, v]) => k + ' x' + v).join(', '));
  console.log('do zmiany: ' + zmiany.length);
  for (const z of zmiany.slice(0, 8)) {
    console.log('   ' + String(z.rekord.title).slice(0, 30).padEnd(32) + z.wym + '  → ' + z.orientacja);
  }
  if (zmiany.length > 8) console.log('   ... i ' + (zmiany.length - 8) + ' wiecej');

  if (!zapis) {
    console.log('');
    console.log('To byla proba. Dodaj --wykonaj, zeby zapisac.');
    return;
  }

  // Kartoteke wczytujemy PONOWNIE tuz przed zapisem: odczyt proporcji trwa,
  // a serwer podgladu moze w tym czasie zapisac wlasne zmiany.
  const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const wgId = new Map(zmiany.map((z) => [z.rekord.id, z.orientacja]));
  let zapisanych = 0;
  for (const p of swieza.posters) {
    if (wgId.has(p.id)) {
      p.orientation = wgId.get(p.id);
      zapisanych++;
    }
  }
  fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2), 'utf8');
  console.log('');
  console.log('zapisane: ' + zapisanych);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
