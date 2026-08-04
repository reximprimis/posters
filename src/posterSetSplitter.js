/**
 * Ciecie jednej szerokiej grafiki na panele zestawu (tryptyk, dyptyk, siatka).
 *
 * Dlaczego jedna grafika, a nie N osobnych generacji: tylko wtedy galaz, horyzont
 * czy tafla wody PRZECHODZA przez ramy idealnie — bo to fizycznie ten sam obraz.
 * Osobne generacje daja ciaglosc przyblizona i widoczne rozjazdy na stykach.
 *
 * Ograniczenie, ktore ksztaltuje cala liste ukladow: model przyjmuje proporcje
 * najwyzej 3:1, a kazdy panel ma 2:3. Dlatego 5 i wiecej paneli W RZEDZIE nie
 * da sie wygenerowac jako jeden obraz — takie zestawy trzeba budowac inaczej.
 */

const path = require('path');
const sharp = require('sharp');

/**
 * Ograniczenia gpt-image-2.
 *
 * MODEL_MAX_EDGE ustalony EMPIRYCZNIE — API odrzuca 4064x2032 komunikatem
 * "The longest edge must be less than or equal to 3840", mimo ze rozmiar
 * miesci sie w limicie pikseli i proporcji. Walidator w dalleImageGenerator.js
 * tego warunku nie sprawdzal.
 */
const MODEL_MAX_PIXELS = 8294400;
const MODEL_MAX_RATIO = 3;
const MODEL_MAX_EDGE = 3840;
const PANEL_RATIO_W = 2;
const PANEL_RATIO_H = 3;

/**
 * Uklady zestawow. `cols` x `rows` paneli, kazdy w proporcji 2:3.
 * `upscale` liczony wzgledem dluzszego boku druku 50x70 cm (5906 px).
 */
/**
 * Tylko dwa uklady — decyzja podjeta na podstawie rozdzielczosci panelu.
 *
 * 4 w rzedzie daje panel 960x1440, a siatka 2x2 panel 1168x1760. Przy druku
 * 50x70 cm oznacza to powiekszenie odpowiednio 6,15x i 5,06x, podczas gdy
 * pojedynczy plakat wymaga 2,95x. Za malo pikseli na jakosc druku.
 */
const LAYOUTS = [
  { id: 'duo', label: 'Dyptyk — 2 w rzędzie', cols: 2, rows: 1 },
  { id: 'tryptyk', label: 'Tryptyk — 3 w rzędzie', cols: 3, rows: 1 },
];

const BY_ID = new Map(LAYOUTS.map((l) => [l.id, l]));

function isKnownLayout(id) {
  return BY_ID.has(String(id || '').trim());
}

/** Zaokraglenie w dol do wielokrotnosci 16 — wymog rozmiaru obrazu w API. */
function floor16(n) {
  return Math.floor(n / 16) * 16;
}

/**
 * Największy rozmiar generacji dla ukladu, mieszczacy sie w limitach modelu.
 * @returns {{ width, height, panelWidth, panelHeight, ratio, withinLimits }}
 */
function planLayout(layoutId) {
  const layout = BY_ID.get(String(layoutId || '').trim());
  if (!layout) throw new Error(`Nieznany układ zestawu: ${layoutId}`);

  const ratio = (PANEL_RATIO_W * layout.cols) / (PANEL_RATIO_H * layout.rows);
  const withinLimits = ratio <= MODEL_MAX_RATIO && ratio >= 1 / MODEL_MAX_RATIO;

  // Najpierw limit pikseli, potem docisniecie do limitu dluzszej krawedzi.
  let height = floor16(Math.sqrt(MODEL_MAX_PIXELS / ratio));
  let width = floor16(height * ratio);

  if (width > MODEL_MAX_EDGE) {
    width = floor16(MODEL_MAX_EDGE);
    height = floor16(width / ratio);
  }
  if (height > MODEL_MAX_EDGE) {
    height = floor16(MODEL_MAX_EDGE);
    width = floor16(height * ratio);
  }

  return {
    ...layout,
    ratio,
    withinLimits,
    width,
    height,
    // Panele licza sie z faktycznych wymiarow, zeby suma zawsze pokryla obraz.
    panelWidth: Math.floor(width / layout.cols),
    panelHeight: Math.floor(height / layout.rows),
    panelCount: layout.cols * layout.rows,
  };
}

