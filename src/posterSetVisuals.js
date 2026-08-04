/**
 * Wizualizacje zestawow: miniatura do biblioteki i sklepu, packshot, salon.
 *
 * Skladane LOKALNIE przez sharp, nie przez model obrazu. Powod jest praktyczny:
 * mockup zestawu wymaga umieszczenia 2-3 ROZNYCH grafik w osobnych ramach we
 * wlasciwej kolejnosci. Model dostaje jeden obraz na wejsciu i musialby sam go
 * rozdzielic — przy tescie panoramy juz raz zignorowal instrukcje o liniach
 * ciecia. Skladanie lokalne jest deterministyczne, darmowe i zawsze trafia.
 *
 * Zestawy sa WYLACZNIE bez marginesu (full bleed) — panel wypelnia rame
 * od krawedzi do krawedzi.
 */

const sharp = require('sharp');

/** Proporcja panelu 2:3 — jak pojedynczy plakat. */
const PANEL_RATIO = 2 / 3;

const DEFAULTS = {
  /** Odstep miedzy ramami jako ulamek szerokosci panelu. */
  gapRatio: 0.08,
  /** Grubosc ramy jako ulamek szerokosci panelu. Zestawy: cienka czarna rama. */
  frameRatio: 0.028,
  frameColor: '#1a1a1a',
  background: '#efece7',
  /** Margines wokol calej kompozycji, ulamek jej szerokosci. */
  marginRatio: 0.09,
};

