/**
 * Generowanie zestawow: panorama -> kontrola ciecia -> panele -> wizualizacje -> rekord.
 *
 * Panorama powstaje jako JEDEN obraz, zeby galezie i horyzont przechodzily przez
 * ramy idealnie. Po generacji sprawdzamy, czy linie ciecia wypadly na spokojnym
 * tle — model potrafi zignorowac instrukcje z promptu, co udowodnil test,
 * w ktorym lodka wypadla dokladnie na ciecu.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const { routePromptBuildResult } = require('./promptRouter');
const { planLayout, splitIntoPanels, inspectCutLines, inspectPanelContent, isKnownLayout } = require('./posterSetSplitter');
const {
  buildSetThumbnail,
  buildSetPackshot,
  buildSetInterior,
  buildSetSheets,
  buildSetStack,
} = require('./posterSetVisuals');
const { makeSafeFileBase, assertHandleGloballyUnique } = require('./posterNameGuard');
const { getAesthetic } = require('./aesthetics');

/**
 * Gorny limit prob. Uzytkownik wybral "powtarzaj az do skutku", ale limit
 * musi istniec: kazda proba to okolo 130 sekund i oplata za wywolanie API.
 * Przy uporczywym temacie brak limitu oznaczalby nieograniczony koszt.
 */
function getMaxAttempts() {
  const n = parseInt(process.env.SET_CUT_MAX_ATTEMPTS || '8', 10);
  return Number.isFinite(n) && n >= 1 ? n : 8;
}

/** Katalog zestawow — poza zwyklymi plakatami, zeby skaner ich nie mieszal. */
/**
 * Katalog wyjsciowy zestawu.
 *
 * Podanie `fileBase` daje KAZDEMU ZESTAWOWI WLASNY KATALOG — tak samo jak przy
 * pojedynczych plakatach. Zestaw to kilkanascie plikow (panorama, panele, piec
 * wizualizacji, a po zatwierdzeniu 12-18 PDF-ow), wiec bez tego katalog stylu
 * zapycha sie po kilku zestawach.
 *
 * @param {string} projectRoot
 * @param {string} category
 * @param {string} style
 * @param {string} [fileBase] bezpieczna nazwa bazowa zestawu
 */
function setOutputDir(projectRoot, category, style, fileBase) {
  const dir = path.join(projectRoot, 'posters', '_zestawy', category, String(style || '').toLowerCase());
  const base = String(fileBase || '').trim();
  return base ? path.join(dir, base) : dir;
}

/**
 * Prompt panoramy: tresc z routera (kategoria, styl, estetyka) plus zasady
 * kompozycji specyficzne dla zestawu.
 *
 * Zasady kadru pojedynczego plakatu tu NIE pasuja — wymagaja zmieszczenia tematu
 * w srodkowych 90%, co przy panoramie cietej na panele nie ma sensu.
 */
function buildPanoramaPrompt({ category, style, title, aesthetic, layout }) {
  const plan = planLayout(layout);
  const cols = plan.cols;
  const cuts =
    cols === 2
      ? 'the single vertical cut line at the middle of the width'
      : 'the two vertical cut lines at one third and two thirds of the width';

  const routed = routePromptBuildResult({ category, style, title, aesthetic });

  /**
   * Blok SAFE PRINT FRAMING wymaga zmieszczenia tematu w srodkowych 90%
   * i pozostawienia 5% czystego tla przy kazdej krawedzi. Dla zestawu to
   * SPRZECZNE z pelnym spadem: panorama ma wypelniac plotno od krawedzi
   * do krawedzi. Zostawienie obu instrukcji dawaloby modelowi sprzeczne
   * polecenia, wiec blok usuwamy z promptu panoramy.
   */
  // Dopasowanie do NAGLOWKA sekcji, nie do dowolnej wzmianki. Blok estetyki
  // zawiera zdanie "...or the safe print framing above", wiec filtr ignorujacy
  // wielkosc liter usuwal takze estetyke.
  const withoutSafeFraming = routed.imagePrompt
    .split(/\n\s*\n/)
    .filter((block) => !/^\s*SAFE PRINT FRAMING/.test(block))
    .join('\n\n');

  const base = { imagePrompt: withoutSafeFraming };

  const panoramaRules = [
    `PANORAMIC SET — the artwork will be cut into ${cols} equal vertical panels and hung as separate framed prints with a gap between them.`,
    `- The scene must read as ONE continuous landscape across the full width. Horizon, branches, mist and water flow uninterrupted from the left edge to the right edge.`,
    `- Keep ${cuts} over calm, low-detail areas: open water, empty sky, plain mist or flat background. NO object, animal, boat, building, figure or sharp silhouette may sit on or near a cut line.`,
    `- Place the points of interest in the MIDDLE of each panel, well away from panel edges.`,
    `- Each panel must work as a standalone poster; distribute interest evenly across all ${cols}.`,
    `- Do not centre the whole composition on one dominant hero object.`,
    `- Full bleed: the artwork fills the entire canvas edge to edge. No border, no mat, no frame.`,
  ].join('\n');

  return `${base.imagePrompt}\n\n${panoramaRules}`;
}