function listLayouts() {
  return LAYOUTS.map((l) => {
    const p = planLayout(l.id);
    return {
      id: l.id,
      label: l.label,
      cols: l.cols,
      rows: l.rows,
      panelCount: p.panelCount,
      generationSize: `${p.width}x${p.height}`,
      panelSize: `${p.panelWidth}x${p.panelHeight}`,
      withinLimits: p.withinLimits,
    };
  });
}

/**
 * Tnie plik na panele i zapisuje je obok, z sufiksem kolejnosci.
 *
 * Ostatnia kolumna i ostatni wiersz dostaja RESZTE pikseli zamiast stalej
 * szerokosci — inaczej przy niepodzielnych wymiarach gubilibysmy pas obrazu
 * przy krawedzi.
 *
 * @param {string} sourceAbsPath
 * @param {string} layoutId
 * @param {{ outputDir?: string, baseName?: string }} [opts]
 * @returns {Promise<{ layout: object, panels: {index, path, width, height}[] }>}
 */
async function splitIntoPanels(sourceAbsPath, layoutId, opts = {}) {
  const layout = BY_ID.get(String(layoutId || '').trim());
  if (!layout) throw new Error(`Nieznany układ zestawu: ${layoutId}`);

  const meta = await sharp(sourceAbsPath).metadata();
  const srcW = meta.width;
  const srcH = meta.height;
  if (!srcW || !srcH) throw new Error('Nie udało się odczytać wymiarów obrazu źródłowego.');

  const outputDir = opts.outputDir || path.dirname(sourceAbsPath);
  const baseName = opts.baseName || path.basename(sourceAbsPath, path.extname(sourceAbsPath));

  const baseW = Math.floor(srcW / layout.cols);
  const baseH = Math.floor(srcH / layout.rows);

  const panels = [];
  let index = 0;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      index += 1;
      const left = c * baseW;
      const top = r * baseH;
      const width = c === layout.cols - 1 ? srcW - left : baseW;
      const height = r === layout.rows - 1 ? srcH - top : baseH;

      const outPath = path.join(outputDir, `${baseName}_panel${index}.png`);
      await sharp(sourceAbsPath).extract({ left, top, width, height }).png().toFile(outPath);
      panels.push({ index, path: outPath, width, height });
    }
  }

  return { layout: { ...layout, panelCount: layout.cols * layout.rows }, panels };
}

/**
 * Szerokosc badanego pasa przy linii ciecia, jako ulamek szerokosci panelu.
 * Waski pas wystarczy — chodzi o to, co realnie znajdzie sie przy krawedzi ramy.
 */
const CUT_PROBE_RATIO = 0.06;

/**
 * Ile razy pas przy ciecu moze byc bardziej szczegolowy od calego obrazu,
 * zanim uznamy ciecie za zle. Ustalone na tescie: panorama, w ktorej lodka
 * wypadla na ciecu, dala okolo 1,35x.
 */
const CUT_DETAIL_LIMIT = 1.25;

/**
 * Gestosc krawedzi — miara tego, czy w danym miejscu jest KONKRETNY OBIEKT.
 *
 * Nie odchylenie standardowe jasnosci: to zbyt zgrubna miara. Na pelnej
 * wysokosci panoramy dominuje ja uklad niebo-gory-woda, a mala lodka na linii
 * ciecia ledwo nia rusza. Filtr Laplace'a reaguje na kontury, wiec pojedynczy
 * obiekt na spokojnym tle wyraznie podnosi wynik.
 *
 * Przyjmuje BUFOR, nie potok sharp: stats() czyta obraz wejsciowy i pomija
 * wczesniejsze operacje, wiec wycinek trzeba najpierw zmaterializowac.
 */
