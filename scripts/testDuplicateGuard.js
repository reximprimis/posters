/**
 * Testy zabezpieczenia przed duplikatami handli Shopify.
 *
 * Sprawdzaja, ze guard FAKTYCZNIE blokuje duplikaty - nie tylko, ze nie
 * przeszkadza. Handle produktu liczy sie z samego tytulu, wiec dwa plakaty
 * o tym samym tytule zlewaja sie przy imporcie w jeden i jeden przepada.
 *
 * Uzycie: npm run test:guard
 */

const path = require('path');
const {
  assertHandleGloballyUnique,
  findHandleCollisions,
  collectGloballyUsedTitles,
} = require(path.join(__dirname, '..', 'src', 'posterNameGuard'));
const { toPosterHandle } = require(path.join(__dirname, '..', 'src', 'posterTitle'));

let pass = 0;
let fail = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  OK   ${name}`);
    pass++;
  } catch (e) {
    console.log(`  FAIL ${name}\n         ${e.message}`);
    fail++;
  }
}

function expectThrows(fn, label) {
  let threw = false;
  try {
    fn();
  } catch (_) {
    threw = true;
  }
  if (!threw) throw new Error(`oczekiwano wyjatku: ${label}`);
}

function expectEqual(a, b, label) {
  if (a !== b) throw new Error(`${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

const db = [
  {
    title: 'Delicate Magnolia Branch',
    category: 'Botanika',
    artStyle: 'Photography',
    imagePath: 'posters/Botanika/photography/Delicate_Magnolia_Branch.png',
  },
  {
    title: 'Woodland Tea Society',
    category: 'Humor i memy',
    artStyle: 'Illustration',
    imagePath: 'posters/Humor i memy/Illustration/Unexpected_Tea_Party.png',
  },
];

console.log('BLOKOWANIE DUPLIKATOW:');

check('ten sam tytul w innym stylu jest odrzucany', () => {
  expectThrows(() => assertHandleGloballyUnique('Delicate Magnolia Branch', db), 'identyczny tytul');
});

check('roznica w wielkosci liter nie omija blokady', () => {
  expectThrows(() => assertHandleGloballyUnique('delicate magnolia BRANCH', db), 'inna wielkosc liter');
});

check('interpunkcja nie omija blokady', () => {
  expectThrows(() => assertHandleGloballyUnique('Delicate, Magnolia - Branch!', db), 'inna interpunkcja');
});

check('wolny tytul przechodzi', () => {
  assertHandleGloballyUnique('Zupelnie Nowy Tytul', db);
});

check('regeneracja tego samego plakatu nie blokuje sama siebie', () => {
  assertHandleGloballyUnique('Delicate Magnolia Branch', db, {
    selfImagePath: 'posters/Botanika/photography/Delicate_Magnolia_Branch.png',
  });
});

check('allowOverwrite swiadomie omija blokade', () => {
  assertHandleGloballyUnique('Delicate Magnolia Branch', db, { allowOverwrite: true });
});

console.log('\nWYKRYWANIE KOLIZJI:');

check('czysty zestaw nie zglasza kolizji', () => {
  expectEqual(findHandleCollisions(db).length, 0, 'liczba kolizji');
});

check('sztucznie wstawiony duplikat jest wykrywany', () => {
  const dirty = [
    ...db,
    {
      title: 'Delicate Magnolia Branch',
      category: 'Retro',
      artStyle: 'Abstract',
      imagePath: 'posters/Retro/abstract/Inny_Plik.png',
    },
  ];
  const c = findHandleCollisions(dirty);
  expectEqual(c.length, 1, 'liczba kolizji');
  expectEqual(c[0].handle, 'delicate-magnolia-branch', 'handle kolizji');
});

check('ten sam plik dwa razy to NIE kolizja (regeneracja)', () => {
  const dup = [...db, { ...db[0] }];
  expectEqual(findHandleCollisions(dup).length, 0, 'liczba kolizji');
});

console.log('\nSPOJNOSC HANDLE:');

check('handle liczony jest deterministycznie', () => {
  expectEqual(toPosterHandle('Magnolia Over Still Water'), 'magnolia-over-still-water', 'handle');
  expectEqual(toPosterHandle('  Cafe / Mocha!  '), 'cafe-mocha', 'handle ze znakami specjalnymi');
  expectEqual(toPosterHandle(''), 'poster', 'pusty tytul');
});

check('lista zajetych tytulow deduplikuje po handle', () => {
  const titles = collectGloballyUsedTitles([...db, { title: 'DELICATE MAGNOLIA BRANCH', imagePath: 'x.png' }]);
  expectEqual(titles.length, 2, 'liczba unikalnych tytulow');
});

console.log('\nPULE TYTULOW:');

check('zaden tytul z pul nie daje handle zajetego przez inna pule', () => {
  // Kolizja tutaj oznacza, ze jeden z dwoch plakatow przepadnie po cichu
  // przy generowaniu — guard go zablokuje. Latwo o to przy rozbudowie pul.
  const { CATEGORY_TITLE_POOLS } = require(path.join(__dirname, '..', 'src', 'categoryTitlePools'));
  const byHandle = new Map();
  for (const [category, pool] of Object.entries(CATEGORY_TITLE_POOLS)) {
    for (const title of pool) {
      const h = toPosterHandle(title);
      if (!byHandle.has(h)) byHandle.set(h, []);
      byHandle.get(h).push(`${category} / ${title}`);
    }
  }
  const collisions = [...byHandle.entries()].filter(([, v]) => v.length > 1);
  if (collisions.length) {
    const detail = collisions.map(([h, v]) => `${h}: ${v.join(' | ')}`).join('; ');
    throw new Error(`${collisions.length} kolizji w pulach — ${detail}`);
  }
});

check('kazda pula ma wylacznie unikalne tytuly', () => {
  const { CATEGORY_TITLE_POOLS } = require(path.join(__dirname, '..', 'src', 'categoryTitlePools'));
  for (const [category, pool] of Object.entries(CATEGORY_TITLE_POOLS)) {
    const seen = new Set();
    for (const t of pool) {
      const k = toPosterHandle(t);
      if (seen.has(k)) throw new Error(`${category}: duplikat "${t}"`);
      seen.add(k);
    }
  }
});

console.log(`\n${pass} przeszlo, ${fail} nie przeszlo`);
process.exit(fail === 0 ? 0 : 1);