/**
 * Generuje panorame i powtarza, dopoki linie ciecia nie wypadna czysto.
 *
 * Kolejne proby dostaja coraz mocniejsze wskazanie, zeby model faktycznie
 * odsunal obiekty od ciec — samo powtorzenie tego samego promptu czesto daje
 * ten sam blad.
 *
 * @returns {Promise<{ path, attempts, inspection, rejected: object[] }>}
 */
async function generateCleanPanorama({ imageGen, promptBase, layout, outAbs, onProgress }) {
  const plan = planLayout(layout);
  const maxAttempts = getMaxAttempts();
  const rejected = [];

  const prevSize = process.env.IMAGE_GENERATION_SIZE;
  const prevW = process.env.IMAGE_TARGET_WIDTH;
  const prevH = process.env.IMAGE_TARGET_HEIGHT;
  const prevSafe = process.env.ENABLE_SAFE_FRAMING;
  const prevUpscale = process.env.POSTER_UPSCALE_ON_SAVE;

  // Plotno docelowe MUSI odpowiadac panoramie. Przy domyslnym 2000x3000
  // resizeToPrintCanvas wpasowalby szeroki obraz w pionowy kadr i dolozyl
  // marginesy, zostawiajac polowe rozdzielczosci.
  process.env.IMAGE_GENERATION_SIZE = `${plan.width}x${plan.height}`;
  process.env.IMAGE_TARGET_WIDTH = String(plan.width);
  process.env.IMAGE_TARGET_HEIGHT = String(plan.height);
  // Walidacja marginesow zaklada pojedynczy plakat i odrzucalaby kazda panorame.
  process.env.ENABLE_SAFE_FRAMING = '0';
  process.env.POSTER_UPSCALE_ON_SAVE = '0';

  try {
    let ostatniPowod = 'szczegół na linii cięcia';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Wskazowka mowi, CZEGO CHCEMY, nie tylko czego nie chcemy.
      //
      // Pierwotna wersja brzmiala "odsun WSZYSTKIE obiekty daleko od linii ciecia
      // i zostaw tam czyste tlo". Tryptyk ma dwie linie ciecia i obie otaczaja
      // panel srodkowy, wiec po kilku probach model oproznial dokladnie ten obszar
      // — ciecia wychodzily czyste, a srodkowy plakat pusty jak kartka.
      // Teraz kazdy panel musi miec wlasny motyw, a spokojne maja byc tylko
      // WASKIE pasy dokladnie na ciecach.
      const nudge =
        attempt === 1
          ? ''
          : `\n\nATTEMPT ${attempt}: the previous version was rejected (${ostatniPowod}). ` +
            'Keep ONLY a narrow vertical band exactly at each cut line free of important detail. ' +
            'EVERY panel of the set must still contain its own distinct focal subject — ' +
            'none of them may end up as empty background or flat sky. ' +
            'Redistribute the composition so the subjects sit in the MIDDLE of each panel.';

      if (onProgress) onProgress({ phase: 'generate', attempt, maxAttempts });
      await imageGen.generateImage('set', '', '', outAbs, { customPrompt: promptBase + nudge });

      if (onProgress) onProgress({ phase: 'inspect', attempt, maxAttempts });
      const inspection = await inspectCutLines(outAbs, layout);
      const content = await inspectPanelContent(outAbs, layout);

      if (inspection.ok && content.ok) {
        return { path: outAbs, attempts: attempt, inspection, content, rejected };
      }

      if (!inspection.ok) {
        ostatniPowod = 'detail landed on a cut line';
        rejected.push({ attempt, powod: 'ciecie', cuts: inspection.cuts });
        console.warn(
          `    ⚠ Próba ${attempt}/${maxAttempts}: szczegół na linii cięcia (${inspection.cuts
            .map((c) => `${c.ratio}×`)
            .join(', ')}) — powtarzam.`
        );
      } else {
        const puste = content.panels.filter((p) => !p.ok).map((p) => p.index);
        ostatniPowod = 'one panel was almost empty';
        rejected.push({ attempt, powod: 'pusty panel', panels: content.panels });
        console.warn(
          `    ⚠ Próba ${attempt}/${maxAttempts}: panel ${puste.join(', ')} niemal pusty (${content.panels
            .map((p) => `${p.ratio}×`)
            .join(', ')}) — powtarzam.`
        );
      }
    }

    throw new Error(
      `Nie udało się uzyskać poprawnej panoramy w ${maxAttempts} próbach ` +
        `(czyste cięcia + treść w każdym panelu). Zmień temat lub podnieś SET_CUT_MAX_ATTEMPTS.`
    );
  } finally {
    // Zmienne srodowiskowe sa globalne — bez przywrocenia zepsulibysmy
    // generowanie zwyklych plakatow w tym samym procesie.
    process.env.IMAGE_GENERATION_SIZE = prevSize;
    process.env.IMAGE_TARGET_WIDTH = prevW;
    process.env.IMAGE_TARGET_HEIGHT = prevH;
    process.env.ENABLE_SAFE_FRAMING = prevSafe;
    process.env.POSTER_UPSCALE_ON_SAVE = prevUpscale;
  }
}

