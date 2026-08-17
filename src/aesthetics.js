/**
 * ESTETYKA — trzecia os taksonomii generatora.
 *
 *   KATEGORIA  = co jest na plakacie (temat)
 *   STYL       = jak jest wykonany (technika)
 *   ESTETYKA   = w jakim nastroju i palecie (ten plik)
 *
 * Estetyka jest OPCJONALNA i ortogonalna wobec dwoch pozostalych osi. Nie zmienia
 * tematu ani techniki - nadpisuje wylacznie palete, nastroj i fakture.
 *
 * Powod istnienia: trendy typu Japandi czy Boho nie sa ani tematem, ani technika.
 * Bez tej osi ladowaly w opisach kategorii - patrz "Plakaty dla dzieci", gdzie
 * do opisu tematu wpisano "Boho-Scandi ... muted earthy pastels on cream".
 *
 * Zestaw oparty na researchu rynku wall-art na 2026 (Etsy / POD).
 */

const AESTHETICS = [
  // Cztery ponizsze dopisane po przegladzie nawigacji konkurencji: kolumna
  // "Trendy i inspiracje" to u nich Bauhaus, Japandi, czarno-biale, vintage
  // i plakaty wystawowe. Japandi juz mielismy — reszty brakowalo, mimo ze to
  // wejscia, ktorymi klient realnie wchodzi do katalogu.
  {
    id: 'bauhaus',
    label: 'Bauhaus',
    description: 'Podstawowe figury i trzy kolory podstawowe. Geometria bez ozdób, funkcja przed dekoracją.',
    badge: 'KLASYK',
    palette:
      'primary red, primary blue, primary yellow, black and off-white — flat and unmodulated, no tints or shades',
    mood:
      'strict geometric construction, circles squares and triangles, bold asymmetric balance, functional clarity, poster-like directness',
    texture: 'perfectly flat opaque color, hard clean edges, faint printed paper grain only',
    avoid: 'gradients, shading, three-dimensional rendering, ornament, texture imitation, pastel palette',
  },
  {
    id: 'black-white',
    label: 'Czarno-biały',
    description: 'Bez koloru. Cała robota na kontraście, formie i świetle.',
    badge: 'TOP 2026',
    palette: 'pure monochrome only — black, white and the full range of neutral grays, absolutely no hue',
    mood:
      'graphic clarity, strong tonal contrast, form and light carry the image, timeless and gallery-like',
    texture: 'clean tonal transitions, fine grain acceptable, deep blacks and clean whites',
    avoid: 'any color cast, sepia, duotone, warm or cool tinting, muddy mid-grays',
  },
  {
    id: 'exhibition',
    label: 'Plakat wystawowy',
    description: 'Estetyka plakatu muzealnego: duża forma, dużo powietrza, typograficzny spokój.',
    badge: 'TOP 2026',
    palette: 'restrained gallery palette: off-white ground with one or two confident accent colors',
    mood:
      'museum poster composition, one large dominant form, generous margins, calm authority, editorial confidence',
    texture: 'flat matte print, subtle paper tooth, no photographic depth',
    avoid: 'busy detail, multiple competing subjects, photographic realism, decorative flourish',
  },
  {
    id: 'ukiyo-e',
    label: 'Ukiyo-e',
    description: 'Japoński drzeworyt: płaskie plany, wyraźny kontur, fale i mgła.',
    badge: 'KLASYK',
    palette: 'indigo blue, soft vermilion, ink black, mineral green, warm paper cream — flat woodblock inks',
    mood:
      'flat layered planes, confident outline, stylized waves mist and clouds, decorative stillness, asymmetric traditional composition',
    texture: 'woodblock print grain, visible ink edges, hand-printed paper',
    avoid: 'photographic depth, realistic shading, perspective rendering, glossy finish',
  },
  {
    id: 'japandi',
    label: 'Japandi',
    description: 'Japoński minimalizm z nordyckim ciepłem. Glina, kamień, piasek, dużo pustej przestrzeni.',
    badge: 'TOP 2026',
    palette:
      'warm clay, stone gray, sand beige, chalk white, muted ash, soft charcoal — low saturation throughout',
    mood:
      'serene restraint, quiet warmth, uncluttered calm, natural materials, generous negative space, balanced asymmetry',
    texture: 'subtle paper grain, matte natural surfaces, soft diffused light, no gloss',
    avoid: 'bright saturated color, high contrast, ornament, glossy finish, busy detail',
  },
  {
    id: 'wabi-sabi',
    label: 'Wabi-sabi',
    description: 'Piękno niedoskonałości i upływu czasu. Surowe faktury, nieregularne krawędzie.',
    badge: 'TOP 2026',
    palette: 'raw clay, weathered stone, oatmeal, faded umber, pale ochre, smoke gray',
    mood:
      'imperfect and organic, quiet imperfection, traces of age and erosion, handmade irregularity, contemplative stillness',
    texture:
      'visible material texture, uneven organic edges, plaster and raw clay surface, gentle wear, tactile depth',
    avoid: 'crisp geometry, machine precision, glossy surfaces, vivid color, symmetry',
  },
  {
    id: 'boho',
    label: 'Boho',
    description: 'Ciepłe ziemiste barwy, naturalne włókna, swobodny nastrój. Sprzedaje się w zestawach.',
    badge: 'BESTSELLER',
    palette: 'terracotta, ochre, rust, warm cream, sage green, dusty rose, sun-baked earth tones',
    mood:
      'relaxed bohemian warmth, sun-washed and inviting, natural fibers, handcrafted feel, free-spirited but calm',
    texture: 'woven and fibrous texture, soft matte finish, warm natural light',
    avoid: 'cool blue tones, corporate minimalism, neon, high-gloss, sterile precision',
  },
  {
    id: 'quiet-luxury',
    label: 'Quiet luxury',
    description: 'Stonowana elegancja: akwarelowe przygaszenia w kremie, szałwii i ciepłym beżu.',
    badge: '',
    palette: 'cream, sage green, warm beige, soft taupe, pale ivory, muted stone',
    mood:
      'understated elegance, refined restraint, expensive simplicity, gallery calm, soft watercolor washes',
    texture: 'delicate watercolor bleed, fine paper tooth, gentle tonal gradation',
    avoid: 'loud color, heavy contrast, visible branding, decorative excess, harsh lines',
  },
  {
    id: 'mid-century',
    label: 'Mid-century',
    description: 'Ziemiste tony lat 70., uproszczona geometria, retro ciepło.',
    badge: '',
    palette: 'muted orange, warm brown, mustard yellow, avocado green, burnt sienna, cream',
    mood:
      'retro modernist confidence, simplified geometric forms, flat graphic shapes, 1960s–70s design language, optimistic warmth',
    texture: 'flat screen-print color areas, slight print misregistration, matte finish',
    avoid: 'photorealism, gradients, digital gloss, cool pastels, fine detail',
  },
  {
    id: 'scandi',
    label: 'Skandynawski',
    description: 'Jasno, przewiewnie, chłodne neutralne barwy i prostota formy.',
    badge: '',
    palette: 'soft white, pale gray, birch beige, muted sage, cool light blue, gentle black accents',
    mood:
      'airy brightness, functional simplicity, hygge calm, clean lines, plenty of light and open space',
    texture: 'smooth matte surfaces, pale wood grain, even diffused daylight',
    avoid: 'heavy saturation, dark heavy tones, ornate detail, visual clutter',
  },
];

