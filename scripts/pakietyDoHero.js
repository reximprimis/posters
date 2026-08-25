/**
 * Pakiety po 10 plakatow do zdjecia hero — do oceny, czy grają razem.
 *
 * Sklejanie plakatow w wygenerowane wnetrze wychodzi sztucznie: ramy sa
 * plaskimi prostokatami, wiec nie lapia swiatla sceny ani cienia na scianie.
 * Zamiast tego pokazujemy SAM ZESTAW — dziesiec plakatow obok siebie,
 * full bleed, bez ram. Wtedy widac to, co naprawde decyduje o scianie:
 * czy paleta trzyma sie kupy i czy motywy sie nie powtarzaja.
 *
 * Zdjecie hero powstaje potem osobno, z prawdziwym wnetrzem.
 *
 *   node scripts/pakietyDoHero.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const WYJSCIE = path.join(ROOT, '_kopie_kartoteki', 'pakiety');
const norm = (p) => String(p || '').split('\\').join('/');

/**
 * Pakiety dobrane RECZNIE po palecie i motywie. Automat po samych kolorach
 * daje zestawy technicznie zgodne, ale wizualnie przypadkowe — pies w zlotej
 * godzinie ma te same barwy co jesienny las i nie powinien wisiec obok niego.
 */
const PAKIETY = [
  {
    id: 'jesien',
    nazwa: 'JESIEN — glina, kakao, ochra',
    opis: 'Pod baner "Kolory jesieni 2026". Cieple, ziemiste, do salonu z drewnem.',
    tytuly: [
      'Terracotta Arch on Cream', 'Maple Leaves Autumn', 'Cut Paper Leaves',
      'Single Arch on Sand', 'Three Circles in Ochre', 'Two Forms in Terracotta',
      'Arch and Circle', 'Lemon Grove Harvest', 'Dried Grass Duo', 'Bamboo Grove at Dawn',
    ],
  },
  {
    id: 'skandy',
    nazwa: 'SKANDYNAWSKI — bezy, biele, szalwia',
    opis: 'Jasna sciana, duzo swiatla. Najbezpieczniejszy zestaw sprzedazowy.',
    tytuly: [
      'Magnolia Over Still Water', 'Soft Botanical Branch', 'Wild Flower Line Study',
      'Delicate Magnolia Stem', 'Lake Reflection Calm', 'Mist Over Mountain Peaks',
      'Fern Wall Study', 'Minimal Plant Silhouette', 'Balanced Forms', 'Two Columns in Ink',
    ],
  },
  {
    id: 'ciemny',
    nazwa: 'CIEMNY — granat, zloto, czern',
    opis: 'Do ciemnej sciany albo gabinetu. Mocny kontrast, wieczorny klimat.',
    tytuly: [
      'Milky Way Horizon', 'Nebula Color Cloud', 'Saturn Rings Glow',
      'Crescent Moon Phase', 'Twin Constellations', 'Cocktail Cherry Drop',
      'Whiskey Amber Glow', 'Copper Jigger Shine', 'Bar Counter Evening', 'Neon Alley Rain',
    ],
  },
  {
    id: 'linia',
    nazwa: 'LINIA — grafit na kremowym',
    opis: 'Jednolity, graficzny. Dobrze znosi rowne ramy i regularna siatke.',
    tytuly: [
      'Profile And Petal', 'Facing Profiles', 'Hands Reaching Across',
      'Single Line Portrait', 'Hand Holding Stem', 'Embrace In One Line',
      'Resting Hands Study', 'Gin Botanicals Study', 'Flight of Two Birds', 'Kiss In One Line',
    ],
  },
];

const KAFEL_W = 300;
const KAFEL_H = 450;
const ODSTEP = 6;

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  if (!fs.existsSync(WYJSCIE)) fs.mkdirSync(WYJSCIE, { recursive: true });

  for (const pak of PAKIETY) {
    console.log('');
    console.log(pak.nazwa);
    console.log('   ' + pak.opis);

    const warstwy = [];
    let kolumna = 0;
    const braki = [];

    for (const tytul of pak.tytuly) {
      const p = inv.posters.find((x) => x.title === tytul);
      if (!p) { braki.push(tytul); continue; }
      const abs = path.join(ROOT, norm(p.imagePath));
      if (!fs.existsSync(abs)) { braki.push(tytul); continue; }

      // Full bleed: kafelek wypelniony bez marginesu, tak jak plakat wisi
      // na scianie — bez ramy i bez passe-partout.
      const obraz = await sharp(abs)
        .resize(KAFEL_W, KAFEL_H, { fit: 'cover', position: 'centre' })
        .toBuffer();
      warstwy.push({ input: obraz, left: ODSTEP + kolumna * (KAFEL_W + ODSTEP), top: ODSTEP });
      kolumna++;
    }

    if (braki.length) console.log('   BRAK: ' + braki.join(', '));

    const plik = path.join(WYJSCIE, 'pakiet_' + pak.id + '.jpg');
    await sharp({
      create: {
        width: ODSTEP + kolumna * (KAFEL_W + ODSTEP),
        height: KAFEL_H + 2 * ODSTEP,
        channels: 3,
        background: '#ffffff',
      },
    })
      .composite(warstwy)
      .jpeg({ quality: 90 })
      .toFile(plik);

    console.log('   plakatow: ' + kolumna + '   →  ' + path.relative(ROOT, plik));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