/**
 * Pelny przebieg: panorama, panele, wizualizacje, rekord zestawu.
 *
 * @returns {Promise<object>} rekord gotowy do zapisania w inventory
 */
async function generateSet({
  projectRoot,
  imageGen,
  category,
  style,
  title,
  // Motyw do PROMPTU, oddzielony od tytulu produktu.
  //
  // Tytul zestawu zawiera etykiete ("Set of 3 Prints — ..."), ktora jest konieczna
  // dla unikalnosci handla, ale jako opis tematu jest trujaca: model rozpoznal
  // z niej temat jako "set" i zamiast gaju bambusowego malowalby "zestaw".
  // Do promptu ma isc sam motyw; etykieta zostaje przy nazwie produktu.
  subjectTitle,
  aesthetic = '',
  layout = 'tryptyk',
  existingPosters = [],
  onProgress,
}) {
  if (!isKnownLayout(layout)) throw new Error(`Nieznany układ zestawu: ${layout}`);
  assertHandleGloballyUnique(title, existingPosters);

  const plan = planLayout(layout);
  // Kazdy zestaw dostaje wlasny katalog — patrz setOutputDir.
  const base = makeSafeFileBase(title);
  const outDir = setOutputDir(projectRoot, category, style, base);
  fs.mkdirSync(outDir, { recursive: true });

  const panoramaAbs = path.join(outDir, `${base}.png`);

  const motyw = String(subjectTitle || '').trim() || title;
  const prompt = buildPanoramaPrompt({ category, style, title: motyw, aesthetic, layout });
  const gen = await generateCleanPanorama({
    imageGen,
    promptBase: prompt,
    layout,
    outAbs: panoramaAbs,
    onProgress,
  });

  if (onProgress) onProgress({ phase: 'split' });
  const split = await splitIntoPanels(panoramaAbs, layout, { outputDir: outDir, baseName: base });

  if (onProgress) onProgress({ phase: 'visuals' });
  const panelPaths = split.panels.map((p) => p.path);
  const thumbAbs = path.join(outDir, `${base}_zestaw_thumb.jpg`);
  const packAbs = path.join(outDir, `${base}_mockup_frame.png`);
  const interiorAbs = path.join(outDir, `${base}_mockup_interior.jpg`);
  const interior2Abs = path.join(outDir, `${base}_mockup_interior2.jpg`);
  const sheetsAbs = path.join(outDir, `${base}_arkusze.png`);
  const stackAbs = path.join(outDir, `${base}_kaskada.png`);

  await buildSetThumbnail(panelPaths, thumbAbs);
  await buildSetPackshot(panelPaths, packAbs);
  // Salon 1 — zawsze nad sofa, ten sam kadr dla kazdego zestawu, zeby siatka byla spojna.
  await buildSetInterior(panelPaths, interiorAbs);
  // Salon 2 — dobierany do kategorii, zeby Cyberpunk nie dostawal tego samego
  // jasnego wnetrza co Japonia.
  await buildSetInterior(panelPaths, interior2Abs, { secondary: true, category });
  // "Co dostajesz" — arkusze bez ram, ostatnie zdjecie w galerii.
  await buildSetSheets(panelPaths, sheetsAbs);
  // Kaskada — PIERWSZE zdjecie w sklepie. Pokazuje ciaglosc motywu miedzy arkuszami.
  await buildSetStack(panelPaths, stackAbs);

  const rel = (abs) => path.relative(projectRoot, abs).replace(/\\/g, '/');
  const aestheticInfo = getAesthetic(aesthetic);

  return {
    id: `${category}_${base}_${Math.random().toString(16).slice(2, 10)}`,
    kind: 'set',
    layout,
    panelCount: plan.panelCount,
    category,
    artStyle: style,
    // ORIENTACJA POJEDYNCZEGO PANELU, nie panoramy.
    //
    // Kupujacy wiesza pionowe panele obok siebie, wiec dla filtra orientacji
    // na stronie zestaw jest pionowy — mimo ze zrodlowa panorama jest szeroka.
    // Wszystkie 47 wczesniejszych zestawow ma tu "portrait"; nowe rekordy tego
    // pola NIE MIALY, wiec wypadaly z filtra orientacji po cichu. Audyt
    // zglaszal to jako DROBNE, a eksport szedl bez tagu i nic nie protestowalo.
    orientation: 'portrait',
    aesthetic: aestheticInfo ? aestheticInfo.id : '',
    title,
    // imagePath wskazuje panorame: to tozsamosc rekordu dla dedupe i unikalnosci handli.
    imagePath: rel(panoramaAbs),
    // Miniatura zestawu jest tym, co widzi klient — panele obok siebie.
    imagePathThumb: rel(thumbAbs),
    panels: split.panels.map((p) => ({
      index: p.index,
      imagePath: rel(p.path),
      width: p.width,
      height: p.height,
      pdfPaths: {},
    })),
    mockups: {
      frame: rel(packAbs),
      interior: rel(interiorAbs),
      interior2: rel(interior2Abs),
      sheets: rel(sheetsAbs),
      stack: rel(stackAbs),
      generatedAt: new Date().toISOString(),
    },
    // Zestawy sa wylacznie bez marginesu.
    printLayout: 'full',
    matFrame: false,
    prompt,
    promptLlmProvider: 'template',
    createdAt: new Date().toISOString(),
    status: 'ready',
    approvedForPrint: false,
    setMeta: {
      attempts: gen.attempts,
      rejectedAttempts: gen.rejected.length,
      cutInspection: gen.inspection,
      generationSize: `${plan.width}x${plan.height}`,
      panelSize: `${plan.panelWidth}x${plan.panelHeight}`,
    },
  };
}

