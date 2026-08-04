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

const fs = require('fs');
const path = require('path');
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
 * "Co dostajesz": same arkusze, bez ram, na jasnym tle.
 *
 * Idzie jako OSTATNIE zdjecie w galerii. Zdjecia z ramami sprzedaja, ale nie
 * odpowiadaja na pytanie "ile tego wlasciwie przyjdzie w paczce" — a klient
 * kupuje papier, nie oprawe. Ramy na pozostalych kadrach sa uzasadnione tym,
 * ze panorama ma ciagly horyzont i bez ram trzy panele czytaja sie jak jedna
 * rozcieta grafika; tutaj odstepy i cien robia to samo rozdzielenie.
 *
 * @param {string[]} panelPaths
 * @param {string} outputPath
 * @param {{ panelWidth?: number, background?: string }} [opts]
 */
async function buildSetSheets(panelPaths, outputPath, opts = {}) {
  const o = mergeOptions(opts);
  const panelWidth = Math.round(o.panelWidth || 900);
  const panelHeight = Math.round(panelWidth / PANEL_RATIO);
  const gap = Math.round(panelWidth * 0.16); // szerzej niz przy ramach — arkusze musza czytac sie osobno
  const margin = Math.round(panelWidth * 0.22);

  const W = panelWidth * panelPaths.length + gap * (panelPaths.length - 1) + margin * 2;
  const H = panelHeight + margin * 2;

  const rozmycie = Math.max(6, Math.round(panelWidth * 0.022));
  const nakladki = [];

  for (let i = 0; i < panelPaths.length; i++) {
    const left = margin + i * (panelWidth + gap);

    // Cien pod arkuszem — bez niego papier wyglada jak wklejony prostokat.
    // Wezszy od arkusza, zeby sugerowal lezacy papier, a nie uniesiona rame.
    const cien = await sharp({
      create: {
        width: panelWidth,
        height: panelHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.18 },
      },
    })
      .blur(rozmycie)
      .png()
      .toBuffer();

    const arkusz = await sharp(panelPaths[i])
      .resize(panelWidth, panelHeight, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();

    nakladki.push({ input: cien, left, top: margin + Math.round(rozmycie * 0.8) });
    nakladki.push({ input: arkusz, left, top: margin });
  }

  const buf = await sharp({
    create: { width: W, height: H, channels: 4, background: o.background },
  })
    .composite(nakladki)
    .png()
    .toBuffer();

  await sharp(buf).jpeg({ quality: 92 }).toFile(outputPath);
  return outputPath;
}

/**
 * Salon: zestaw powieszony na scianie wnetrza.
 *
 * Tlo to WYGENEROWANE ZDJECIE pustego pokoju z assets/set_rooms/, a panele
 * wkleja sharp w strefe zdefiniowana dla tego wnetrza. Rysowana ściana zostaje
 * tylko jako awaryjna — bez pliku tla (swiezy klon, brak assetu) mockup ma
 * powstac gorszy, ale nie ma prawa wysadzic generowania zestawu.
 *
 * @param {string[]} panelPaths
 * @param {string} outputPath
 * @param {{ roomId?: string, category?: string, secondary?: boolean }} [opts]
 */
async function buildSetInterior(panelPaths, outputPath, opts = {}) {
  const rooms = require('./setRoomBackgrounds');
  const scene = opts.roomId
    ? rooms.getRoom(opts.roomId)
    : opts.secondary
      ? rooms.getSecondaryRoom(opts.category)
      : rooms.getPrimaryRoom();

  const roomFile = scene ? path.join(__dirname, '..', 'assets', 'set_rooms', `${scene.id}.png`) : '';
  const hasRoom = !!roomFile && fs.existsSync(roomFile);

  let base;
  let W;
  let H;
  let zone;

  if (hasRoom) {
    const meta = await sharp(roomFile).metadata();
    W = meta.width;
    H = meta.height;
    base = await sharp(roomFile).png().toBuffer();
    zone = scene.zone;
  } else {
    W = 2000;
    H = 1500;
    base = await sharp(svgBuffer(buildRoomSvg(W, H))).png().toBuffer();
    // Awaryjna sciana nie ma mebli, wiec zestaw idzie po prostu na srodek.
    zone = { x: 0.19, y: 0.22, w: 0.62, h: 0.5 };
  }

  const zoneX = Math.round(zone.x * W);
  const zoneY = Math.round(zone.y * H);
  const zoneW = Math.round(zone.w * W);

  // Szerokosc panelu wynika ze STREFY, nie z calego kadru — inaczej ten sam
  // zestaw wisialby inaczej w kazdym wnetrzu.
  const panelWidth = Math.round(zoneW / (panelPaths.length + (panelPaths.length - 1) * DEFAULTS.gapRatio));

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

  // Rzad niesie wlasny margines na cien, wiec centrujemy go wzgledem strefy
  // zamiast przykladac do jej lewej krawedzi.
  const left = Math.round(zoneX + (zoneW - sm.width) / 2);
  const top = zoneY;

  const buf = await sharp(base)
    .composite([
      {
        input: set,
        left: Math.max(0, Math.min(left, W - sm.width)),
        top: Math.max(0, Math.min(top, H - sm.height)),
      },
    ])
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
  buildSetSheets,
  buildSetInterior,
};
