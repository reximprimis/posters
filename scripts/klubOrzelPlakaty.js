/**
 * Plakaty dla KS Orzel Myslakowice.
 *
 * ZASADA: herb klubu i wszystkie napisy sa SKLADANE, nigdy generowane.
 * Model obrazu nie odtworzy herbu (za kazdym razem wymysli inny) ani nie
 * napisze poprawnie "MYSLAKOWICE". Tlem sa ZDJECIA PRAWDZIWEGO OBIEKTU —
 * lepsze od czegokolwiek generowanego, bo kibic rozpoznaje wlasne boisko.
 *
 * Herb: assets/klub_orzel_materialy/orzel_logo.png — 500x500 z alfa, realna
 * grafika 378x450. Sprawdzone: eksport z wektora, skaluje sie czysto 4x.
 *
 * CZEGO NIE UZYWAMY: zak_2025-2026.jpeg — zdjecie druzyny dzieciecej
 * z rozpoznawalnymi twarzami. Zgoda klubu na herb NIE obejmuje wizerunku
 * dzieci; to wymaga zgody kazdego rodzica osobno i nie moze trafic na
 * produkt sprzedazowy.
 *
 *   node scripts/klubOrzelPlakaty.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const MATERIALY = path.join(ROOT, 'assets', 'klub_orzel_materialy');
const HERB = path.join(MATERIALY, 'orzel_logo.png');
const KAT = path.join(ROOT, 'zestawy_robocze', 'klub_orzel');

/** Barwy klubowe. */
const ZIELEN = '#0f3320';
const ZIELEN_JASNA = '#1a5233';
const ZLOTO = '#f2c500';
const ZLOTO_PRZYGASZONE = '#d8b23f';

/** stadion1 i stadion2 to ten sam plik (identyczny MD5) — bierzemy jeden. */
const PLAKATY = [
  { id: '1_herbowy', tlo: null, orientacja: 'portrait', podpis: null },
  {
    id: '2_boisko',
    tlo: 'stadion1_clean.jpeg',
    orientacja: 'portrait',
    podpis: 'NASZE BOISKO, NASZE BARWY',
  },
  {
    // Karkonosze w tle — dlatego POZIOMO, zeby nie uciac panoramy.
    id: '3_karkonosze',
    tlo: 'stadion3_clean.jpeg',
    orientacja: 'landscape',
    podpis: 'POD KARKONOSZAMI OD POKOLEŃ',
  },
];

const wymiary = (orientacja) =>
  orientacja === 'landscape' ? { W: 3000, H: 2000 } : { W: 2000, H: 3000 };

/** Bezpieczny margines druku — 5% krotszego boku, jak w reszcie pipeline'u. */
const margines = (W, H) => Math.round(Math.min(W, H) * 0.05);

/**
 * Dobiera stopien pisma tak, zeby napis zmiescil sie w bezpiecznym marginesie.
 *
 * Mierzymy RENDEREM, nie szacunkiem: przy rozstrzelonych wersalikach ta sama
 * liczba znakow daje bardzo rozne szerokosci. Podpis "NASZE BOISKO, NASZE
 * BARWY" przy stalym stopniu wychodzil na 1991 z 2000 px — 9 px od krawedzi,
 * czyli w druku zostalby uciety.
 */
async function dopasujStopien(tekst, W, H, rozmiarStart, wspOdstepu) {
  const dostepne = W - 2 * margines(W, H);
  let rozmiar = rozmiarStart;
  for (let i = 0; i < 8; i++) {
    const odstep = Math.round(rozmiar * wspOdstepu);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Math.round(rozmiar * 3)}">
      <text x="${W / 2}" y="${Math.round(rozmiar * 1.6)}" text-anchor="middle"
        font-family="Cambria, 'Times New Roman', serif" font-size="${rozmiar}"
        letter-spacing="${odstep}" fill="#ffffff">${tekst}</text></svg>`;
    const info = await sharp(Buffer.from(svg, 'utf8')).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    if (info.info.width <= dostepne) return { rozmiar, odstep };
    rozmiar = Math.floor(rozmiar * (dostepne / info.info.width) * 0.98);
  }
  return { rozmiar, odstep: Math.round(rozmiar * wspOdstepu) };
}

/** Tlo plakatu herbowego robimy sami — pelna kontrola, zero kosztu API. */
function tloHerbowe(W, H) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="v" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="${ZIELEN_JASNA}"/>
      <stop offset="100%" stop-color="${ZIELEN}"/>
    </radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
    <rect x="70" y="70" width="${W - 140}" height="${H - 140}" fill="none"
          stroke="${ZLOTO_PRZYGASZONE}" stroke-width="4" opacity="0.55"/>
    <rect x="92" y="92" width="${W - 184}" height="${H - 184}" fill="none"
          stroke="${ZLOTO_PRZYGASZONE}" stroke-width="1.5" opacity="0.35"/>
  </svg>`;
  return sharp(Buffer.from(svg, 'utf8')).png().toBuffer();
}

