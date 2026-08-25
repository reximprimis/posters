/**
 * Generuje SAME mockupy dla plakatow, ktore ich nie maja.
 *
 * DLACZEGO NIE PRZEZ ZATWIERDZANIE: PATCH /api/posters/bulk-approval uruchamia
 * caly pipeline zasobow, ktory najpierw przebudowuje komplet PDF-ow — takze
 * tych, ktore juz istnieja. Przy 65 plakatach to 1560 plikow (szesc formatow
 * w wersji podstawowej i szesc z ramka, razy dwa przebiegi) i dwie godziny
 * mielenia procesora, zanim w ogole zacznie sie to, o co chodzi.
 *
 * Ten skrypt woła endpoint od samych mockupow, plakat po plakacie. Kazde
 * wywolanie czyta i zapisuje kartoteke osobno, wiec przerwanie w polowie
 * niczego nie traci.
 *
 *   node scripts/dogenerujMockupy.js             — proba (lista)
 *   node scripts/dogenerujMockupy.js --wykonaj   — generowanie
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
/**
 * Port serwera podgladu. Sprawdzamy 3001 przed 3000, bo preview.js przyjmuje
 * teraz --port i biegnie tam rownie czesto. Bez tego skrypt trafial w martwy
 * port i zglaszal "Not Found" dla kazdego plakatu — co wyglada jak brak
 * rekordu, a jest brakiem serwera pod tym adresem.
 */
const PORT = process.env.PREVIEW_PORT || null;
const PORTY_DO_SPRAWDZENIA = PORT ? [PORT] : [3001, 3000];
const zapis = process.argv.includes('--wykonaj');

function brakujace() {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  return inv.posters.filter(
    (p) => p.kind !== 'set' && p.approvedForPrint === true && !(p.mockups && p.mockups.frame)
  );
}

/** Port ustalony przy pierwszym udanym polaczeniu — potem juz nie szukamy. */
let znalezionyPort = null;

async function ustalPort() {
  if (znalezionyPort) return znalezionyPort;
  for (const p of PORTY_DO_SPRAWDZENIA) {
    try {
      const r = await fetch(`http://localhost:${p}/api/posters`, { method: 'HEAD' });
      if (r.status < 500) { znalezionyPort = p; return p; }
    } catch (_) { /* port martwy — probujemy nastepny */ }
  }
  throw new Error('Nie znalazlem serwera podgladu na portach: ' + PORTY_DO_SPRAWDZENIA.join(', '));
}

async function generuj(id) {
  const port = await ustalPort();
  const res = await fetch(`http://localhost:${port}/api/posters/${encodeURIComponent(id)}/generate-mockups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const dane = await res.json().catch(() => ({}));
  if (!res.ok || dane.ok === false) throw new Error(dane.error || res.statusText);
  return dane;
}

(async () => {
  const lista = brakujace();
  console.log('bez mockupow: ' + lista.length);
  const poziome = lista.filter((p) => p.orientation === 'landscape');
  if (poziome.length) console.log('w tym poziomych: ' + poziome.map((p) => p.title).join(', '));

  if (!zapis) {
    console.log('');
    lista.slice(0, 10).forEach((p) => console.log('   ' + p.title));
    if (lista.length > 10) console.log('   … i ' + (lista.length - 10) + ' wiecej');
    console.log('');
    console.log('To byla proba. Dodaj --wykonaj.');
    return;
  }

  let ok = 0;
  let blad = 0;
  const start = Date.now();
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i];
    const nr = `[${i + 1}/${lista.length}]`;
    try {
      await generuj(p.id);
      ok++;
      const sr = Math.round((Date.now() - start) / 1000 / ok);
      const zostalo = Math.round((sr * (lista.length - i - 1)) / 60);
      console.log(`${nr} OK   ${p.title}   (~${zostalo} min do konca)`);
    } catch (e) {
      blad++;
      console.error(`${nr} BLAD ${p.title}: ${e.message}`);
    }
  }
  console.log('');
  console.log('gotowe: ' + ok + ',  bledow: ' + blad);
})().catch((e) => { console.error(e); process.exit(1); });