/** Laczy opcje z domyslnymi, POMIJAJAC undefined — inaczej nieustawione pola nadpisywalyby wartosci domyslne wartoscia undefined i dawaly NaN. */
function mergeOptions(opts = {}) {
  const out = { ...DEFAULTS };
  for (const [k, v] of Object.entries(opts)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function svgBuffer(svg) {
  return Buffer.from(svg);
}

/**
 * Panel w ramie: czarna ramka + grafika wypelniajaca wnetrze bez marginesu.
 * @returns {Promise<{ buffer: Buffer, width: number, height: number }>}
 */
async function renderFramedPanel(panelPath, panelWidth, opts = {}) {
  const cfg = mergeOptions(opts);
  const frame = Math.max(2, Math.round(panelWidth * cfg.frameRatio));
  const innerW = panelWidth - frame * 2;
  const innerH = Math.round(innerW / PANEL_RATIO);
  const totalH = innerH + frame * 2;

  // Grafika wypelnia wnetrze od krawedzi do krawedzi — zestawy sa full bleed.
  const art = await sharp(panelPath)
    .resize(innerW, innerH, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const frameSvg = `
<svg width="${panelWidth}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${cfg.frameColor}"/>
</svg>`.trim();

  const buffer = await sharp(svgBuffer(frameSvg))
    .composite([{ input: art, left: frame, top: frame }])
    .png()
    .toBuffer();

  return { buffer, width: panelWidth, height: totalH };
}

/**
 * Uklada oprawione panele w rzedzie na tle, z cieniem pod kazdym.
 * Wspolny mechanizm dla miniatury i packshotu.
 */

async function composeRow(panelPaths, opts = {}) {
  const { panelWidth, withShadow = true, ...rest } = opts;
  const cfg = mergeOptions(rest);
  const gap = Math.round(panelWidth * cfg.gapRatio);

  const framed = [];
  for (const p of panelPaths) framed.push(await renderFramedPanel(p, panelWidth, cfg));

  const rowW = framed.reduce((a, f) => a + f.width, 0) + gap * (framed.length - 1);
  const rowH = Math.max(...framed.map((f) => f.height));
  const margin = Math.round(rowW * cfg.marginRatio);
  const canvasW = rowW + margin * 2;
  const canvasH = rowH + margin * 2;

  const base = await sharp(
    svgBuffer(`<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${cfg.background}"/>
    </svg>`)
  )
    .png()
    .toBuffer();

  const layers = [];
  let x = margin;
  for (const f of framed) {
    const y = margin + Math.round((rowH - f.height) / 2);
    if (withShadow) {
      const pad = Math.round(panelWidth * 0.06);
      const shadow = await sharp(
        svgBuffer(`<svg width="${f.width + pad * 2}" height="${f.height + pad * 2}" xmlns="http://www.w3.org/2000/svg">
          <defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="${Math.round(pad / 2.4)}"/></filter></defs>
          <rect x="${pad}" y="${pad + Math.round(pad / 3)}" width="${f.width}" height="${f.height}"
                fill="rgba(0,0,0,0.26)" filter="url(#b)"/>
        </svg>`)
      )
        .png()
        .toBuffer();
      layers.push({ input: shadow, left: x - pad, top: y - pad });
    }
    layers.push({ input: f.buffer, left: x, top: y });
    x += f.width + gap;
  }

  return sharp(base).composite(layers).png().toBuffer();
}

/**
 * Miniatura zestawu do biblioteki i sklepu — panele obok siebie tak, jak wisza
 * na scianie. To jest obraz, ktory klient widzi jako pierwszy.
 */
async function buildSetThumbnail(panelPaths, outputPath, opts = {}) {
  const buf = await composeRow(panelPaths, { panelWidth: 620, ...opts });
  await sharp(buf).jpeg({ quality: 88 }).toFile(outputPath);
  return outputPath;
}

/** Packshot: same ramy na czystym, neutralnym tle. */
async function buildSetPackshot(panelPaths, outputPath, opts = {}) {
  const buf = await composeRow(panelPaths, { panelWidth: 760, background: '#f4f2ee', ...opts });
  await sharp(buf).jpeg({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

/**
 * Sciana pokoju — gradient, listwa i podloga. Ten sam zabieg co w
 * lifestyleMockup.js: czytelny kontekst zamiast plaskiego prostokata.
 */
function buildRoomSvg(W, H) {
  const hb = Math.round(H * 0.8);
  const hm = Math.round(H * 0.84);
  return `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#efece6"/>
      <stop offset="50%" stop-color="#e2ddd5"/>
      <stop offset="100%" stop-color="#d3cec4"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a49d92"/>
      <stop offset="100%" stop-color="#837d73"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#wall)"/>
  <rect y="${hb}" width="100%" height="${hm - hb}" fill="#f3f1ec"/>
  <line x1="0" y1="${hb}" x2="${W}" y2="${hb}" stroke="#dcd7cf" stroke-width="3"/>
  <rect y="${hm}" width="100%" height="${H - hm}" fill="url(#floor)"/>
</svg>`.trim();
}

/**
 * Salon: zestaw powieszony na scianie wnetrza.
 * Kompozycja pozioma — zestaw jest szerszy niz wysoki, wiec kadr też.
 */
async function buildSetInterior(panelPaths, outputPath, opts = {}) {
  const W = 2000;
  const H = 1500;
  const room = await sharp(svgBuffer(buildRoomSvg(W, H))).png().toBuffer();

  // Zestaw zajmuje ~62% szerokosci sciany i wisi w gornej czesci — jak w realnym wnetrzu.
  const targetW = Math.round(W * 0.62);
  const panelWidth = Math.round(targetW / (panelPaths.length + (panelPaths.length - 1) * DEFAULTS.gapRatio));

  const set = await composeRow(panelPaths, {
    panelWidth,
    // Przezroczyste tlo — zestaw ma sie polozyc na scianie pokoju.
    // Margines musi zostac niezerowy, bo inaczej cien wychodzi poza plotno
    // i sharp odrzuca warstwe wieksza niz podklad.
    background: '#00000000',
    marginRatio: 0.05,
    ...opts,
  });
  const sm = await sharp(set).metadata();

  const left = Math.round((W - sm.width) / 2);
  const top = Math.round(H * 0.5 - sm.height / 2);

  const buf = await sharp(room)
    .composite([{ input: set, left, top: Math.max(20, top) }])
    .png()
    .toBuffer();

  await sharp(buf).jpeg({ quality: 90 }).toFile(outputPath);
  return outputPath;
}

module.exports = {
  PANEL_RATIO,
  DEFAULTS,
  renderFramedPanel,
  composeRow,
  buildSetThumbnail,
  buildSetPackshot,
  buildSetInterior,
};