/**
 * Pas klubowy u dolu: zdjecie u gory, herb i napisy na pelnym zielonym polu.
 *
 * Pierwsza wersja kladla herb na srodku murawy i przyciemniala cale zdjecie.
 * Dwa bledy naraz: herb wisial w powietrzu bez oparcia, a mocny gradient na
 * jasnym, dziennym zdjeciu wygladal sztucznie — niebo robilo sie granatowe,
 * a trawa zostawala w pelnym sloncu. Pas rozwiazuje oba: zdjecie zostaje
 * nietkniete, a napisy leza na wlasnym tle i zawsze sa czytelne.
 *
 * @returns {{ svg: Buffer, yPasa: number }}
 */
function pasKlubowy(W, H) {
  // W poziomie pas musi byc PROPORCJONALNIE nizszy: te same 38% wysokosci,
  // ktore w pionie wygladaly dobrze, w poziomie zjadaly panorame i herb
  // wchodzil na podpis.
  const yPasa = Math.round(H * (W > H ? 0.74 : 0.62));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="zanik" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ZIELEN}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${ZIELEN}" stop-opacity="1"/>
    </linearGradient></defs>
    <rect x="0" y="${yPasa - Math.round(H * 0.09)}" width="${W}" height="${Math.round(H * 0.09)}" fill="url(#zanik)"/>
    <rect x="0" y="${yPasa}" width="${W}" height="${H - yPasa}" fill="${ZIELEN}"/>
    <line x1="0" y1="${yPasa}" x2="${W}" y2="${yPasa}" stroke="${ZLOTO}" stroke-width="5" opacity="0.9"/>
  </svg>`;
  return { svg: Buffer.from(svg, 'utf8'), yPasa };
}

/**
 * Cambria, NIE Georgia: Georgia ma domyslnie cyfry tekstowe, wiec "80 LAT"
 * czytalo sie jak "8o LAT" — zero bylo male i osadzone nisko.
 */
function napisy(W, H, { gora, dol, stopienGora, stopienDol, kolor = ZLOTO }) {
  const cz = [];
  if (gora) {
    cz.push(`<text x="${W / 2}" y="${Math.round(H * 0.118)}" text-anchor="middle"
      font-family="Cambria, 'Times New Roman', serif" font-size="${stopienGora.rozmiar}"
      font-weight="bold" letter-spacing="${stopienGora.odstep}" fill="${kolor}">${gora}</text>`);
    cz.push(`<line x1="${W * 0.38}" y1="${Math.round(H * 0.148)}" x2="${W * 0.62}" y2="${Math.round(H * 0.148)}"
      stroke="${kolor}" stroke-width="3" opacity="0.7"/>`);
  }
  if (dol) {
    cz.push(`<line x1="${W * 0.14}" y1="${Math.round(H * 0.878)}" x2="${W * 0.86}" y2="${Math.round(H * 0.878)}"
      stroke="${kolor}" stroke-width="3" opacity="0.55"/>`);
    cz.push(`<text x="${W / 2}" y="${Math.round(H * 0.928)}" text-anchor="middle"
      font-family="Cambria, 'Times New Roman', serif" font-size="${stopienDol.rozmiar}"
      letter-spacing="${stopienDol.odstep}" fill="${kolor}">${dol}</text>`);
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${cz.join('')}</svg>`, 'utf8');
}