const BY_ID = new Map(AESTHETICS.map((a) => [a.id, a]));

/** @returns {boolean} */
function isKnownAesthetic(id) {
  return BY_ID.has(String(id || '').trim());
}

/** @returns {object|null} */
function getAesthetic(id) {
  return BY_ID.get(String(id || '').trim()) || null;
}

/** Lista dla UI — bez pol promptowych, ktore uzytkownika nie interesuja. */
function listAestheticsForUi() {
  return AESTHETICS.map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    badge: a.badge,
    palette: a.palette,
  }));
}

/**
 * Blok nadpisujacy dolaczany na koncu promptu.
 *
 * Swiadomie NIE modyfikuje istniejacego tekstu - doklejamy sie na koncu, wiec
 * prompt bez estetyki zostaje bajt w bajt taki sam jak wczesniej. Model traktuje
 * pozniejsze instrukcje jako nadrzedne, a slowo OVERRIDE czyni to jednoznacznym.
 *
 * @param {string} aestheticId
 * @returns {string} pusty string gdy brak lub nieznana estetyka
 */
function buildAestheticBlock(aestheticId) {
  const a = getAesthetic(aestheticId);
  if (!a) return '';
  return [
    `AESTHETIC OVERRIDE — ${a.label.toUpperCase()}:`,
    `This aesthetic takes precedence over any earlier color palette and mood direction, but must NOT change the subject, the composition rules, or the safe print framing above.`,
    `Color palette: ${a.palette}.`,
    `Mood and character: ${a.mood}.`,
    `Surface and texture: ${a.texture}.`,
    `Avoid: ${a.avoid}.`,
  ].join('\n');
}