/** Na ile poziomych blokow dzielimy pas przy pomiarze. */
const PROBE_BLOCKS = 12;

/**
 * Najwiekszy szczegol w pasie, liczony blokami.
 *
 * Swiadomie MAKSIMUM z blokow, a nie srednia z calego pasa. Lodka zajmuje waski
 * pas w pionie; przy usrednianiu po calej wysokosci ginie w tle galezi i gor —
 * zmierzone 22,62 przy sredniej calego obrazu 22,89, czyli nie do odroznienia.
 * Maksimum z blokow wylapuje obiekt tam, gdzie faktycznie jest.
 *
 * Przyjmuje BUFOR, nie potok sharp: stats() i raw() czytaja obraz wejsciowy
 * pomijajac wczesniejsze operacje, wiec wycinek trzeba zmaterializowac.
 */
async function measureEdgeEnergy(buffer) {
  const img = sharp(buffer)
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const blockH = Math.max(1, Math.floor(info.height / PROBE_BLOCKS));
  let best = 0;
  for (let b = 0; b < PROBE_BLOCKS; b++) {
    const top = b * blockH;
    const bottom = b === PROBE_BLOCKS - 1 ? info.height : top + blockH;
    let sum = 0;
    let count = 0;
    for (let y = top; y < bottom; y++) {
      const row = y * info.width;
      for (let x = 0; x < info.width; x++) {
        sum += data[row + x];
        count += 1;
      }
    }
    const avg = count ? sum / count : 0;
    if (avg > best) best = avg;
  }
  return best;
}

/**
 * Sprawdza, czy linie ciecia wypadaja na spokojnym tle.
 *
 * Powod: model potrafi zignorowac instrukcje z promptu. W tescie panoramy
 * lodka wypadla dokladnie na ciecu miedzy panelem 1 a 2 — przy odstepie
 * 3-5 cm miedzy ramami wyglada to na blad, a nie zamysl.
 *
 * Ta sama zasada, co pikselowa walidacja marginesow pojedynczych plakatow:
 * nie ufamy promptowi, tylko sprawdzamy wynik.
 *
 * @returns {Promise<{ ok: boolean, cuts: {x, detail, ratio, ok}[], baseline: number }>}
 */
async function inspectCutLines(sourceAbsPath, layoutId) {
  const layout = BY_ID.get(String(layoutId || '').trim());
  if (!layout) throw new Error(`Nieznany układ zestawu: ${layoutId}`);

  const meta = await sharp(sourceAbsPath).metadata();
  const srcW = meta.width;
  const srcH = meta.height;
  const baseline = await measureEdgeEnergy(await sharp(sourceAbsPath).png().toBuffer());

  const panelW = Math.floor(srcW / layout.cols);
  const probe = Math.max(8, Math.round(panelW * CUT_PROBE_RATIO));

  const cuts = [];
  for (let c = 1; c < layout.cols; c++) {
    const x = c * panelW;
    const left = Math.max(0, x - Math.floor(probe / 2));
    const width = Math.min(probe, srcW - left);
    const strip = await sharp(sourceAbsPath)
      .extract({ left, top: 0, width, height: srcH })
      .png()
      .toBuffer();
    const detail = await measureEdgeEnergy(strip);
    const ratio = baseline > 0 ? detail / baseline : 0;
    cuts.push({ x, detail: Number(detail.toFixed(2)), ratio: Number(ratio.toFixed(3)), ok: ratio <= CUT_DETAIL_LIMIT });
  }

  return { ok: cuts.every((c) => c.ok), cuts, baseline: Number(baseline.toFixed(2)) };
}

module.exports = {
  LAYOUTS,
  MODEL_MAX_PIXELS,
  MODEL_MAX_RATIO,
  MODEL_MAX_EDGE,
  CUT_DETAIL_LIMIT,
  measureEdgeEnergy,
  inspectCutLines,
  isKnownLayout,
  planLayout,
  listLayouts,
  splitIntoPanels,
};