(async () => {
  if (!fs.existsSync(HERB)) { console.error('Brak herbu: ' + HERB); process.exit(1); }
  fs.mkdirSync(KAT, { recursive: true });
  const zrobione = [];

  for (const p of PLAKATY) {
    const { W, H } = wymiary(p.orientacja);

    let tlo;
    if (p.tlo) {
      const zr = path.join(MATERIALY, p.tlo);
      if (!fs.existsSync(zr)) { console.log('  (pomijam ' + p.id + ' — brak ' + p.tlo + ')'); continue; }
      tlo = await sharp(zr).resize(W, H, { fit: 'cover', position: 'centre' }).png().toBuffer();
    } else {
      tlo = await tloHerbowe(W, H);
    }

    const warstwy = [];
    let topHerbu;
    let napisyBuf;
    let pozycjaHerbuX = null;

    if (p.tlo) {
      // Zdjecie u gory, pas klubowy u dolu — herb ma oparcie, zdjecie zostaje
      // w swoim naturalnym swietle.
      const pas = pasKlubowy(W, H);
      warstwy.push({ input: pas.svg, left: 0, top: 0 });
      const wysPasa = H - pas.yPasa;
      const poziomo = W > H;

      // W poziomie herb staje OBOK napisu, nie nad nim — pas jest niski,
      // wiec uklad pionowy sie w nim nie miesci.
      const herbH = Math.round(wysPasa * (poziomo ? 0.74 : 0.62));
      var herb = await sharp(HERB).trim({ threshold: 1 })
        .resize({ height: herbH, kernel: 'lanczos3' }).png().toBuffer();
      var hm = await sharp(herb).metadata();
      topHerbu = pas.yPasa + Math.round((wysPasa - hm.height) / 2);

      const maxNapis = poziomo ? Math.round(W * 0.52) : W - 2 * margines(W, H);
      const stopienDol = await dopasujStopien(
        p.podpis, maxNapis + 2 * margines(W, H), H,
        Math.round(Math.min(W, H) * (poziomo ? 0.05 : 0.042)), 0.2
      );

      napisyBuf = Buffer.from(
        poziomo
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
              <text x="${Math.round(W * 0.60)}" y="${pas.yPasa + Math.round(wysPasa * 0.60)}" text-anchor="middle"
                font-family="Cambria, 'Times New Roman', serif" font-size="${stopienDol.rozmiar}"
                letter-spacing="${stopienDol.odstep}" fill="${ZLOTO}">${p.podpis}</text>
            </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
              <text x="${W / 2}" y="${H - Math.round(wysPasa * 0.13)}" text-anchor="middle"
                font-family="Cambria, 'Times New Roman', serif" font-size="${stopienDol.rozmiar}"
                letter-spacing="${stopienDol.odstep}" fill="${ZLOTO}">${p.podpis}</text>
            </svg>`,
        'utf8'
      );
      if (poziomo) pozycjaHerbuX = Math.round(W * 0.22 - hm.width / 2);
      // "80 LAT" na zdjeciu, u gory — kontrast daje mu sam blekit nieba.
      const sg = await dopasujStopien('80 LAT', W, H, Math.round(Math.min(W, H) * 0.11), 0.11);
      warstwy.push({
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
            <text x="${W / 2}" y="${Math.round(H * 0.13)}" text-anchor="middle"
              font-family="Cambria, 'Times New Roman', serif" font-size="${sg.rozmiar}"
              font-weight="bold" letter-spacing="${sg.odstep}" fill="${ZLOTO}"
              stroke="#04140b" stroke-width="${Math.round(sg.rozmiar * 0.045)}"
              paint-order="stroke">80 LAT</text>
          </svg>`,
          'utf8'
        ),
        left: 0, top: 0,
      });
    } else {
      var herb = await sharp(HERB).trim({ threshold: 1 })
        .resize({ width: Math.round(Math.min(W, H) * 0.55), kernel: 'lanczos3' }).png().toBuffer();
      var hm = await sharp(herb).metadata();
      topHerbu = Math.round(H * 0.24);
      const stopienGora = await dopasujStopien('80 LAT', W, H, Math.round(Math.min(W, H) * 0.125), 0.11);
      napisyBuf = napisy(W, H, { gora: '80 LAT', stopienGora });
    }

    warstwy.push({
      input: herb,
      left: pozycjaHerbuX != null ? pozycjaHerbuX : Math.round((W - hm.width) / 2),
      top: topHerbu,
    });
    warstwy.push({ input: napisyBuf, left: 0, top: 0 });

    const cel = path.join(KAT, p.id + '.png');
    await sharp(tlo).composite(warstwy).png().toFile(cel);
    console.log('  ' + p.id.padEnd(16) + p.orientacja.padEnd(11) + W + 'x' + H + '  -> ' + path.basename(cel));
    zrobione.push(cel);
  }

  if (zrobione.length) {
    const S = 440, HH = 660, b = [];
    for (const x of zrobione) b.push(await sharp(x).resize(S, HH, { fit: 'contain', background: '#ffffff' }).toBuffer());
    await sharp({ create: { width: S * b.length, height: HH, channels: 3, background: '#ffffff' } })
      .composite(b.map((x, i) => ({ input: x, left: i * S, top: 0 })))
      .jpeg({ quality: 92 }).toFile(path.join(KAT, '_porownanie.jpg'));
    console.log('');
    console.log('arkusz: zestawy_robocze/klub_orzel/_porownanie.jpg');
  }
})().catch((e) => { console.error(e); process.exit(1); });
