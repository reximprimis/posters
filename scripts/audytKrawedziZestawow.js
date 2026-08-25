/**
 * Szuka pasa namalowanego przez model w miejscu ciecia panoramy.
 *
 * Skad sie bierze: prompt panoramy kaze odsunac obiekty od linii ciecia,
 * a przy kolejnych probach ten nacisk rosnie. Model bierze to doslownie
 * i maluje w miejscu ciecia jednolity pas. Panorama wyglada wtedy poprawnie,
 * ale po podziale kazdy panel ma jasny brzeg od strony styku — a zestawy sa
 * full bleed, wiec na scianie widac linie miedzy arkuszami.
 *
 * Kontrola linii ciecia tego NIE lapie: sprawdza, czy przez ciecie nie
 * przechodzi wazny obiekt. Jednolity pas jest z jej punktu widzenia czysty.
 *
 * MIERZYMY PANORAME, NIE PANELE. Badanie krawedzi paneli daje falszywe
 * alarmy, bo nie odroznia pasa od naturalnego ksztaltu, ktory akurat konczy
 * sie przy brzegu (pien drzewa, winieta, cien). W panoramie pas jest
 * LOKALNYM odchyleniem: porownujemy waski pas na samym cieciu z pasami
 * odsunietymi o 45 px w obie strony.
 *
 * Pomiar bez zmniejszania obrazu — pas ma okolo 11 px przy panelu 1280 px,
 * czyli mniej niz dwa piksele miniatury 200 px.
 *
 * Zmierzone progi: zestawy zdrowe daja odchylenie 0-8, wadliwe 14-48.
 *
 *   node scripts/audytKrawedziZestawow.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const norm = (p) => String(p || '').split('\\').join('/');

/** Szerokosc badanego pasa. */
const SZER = 14;
/** O ile odsuwamy pasy odniesienia od ciecia. */
const ODSTEP = 45;
/** Odchylenie od otoczenia, powyzej ktorego uznajemy pas za wade. */
const PROG = 12;

async function zbadajCiecia(abs, paneli) {
  const { data, info } = await sharp(abs).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  const pas = (x0) => {
    let s = 0;
    let n = 0;
    const y0 = Math.floor(h * 0.2);
    const y1 = Math.floor(h * 0.8);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x0 + SZER; x++) {
        if (x < 0 || x >= w) continue;
        const i = (y * w + x) * ch;
        s += (data[i] + data[i + 1] + data[i + 2]) / 3;
        n++;
      }
    }
    return n ? s / n : 0;
  };

  const wyniki = [];
  for (let k = 1; k < paneli; k++) {
    const cx = Math.round((w * k) / paneli);
    const naCieciu = pas(cx - Math.floor(SZER / 2));
    const otoczenie = (pas(cx - ODSTEP - SZER) + pas(cx + ODSTEP)) / 2;
    wyniki.push({ k, naCieciu, otoczenie, skok: naCieciu - otoczenie });
  }
  return wyniki;
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const zestawy = inv.posters.filter((p) => p.kind === 'set');

  const wadliwe = [];
  let zbadanych = 0;

  for (const z of zestawy) {
    const paneli = (z.panels || []).length;
    if (paneli < 2) continue;
    const abs = path.join(ROOT, norm(z.imagePath));
    if (!fs.existsSync(abs)) continue;

    const r = await zbadajCiecia(abs, paneli);
    zbadanych++;
    const zle = r.filter((x) => Math.abs(x.skok) > PROG);
    if (zle.length) {
      wadliwe.push({
        tytul: z.title,
        paneli,
        opis: zle.map((x) => `ciecie${x.k}: ${x.naCieciu.toFixed(0)} vs otoczenie ${x.otoczenie.toFixed(0)} (${x.skok >= 0 ? '+' : ''}${x.skok.toFixed(0)})`),
      });
    }
  }

  console.log('zbadanych zestawow: ' + zbadanych);
  console.log('z pasem na cieciu:  ' + wadliwe.length);
  console.log('');
  for (const w of wadliwe.sort((a, b) => b.opis.length - a.opis.length)) {
    console.log('   ' + String(w.tytul).slice(0, 30).padEnd(32) + '(' + w.paneli + ' paneli)');
    w.opis.forEach((x) => console.log('      ' + x));
  }
  if (!wadliwe.length) console.log('   brak — wszystkie ciecia czyste');

  process.exitCode = wadliwe.length ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
