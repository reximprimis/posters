/**
 * Tla wnetrz dla wizualizacji ZESTAWOW (dyptyk, tryptyk).
 *
 * Dotyczy wylacznie rekordow kind='set'. Pojedyncze plakaty maja wlasna sciezke
 * mockupow (mockupGenerator.js + mockupInteriorScenes.js) i ten modul jej NIE rusza.
 *
 * Dlaczego tlo jest generowane RAZ i lezy na dysku, a nie powstaje przy kazdym
 * zestawie: model dostalby jeden obraz panoramy i musialby sam rozdzielic go na
 * trzy ramy we wlasciwej kolejnosci. Przy tescie panoramy juz raz zignorowal
 * instrukcje o liniach ciecia. Skladanie lokalne jest deterministyczne, darmowe
 * i zawsze trafia w to samo miejsce.
 */

/**
 * Prompt tla. Dwa wymagania sa krytyczne i oba wynikaja z tego, ze panele
 * wklejamy jako PROSTE PROSTOKATY:
 *
 * 1. Ujecie musi byc frontalne — kazdy zbieg perspektywiczny sciany zdradzilby montaz.
 * 2. Sciana musi byc PUSTA — cokolwiek na niej wisi, wyjdzie spod naszych ram.
 *
 * Zakaz obrazow jest wyliczony przedmiot po przedmiocie, bo samo "empty wall"
 * model potrafi zinterpretowac jako "wall with a small picture".
 */
function buildRoomPrompt(scene) {
  return [
    `Photorealistic interior photograph of ${scene.room}, shot straight-on.`,
    '',
    'CAMERA: perfectly frontal to the back wall, lens axis perpendicular to the wall,',
    'no perspective convergence, no tilt, no wide-angle distortion. The wall plane fills',
    'the frame parallel to the image edges.',
    '',
    `ROOM: ${scene.furniture}`,
    '',
    `CRITICAL — THE WALL ABOVE THE ${scene.anchor.toUpperCase()} IS COMPLETELY EMPTY:`,
    'no pictures, no posters, no frames, no canvases, no mirrors, no shelves, no wall art,',
    'no hooks, no nails, no decals, no text of any kind. A plain painted wall with a subtle',
    `even texture, ${scene.wall}. Leave generous empty wall space above the`,
    `${scene.anchor} — this area must stay clean and unobstructed across the full width.`,
    '',
    'STYLE: natural interior photography, soft realistic shadows, no HDR, no heavy vignette.',
    'No people, no pets.',
  ].join('\n');
}

/**
 * `zone` — prostokat sciany, w ULAMKACH wymiaru tla. Ulamki, a nie piksele, bo
 * to samo tlo moze zostac pozniej wygenerowane w wyzszej rozdzielczosci.
 *
 * Wartosci dla `salon_sofa` sa SPRAWDZONE wizualnie na gotowym zestawie.
 * Pozostale sa punktem wyjscia i wymagaja obejrzenia po wygenerowaniu tla —
 * kazde wnetrze ma mebel na innej wysokosci.
 */
const ROOMS = [
  {
    id: 'salon_sofa',
    label: 'Salon — nad sofą',
    primary: true,
    anchor: 'sofa',
    room: 'a calm modern living room',
    furniture:
      'a low linen sofa against the wall in the lower third, soft neutral upholstery, two cushions, ' +
      'a small side table with a ceramic vase and dried stems, a floor lamp at the edge, light oak floor, ' +
      'warm diffused daylight from the left.',
    wall: 'warm off-white',
    zone: { x: 0.245, y: 0.1, w: 0.51, h: 0.42 },
  },
  {
    id: 'jadalnia_komoda',
    label: 'Jadalnia — nad komodą',
    anchor: 'sideboard',
    room: 'a warm contemporary dining room',
    furniture:
      'a light oak sideboard against the wall in the lower third, a ceramic bowl and a small vase with ' +
      'dried branches on top, part of a dining chair visible at the edge, warm wooden floor, ' +
      'soft daylight from the right.',
    wall: 'warm sand beige',
    // Wyzej i wezej niz salon — przy 0.10/0.51 prawa rama dochodzila do galazek w wazonie.
    zone: { x: 0.235, y: 0.07, w: 0.48, h: 0.42 },
  },
  {
    id: 'sypialnia',
    label: 'Sypialnia — nad łóżkiem',
    anchor: 'bed',
    room: 'a serene minimal bedroom',
    furniture:
      'an upholstered bed headboard against the wall in the lower third, layered linen bedding in muted ' +
      'tones, a small bedside table with a lamp, pale wooden floor, soft morning light.',
    wall: 'soft chalk white',
    // Mocno w prawo: lozko jest przesuniete wzgledem kadru, wiec strefa liczona
    // od srodka obrazu zawieszalaby tryptyk obok zaglowka, a nie nad nim.
    zone: { x: 0.34, y: 0.06, w: 0.51, h: 0.4 },
  },
  {
    id: 'gabinet_ciemny',
    label: 'Gabinet — ciemna ściana',
    anchor: 'desk',
    room: 'a moody modern home office',
    furniture:
      'a dark wood desk against the wall in the lower third, a closed laptop, a small brass lamp, ' +
      'a chair back visible, dark floor, low directional light from the side.',
    wall: 'deep charcoal green',
    // Nieco nizej — nad lampa zostawala zbyt duza pusta plaszczyzna.
    zone: { x: 0.245, y: 0.13, w: 0.51, h: 0.42 },
  },
];

const BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

/** Tlo uzywane dla SALON 1 — ten sam kadr dla kazdego zestawu, zeby siatka byla spojna. */
function getPrimaryRoom() {
  return ROOMS.find((r) => r.primary) || ROOMS[0];
}

/**
 * Tlo dla SALON 2 — dobierane do kategorii, zeby Cyberpunk nie dostawal
 * tego samego jasnego japandi co Japonia.
 */
const CATEGORY_ROOM = {
  Japonia: 'jadalnia_komoda',
  Botanika: 'jadalnia_komoda',
  Abstrakcja: 'sypialnia',
  Minimalizm: 'sypialnia',
  'Cyberpunk i neon': 'gabinet_ciemny',
  'AI i technologia': 'gabinet_ciemny',
  Architektura: 'gabinet_ciemny',
};

function getSecondaryRoom(category) {
  const id = CATEGORY_ROOM[String(category || '').trim()];
  const room = id ? BY_ID.get(id) : null;
  // Bez dopasowania bierzemy jadalnie — cieplejsza i pasuje do wiekszosci motywow.
  return room || BY_ID.get('jadalnia_komoda');
}

function getRoom(id) {
  return BY_ID.get(String(id || '').trim()) || null;
}

function listRooms() {
  return ROOMS.map((r) => ({ id: r.id, label: r.label, primary: !!r.primary }));
}

module.exports = {
  ROOMS,
  buildRoomPrompt,
  getRoom,
  getPrimaryRoom,
  getSecondaryRoom,
  listRooms,
};