/**
 * Generuje pliki do druku dla kazdego panelu i dopisuje sciezki do rekordu.
 *
 * Kazdy panel to osobny wydruk, wiec kazdy dostaje wlasny komplet rozmiarow.
 * Przyrostek w nazwie (panel1, panel2...) trzyma pliki rozroznialne w katalogu.
 *
 * Panele maja 1280x1920, a druk 50x70 wymaga 5906x8268 — powiekszeniem zajmuje
 * sie generator PDF przy rasteryzacji, tak samo jak przy pojedynczych plakatach.
 *
 * @param {object} record rekord zestawu z generateSet (mutowany)
 * @returns {Promise<object>} ten sam rekord z wypelnionymi pdfPaths
 */
async function buildSetPdfs({ projectRoot, pdfGen, record, onProgress }) {
  const outDir = path.join(projectRoot, path.dirname(record.imagePath));
  let done = 0;

  for (const panel of record.panels) {
    if (onProgress) onProgress({ phase: 'pdf', panel: panel.index, total: record.panels.length });
    const abs = path.join(projectRoot, panel.imagePath);
    const results = await pdfGen.createMultisizePDF(abs, record.title, outDir, {
      nameInfix: `panel${panel.index}`,
      // Zestawy sa bez marginesu — pelny spad, bez passe-partout.
      printLayout: 'full',
      matFrame: false,
    });

    const rel = {};
    for (const [sizeKey, value] of Object.entries(results)) {
      if (typeof value === 'string' && value.startsWith('ERROR')) continue;
      rel[sizeKey] = path.relative(projectRoot, value).replace(/\\/g, '/');
    }
    panel.pdfPaths = rel;
    done += Object.keys(rel).length;
  }

  record.setMeta = { ...(record.setMeta || {}), pdfCount: done };
  return record;
}

/**
 * Dopisuje zestaw do inventory.
 *
 * Zapis jest JAWNY, bo skaner katalogu posters/ omija katalogi zaczynajace sie
 * od podkreslenia. Inaczej panorama i kazdy panel trafialyby do biblioteki jako
 * osobne plakaty i zestaw rozpadalby sie na cztery kafelki.
 *
 * @returns {{ added: boolean, total: number }}
 */
function saveSetToInventory(projectRoot, record) {
  const invPath = path.join(projectRoot, 'posters_inventory.json');
  const inv = fs.existsSync(invPath)
    ? JSON.parse(fs.readFileSync(invPath, 'utf8'))
    : { posters: [], createdAt: new Date().toISOString() };
  if (!Array.isArray(inv.posters)) inv.posters = [];

  const key = String(record.imagePath || '').toLowerCase();
  const existing = inv.posters.findIndex((p) => String(p.imagePath || '').toLowerCase() === key);
  if (existing >= 0) {
    inv.posters[existing] = record;
  } else {
    inv.posters.push(record);
  }

  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2), 'utf8');
  return { added: existing < 0, total: inv.posters.length };
}

module.exports = {
  getMaxAttempts,
  setOutputDir,
  buildPanoramaPrompt,
  generateCleanPanorama,
  generateSet,
  buildSetPdfs,
  saveSetToInventory,
};