/**
 * Dokleja estetyke do gotowego promptu.
 * @param {string} prompt
 * @param {string} [aestheticId]
 * @returns {string}
 */
function applyAestheticToPrompt(prompt, aestheticId) {
  const block = buildAestheticBlock(aestheticId);
  if (!block) return prompt;
  return `${prompt}\n\n${block}`;
}

/** Fragment do promptu tytulow, zeby nazwy pasowaly do nastroju. */
function describeAestheticForTitles(aestheticId) {
  const a = getAesthetic(aestheticId);
  if (!a) return '';
  return `Aesthetic direction: ${a.label} — ${a.mood}.`;
}

/** Wartosc oznaczajaca automatyczne mieszanie estetyk. */
const AESTHETIC_MIX = 'mix';

function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Rotacja estetyk dla serii generowania.
 *
 * Swiadomie NIE czyste losowanie: przy losowaniu latwo o trzy japandi z rzedu.
 * Tasujemy pelna liste i idziemy po kolei, przetasowujac dopiero po wyczerpaniu.
 * Dzieki temu partia 6 plakatow dostaje 6 roznych estetyk — ta sama zasada,
 * co "jeden tytul na motyw" w pulach tytulow.
 *
 * @returns {{ next: () => string }}
 */
function createAestheticRotation() {
  let queue = [];
  let last = '';
  return {
    next() {
      if (!queue.length) {
        queue = shuffled(AESTHETICS.map((a) => a.id));
        // Na styku dwoch tur pierwsza pozycja moze trafic w ostatnio wydana.
        // Przestawiamy ja, zeby "bez powtorek pod rzad" bylo prawda zawsze,
        // a nie tylko wewnatrz jednej tury.
        if (queue.length > 1 && queue[0] === last) {
          [queue[0], queue[1]] = [queue[1], queue[0]];
        }
      }
      last = queue.shift();
      return last;
    },
  };
}

/**
 * Rozstrzyga, jaka estetyke zastosowac dla pojedynczego plakatu.
 *
 * @param {string} requested 'mix', konkretne id, albo pusty string
 * @param {{ next: () => string }} [rotation] wymagane tylko przy 'mix'
 * @returns {string} id estetyki lub '' gdy brak
 */
function resolveAestheticForPoster(requested, rotation) {
  const req = String(requested || '').trim();
  if (!req) return '';
  if (req === AESTHETIC_MIX) return rotation ? rotation.next() : '';
  return isKnownAesthetic(req) ? req : '';
}

module.exports = {
  AESTHETICS,
  AESTHETIC_MIX,
  createAestheticRotation,
  resolveAestheticForPoster,
  isKnownAesthetic,
  getAesthetic,
  listAestheticsForUi,
  buildAestheticBlock,
  applyAestheticToPrompt,
  describeAestheticForTitles,
};
