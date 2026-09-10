/**
 * Buduje serie zestawow (gallery-framed + gallery) pod rynek niemiecki —
 * jedna paczka "motywow" (kategoria+styl), kazdy jako PARA: zestaw+rama
 * ("... Grid") i zestaw scienny bez ramy ("... Wall Set"), te same 4
 * plakaty w obu wersjach (klient wybiera oprawiony czy nie — ten sam
 * motyw). Uzupelnia serie z 2026-09-09 (Wild Portraits Grid + Quiet
 * Horizons Grid), ktore juz istnieja jako pierwsze testy — ten skrypt
 * dobudowuje ich pary (Quiet Ridge Grid, Wild Portraits Wall Set) i
 * kolejnych 28 motywow, do 30 sztuk kazdego rodzaju.
 *
 * Kolor ramy i pomieszczenie przydzielane rotacyjnie — bialy kolor ramy
 * jest CELOWO pominiety (geometria wykrywania krawedzi nadal zepsuta,
 * patrz src/frameMockups.js).
 *
 * Zapisuje inkrementalnie (po kazdym udanym motywie) i loguje postep na
 * biezaco — to dlugie zadanie (kazdy framed set to jedno platne
 * wywolanie GPT Image 2 na salon).
 *
 *   node scripts/zbudujSerieNiemcy.js             — proba (nic nie zapisuje)
 *   node scripts/zbudujSerieNiemcy.js --wykonaj   — realne budowanie
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const zapis = process.argv.includes('--wykonaj');

const { cenaOsobno: cenaOsobnoRamek, cenaZestawu: cenaZestawuRamek } = require('../src/galerieRamek');
const { cenaRamy, opisRamy } = require('../src/ramkiKatalog');
const { SIZE_PRICES } = require('../src/galerieScienne');
const { cenaOsobno: cenaOsobnoScienny, cenaZestawu: cenaZestawuScienny } = require('../src/galerieScienne');
const { toPosterHandle } = require('../src/posterTitle');
const { buildFramedGridRaw } = require('../src/galleryFramedVisuals');
const { buildFramedMasterLocal } = require('../src/galleryFramedMasterLocal');
const { buildFramedInteriorAI } = require('../src/galleryFramedInteriorAI');
const { buildFramedDescription, findForbiddenTerms: findForbiddenFramed, NAZWY_MATERIALU, NAZWY_KOLORU } = require('../src/galleryFramedDescription');
const { buildGalleryMaster, buildGalleryPackshot, buildGalleryInterior } = require('../src/galleryVisuals');
const { buildGalleryDescription, findForbiddenTerms: findForbiddenGallery } = require('../src/galleryDescription');

const FRAME_COLORS = ['dab', 'czarny-mat', 'miedziany', 'zloty', 'srebrny', 'czarny'];
const ROOMS_FRAMED = ['living-room', 'home-office', 'bedroom', 'hallway', 'kitchen', 'kids-room'];
const ROOMS_WALL = ['home-office', 'bedroom', 'hallway', 'kitchen', 'kids-room', 'living-room'];

// motyw: klaster (kategoria|styl), nazwa wyswietlana, opis (EN, bez "matte"/"satin"/"ignisafe" — zakazane).
const MOTYWY = [
  { cluster: 'nature-landscapes|Photography', name: 'Quiet Ridge', framedOnly: true,
    opis: 'A second set of mountain moments from the same range — mist, stone, and early light, framed this time for a wall that wants the frame included.' },
  { cluster: 'animals|Photography', name: 'Wild Portraits', wallOnly: true,
    opis: 'The same wild character studies as our framed set — a fox mid-stride, a deer holding still — printed loose for a wall where you already know how you want to hang them.' },
  { cluster: 'abstract|Abstract', name: 'Color Fields',
    opis: 'Flat planes of color, quietly arranged — abstract shapes that read as calm rather than loud, at home on a wall that already has enough going on.' },
  { cluster: 'kitchen-food|Photography', name: 'Kitchen Still Life',
    opis: 'Bread, citrus, oil catching the light — simple kitchen still lifes for the wall above a counter or breakfast table.' },
  { cluster: 'kids-nursery|Illustration', name: 'Gentle Tales', kategoriaOverride: 'kids-nursery',
    opis: 'Soft, storybook illustrations for a child\'s room — animals and quiet scenes drawn with a gentle hand, nothing overstimulating.' },
  { cluster: 'animals|Illustration', name: 'Woodland Friends',
    opis: 'Illustrated woodland creatures with a calm, hand-drawn quality — a friendlier, softer take on animal art for a nursery or reading corner.' },
  { cluster: 'nature-landscapes|Minimalism', name: 'Silent Peaks',
    opis: 'Landscape reduced to its essentials — a ridgeline, a horizon, negative space doing most of the work. For a wall that prefers restraint.' },
  { cluster: 'botanical|Line art', name: 'Botanical Lines',
    opis: 'Single-line botanical studies — a leaf, a stem, a bloom, drawn in one continuous gesture. Quiet, precise, easy to live with.' },
  { cluster: 'cities-travel|Photography', name: 'City Horizons',
    opis: 'Skylines and city light from around the world — a set for anyone who\'d rather look at a horizon than a map.' },
  { cluster: 'botanical|Minimalism', name: 'Calm Botanicals',
    opis: 'Plant forms simplified to their outline and a little color — botanical art with the volume turned down.' },
  { cluster: 'kids-nursery|Minimalism', name: 'Soft Beginnings', kategoriaOverride: 'kids-nursery',
    opis: 'Pale, rounded shapes and soft color for a nursery wall — minimal enough to grow with the room, not just the age.' },
  { cluster: 'sea-coast|Photography', name: 'Coastal Light',
    opis: 'Open water, low light, empty shoreline — coastal photography for a wall that wants a little sea air.' },
  { cluster: 'sea-coast|Minimalism', name: 'Quiet Shoreline',
    opis: 'The coast reduced to horizon lines and pale color fields — a minimal, restful take on sea and sky.' },
  { cluster: 'bar-cocktails|Photography', name: 'Evening Pour',
    opis: 'Glassware, ice, low bar light — photography for a home bar corner or a kitchen that takes its evenings seriously.' },
  { cluster: 'botanical|Illustration', name: 'Garden Study',
    opis: 'Hand-illustrated garden studies — leaves, blooms and stems drawn with the care of an old botanical field guide.' },
  { cluster: 'wellness-yoga|Photography', name: 'Stillness',
    opis: 'Calm, unposed movement — photography built around breath and stillness, for a room meant for the same.' },
  { cluster: 'line-art-figures|Line art', name: 'Figure Study',
    opis: 'Continuous-line figure studies — the human form reduced to a single confident line, nothing more than it needs.' },
  { cluster: 'bar-cocktails|Illustration', name: 'Cocktail Hour',
    opis: 'Illustrated glassware and garnish, drawn with a light, playful hand — a set for a bar cart or kitchen wall.' },
  { cluster: 'architecture|Photography', name: 'Modern Lines',
    opis: 'Clean architectural photography — concrete, glass and shadow, for a wall that likes structure.' },
  { cluster: 'abstract|Minimalism', name: 'Quiet Forms',
    opis: 'A handful of simple forms and a lot of empty space — abstract minimalism for a wall that shouldn\'t compete with the room.' },
  { cluster: 'botanical|Photography', name: 'Botanical Light',
    opis: 'Close, quiet photography of leaves and petals in natural light — botanical work with a photographic, not illustrated, feel.' },
  { cluster: 'architecture|Line art', name: 'Architectural Sketch',
    opis: 'Buildings reduced to their outline — architectural line studies, precise and unfussy.' },
  { cluster: 'typography-quotes|Minimalism', name: 'Quiet Words',
    opis: 'A few well-chosen words, set simply — typography that reads more like a mood than a message.' },
  { cluster: 'mountains-hiking|Photography', name: 'Summit Trail',
    opis: 'Trail photography from ridge to summit — for anyone who\'d rather be above the treeline than on the sofa.' },
  { cluster: 'sea-coast|Illustration', name: 'Seaside Sketch',
    opis: 'Hand-drawn coastal scenes — driftwood, shells, a line of surf, sketched rather than photographed.' },
  { cluster: 'animals|Line art', name: 'Animal Sketch',
    opis: 'Animals reduced to a single confident outline — a lighter, more graphic take on wildlife art.' },
  { cluster: 'space-astronomy|Illustration', name: 'Cosmic Study',
    opis: 'Illustrated planets, orbits and night skies — a quiet, technical take on space for a study or bedroom wall.' },
  { cluster: 'coffee-tea|Photography', name: 'Slow Morning',
    opis: 'Steam, ceramic, early light — a second set of slow-morning still lifes for a kitchen or breakfast corner.' },
  { cluster: 'ai-technology|Abstract', name: 'Digital Pulse',
    opis: 'Abstract forms with a technical, generative feel — for a home office or study that leans modern.' },
  { cluster: 'symbols-sacred-geometry|Line art', name: 'Sacred Lines',
    opis: 'Geometric line studies built on old, symmetrical forms — a quiet, structured kind of decoration.' },
];

function capitalizeCategory(cat) {
  return String(cat || '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  const used = new Set();
  inv.posters.filter((p) => p.kind === 'gallery-framed' || p.kind === 'gallery').forEach((p) => (p.items || []).forEach((it) => used.add(it.title)));

  let frameColorIdx = 0;
  let roomFramedIdx = 0;
  let roomWallIdx = 0;
  let zbudowaneFramed = 0;
  let zbudowaneWall = 0;
  let bledy = 0;

  for (const motyw of MOTYWY) {
    const [cat, style] = motyw.cluster.split('|');
    const kategoria = motyw.kategoriaOverride || cat;
    const kandydaci = inv.posters.filter((p) =>
      p.category === cat && p.artStyle === style && p.approvedForPrint === true &&
      p.pdfPaths && p.pdfPaths['13x18'] && !used.has(p.title)
    );
    if (kandydaci.length < 4) { console.log('POMIJAM (za malo plakatow): ' + motyw.name); bledy++; continue; }
    const wybrane = kandydaci.slice(0, 4);
    wybrane.forEach((p) => used.add(p.title));

    const naruszeniaFramed = findForbiddenFramed(motyw.opis);
    if (naruszeniaFramed.length) { console.log('ZAKAZANE SLOWA w opisie "' + motyw.name + '": ' + naruszeniaFramed.join(', ')); bledy++; continue; }

    console.log('');
    console.log('=== ' + motyw.name + ' (' + motyw.cluster + ') ===');
    console.log('   plakaty: ' + wybrane.map((p) => p.title).join(' | '));

    // ── ZESTAW + RAMA ──────────────────────────────────────────────────
    if (!motyw.wallOnly) {
      const kolorRamy = FRAME_COLORS[frameColorIdx % FRAME_COLORS.length]; frameColorIdx++;
      const pomieszczenie = ROOMS_FRAMED[roomFramedIdx % ROOMS_FRAMED.length]; roomFramedIdx++;
      const title = motyw.name + ' Grid';
      const handle = toPosterHandle(title);
      if (inv.posters.some((p) => toPosterHandle(p.title) === handle)) {
        console.log('   [rama] HANDLE ZAJETY, pomijam: ' + handle);
        bledy++;
      } else {
        const pozycje = wybrane.map((p) => ({ tytul: p.title, rozmiar: '13x18', poster: p }));
        const rama = opisRamy(kolorRamy);
        const opis = buildFramedDescription({ opisMotywu: motyw.opis, pieceCount: pozycje.length, kolorRamy });
        console.log('   [rama] ' + title + ' | ' + kolorRamy + ' | ' + pomieszczenie + ' | ' +
          cenaOsobnoRamek(pozycje, kolorRamy) + 'zl -> ' + cenaZestawuRamek(pozycje, kolorRamy) + 'zl');

        if (zapis) {
          const katalog = path.join(ROOT, 'posters', '_galerie_ramek', handle);
          const katalogDruk = path.join(katalog, 'druk');
          fs.mkdirSync(katalogDruk, { recursive: true });
          const items = pozycje.map((z) => ({ absPath: path.join(ROOT, z.poster.imagePath), widthCm: 13, heightCm: 18 }));
          try {
            const raw = await buildFramedGridRaw(items, kolorRamy);
            const opisRamyEn = (NAZWY_KOLORU.en[kolorRamy] || kolorRamy) + ' ' + (NAZWY_MATERIALU.en[rama.material] || rama.material) + ' frame';
            const master = path.join(katalog, handle + '_master.jpg');
            await buildFramedMasterLocal(raw.buffer, { width: raw.width, height: raw.height }, master);
            const salon = path.join(katalog, handle + '_salon.jpg');
            await buildFramedInteriorAI(raw.buffer, { pieceCount: pozycje.length, opisRamy: opisRamyEn, roomSlug: pomieszczenie }, salon);
            const thumb = path.join(katalog, handle + '_thumb.jpg');
            await sharp(master).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumb);

            for (const z of pozycje) {
              const zrodlo = (z.poster.pdfPaths || {})['13x18'];
              const nazwa = '13x18_' + path.basename(zrodlo);
              fs.copyFileSync(path.join(ROOT, zrodlo), path.join(katalogDruk, nazwa));
            }

            const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
            const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
            swieza.posters.push({
              id: 'gallery-framed_' + handle,
              kind: 'gallery-framed',
              title, category: kategoria, artStyle: style,
              frameColor: kolorRamy, frameMaterial: rama.material,
              pieceCount: pozycje.length,
              imagePath: rel(master), imagePathThumb: rel(thumb),
              mockups: { interior: rel(salon), generatedAt: new Date().toISOString() },
              items: pozycje.map((p) => ({ title: p.tytul, size: p.rozmiar, pdf: (p.poster.pdfPaths || {})['13x18'], frameSku: 'ramka-' + kolorRamy })),
              priceSeparate: cenaOsobnoRamek(pozycje, kolorRamy),
              price: cenaZestawuRamek(pozycje, kolorRamy),
              colors: Array.from(new Set(pozycje.reduce((s, z) => s.concat(z.poster.colors || []), []))),
              roomCollections: [pomieszczenie],
              orientation: 'portrait',
              createdAt: new Date().toISOString(),
              status: 'ready', approvedForPrint: false,
              shopDescription: opis,
            });
            fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');
            inv.posters = swieza.posters;
            zbudowaneFramed++;
            console.log('   [rama] OK');
          } catch (e) {
            console.log('   [rama] BLAD: ' + e.message);
            bledy++;
          }
        }
      }
    }

    // ── ZESTAW SCIENNY ────────────────────────────────────────────────
    if (!motyw.framedOnly) {
      const pomieszczenie = ROOMS_WALL[roomWallIdx % ROOMS_WALL.length]; roomWallIdx++;
      const title = motyw.name + ' Wall Set';
      const handle = toPosterHandle(title);
      if (inv.posters.some((p) => toPosterHandle(p.title) === handle)) {
        console.log('   [scienny] HANDLE ZAJETY, pomijam: ' + handle);
        bledy++;
      } else {
        const rozmiary = ['40x50', '21x30', '21x30', '30x40'];
        const pozycje = wybrane.map((p, i) => ({ tytul: p.title, rozmiar: rozmiary[i], poster: p }));
        const opis = buildGalleryDescription({ opisMotywu: motyw.opis, pieceCount: pozycje.length, sizes: pozycje.map((p) => p.rozmiar) });
        const naruszeniaGallery = findForbiddenGallery(opis);
        if (naruszeniaGallery.length) {
          console.log('   [scienny] ZAKAZANE SLOWA: ' + naruszeniaGallery.join(', '));
          bledy++;
        } else {
          console.log('   [scienny] ' + title + ' | ' + pomieszczenie + ' | ' +
            cenaOsobnoScienny(pozycje) + 'zl -> ' + cenaZestawuScienny(pozycje) + 'zl');

          if (zapis) {
            const katalog = path.join(ROOT, 'posters', '_galerie', handle);
            const katalogDruk = path.join(katalog, 'druk');
            fs.mkdirSync(katalogDruk, { recursive: true });
            const cm = (r) => r.split('x').map(Number);
            const items = pozycje.map((z) => { const [w, h] = cm(z.rozmiar); return { absPath: path.join(ROOT, z.poster.imagePath), widthCm: w, heightCm: h }; });
            try {
              const master = path.join(katalog, handle + '_master.jpg');
              await buildGalleryMaster(items, master);
              const packshot = path.join(katalog, handle + '_packshot.jpg');
              await buildGalleryPackshot(items, packshot);
              const salon = path.join(katalog, handle + '_salon.jpg');
              await buildGalleryInterior(items, salon, { roomId: undefined });
              const thumb = path.join(katalog, handle + '_thumb.jpg');
              await sharp(master).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(thumb);

              for (const z of pozycje) {
                const zrodlo = (z.poster.pdfPaths || {})[z.rozmiar];
                const nazwa = z.rozmiar + '_' + path.basename(zrodlo);
                fs.copyFileSync(path.join(ROOT, zrodlo), path.join(katalogDruk, nazwa));
              }

              const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
              const swieza = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
              swieza.posters.push({
                id: 'gallery_' + handle,
                kind: 'gallery',
                title, category: kategoria, artStyle: style,
                pieceCount: pozycje.length,
                imagePath: rel(master), imagePathThumb: rel(thumb),
                imagePathPackshot: rel(packshot),
                mockups: { interior: rel(salon), generatedAt: new Date().toISOString() },
                items: pozycje.map((p) => ({ title: p.tytul, size: p.rozmiar, pdf: (p.poster.pdfPaths || {})[p.rozmiar] })),
                priceSeparate: cenaOsobnoScienny(pozycje),
                price: cenaZestawuScienny(pozycje),
                colors: Array.from(new Set(pozycje.reduce((s, z) => s.concat(z.poster.colors || []), []))),
                roomCollections: [pomieszczenie],
                orientation: 'portrait',
                createdAt: new Date().toISOString(),
                status: 'ready', approvedForPrint: false,
                shopDescription: opis,
              });
              fs.writeFileSync(INVENTORY, JSON.stringify(swieza, null, 2) + '\n', 'utf8');
              inv.posters = swieza.posters;
              zbudowaneWall++;
              console.log('   [scienny] OK');
            } catch (e) {
              console.log('   [scienny] BLAD: ' + e.message);
              bledy++;
            }
          }
        }
      }
    }
  }

  console.log('');
  console.log('=== PODSUMOWANIE ===');
  console.log('Zbudowane zestawy+rama: ' + zbudowaneFramed);
  console.log('Zbudowane zestawy scienne: ' + zbudowaneWall);
  console.log('Bledy/pominiete: ' + bledy);
  if (!zapis) console.log('To byla PROBA — nic nie zapisano. Dodaj --wykonaj.');
})().catch((e) => { console.error('BLAD KRYTYCZNY:', e); process.exit(1); });
