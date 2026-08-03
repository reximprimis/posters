/**
 * Testy katalogu modeli i precedencji konfiguracji.
 *
 * Najwazniejszy przypadek: wyczyszczenie nadpisania musi przywrocic wartosc
 * z .env. Bez tego process.env trzymalby stara wartosc z panelu i po cichu
 * przeslanial plik konfiguracyjny.
 *
 * Uzycie: npm run test:models
 */

const path = require('path');

// Ustaw baseline PRZED zaladowaniem modulu - ENV_BASELINE czyta env przy require.
process.env.IMAGE_GENERATION_MODEL = 'gpt-image-2';
process.env.OPENAI_PROMPT_MODEL = 'gpt-4o-mini';

const catalog = require(path.join(__dirname, '..', 'src', 'modelCatalog'));

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

function expectEqual(a, b, label) {
  if (a !== b) throw new Error(`${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

console.log('KATALOG:');

check('kazde ustawienie ma niepusta liste opcji', () => {
  for (const s of catalog.MODEL_SETTINGS) {
    if (!s.options.length) throw new Error(`${s.key} bez opcji`);
  }
});

check('kazda opcja ma id, etykiete i opis', () => {
  for (const s of catalog.MODEL_SETTINGS) {
    for (const o of s.options) {
      if (!o.id || !o.label || !o.description) throw new Error(`${s.key}/${o.id} niekompletne`);
    }
  }
});

check('model obrazow nie dotyczy uploadu', () => {
  const s = catalog.MODEL_SETTINGS.find((x) => x.key === 'imageModel');
  if (s.paths.includes('upload')) throw new Error('upload nie generuje obrazu, nie powinien byc na liscie');
});

check('model tekstowy dotyczy wszystkich trzech sciezek', () => {
  const s = catalog.MODEL_SETTINGS.find((x) => x.key === 'textModel');
  expectEqual(s.paths.length, 3, 'liczba sciezek');
});

console.log('\nWALIDACJA:');

check('znany model przechodzi', () => {
  if (!catalog.isKnownModel('imageModel', 'gpt-image-1.5')) throw new Error('gpt-image-1.5 powinien byc znany');
});

check('dall-e-3 jest POZA katalogiem', () => {
  // Jego budzet promptu to 1436 znakow, a prompty z routera maja 2800-3500.
  if (catalog.isKnownModel('imageModel', 'dall-e-3')) {
    throw new Error('dall-e-3 nie moze byc wybieralny — generowanie by sie wywalilo');
  }
});

check('nieznany model jest odrzucany', () => {
  if (catalog.isKnownModel('imageModel', 'midjourney-v7')) throw new Error('nie powinien przejsc');
});

check('model z innego ustawienia jest odrzucany', () => {
  if (catalog.isKnownModel('imageModel', 'gpt-4o-mini')) throw new Error('model tekstowy nie jest modelem obrazu');
});

console.log('\nPRECEDENCJA:');

check('bez nadpisania wygrywa .env', () => {
  const r = catalog.resolveModelSetting('imageModel', {});
  expectEqual(r.value, 'gpt-image-2', 'wartosc');
  expectEqual(r.source, 'env', 'zrodlo');
});

check('nadpisanie z panelu wygrywa z .env', () => {
  const r = catalog.resolveModelSetting('imageModel', { imageModel: 'gpt-image-1.5' });
  expectEqual(r.value, 'gpt-image-1.5', 'wartosc');
  expectEqual(r.source, 'panel', 'zrodlo');
  expectEqual(r.envValue, 'gpt-image-2', 'wartosc z .env nadal widoczna');
});

check('nieznane nadpisanie jest ignorowane, nie wysadza panelu', () => {
  const r = catalog.resolveModelSetting('imageModel', { imageModel: 'midjourney-v7' });
  expectEqual(r.value, 'gpt-image-2', 'wartosc');
  expectEqual(r.source, 'env', 'zrodlo');
});

console.log('\nZAPIS DO ENV:');

check('nadpisanie trafia do process.env', () => {
  catalog.applyModelOverridesToEnv({ imageModel: 'gpt-image-1.5' });
  expectEqual(process.env.IMAGE_GENERATION_MODEL, 'gpt-image-1.5', 'env po nadpisaniu');
});

check('wyczyszczenie nadpisania przywraca .env', () => {
  catalog.applyModelOverridesToEnv({ imageModel: 'gpt-image-1.5' });
  catalog.applyModelOverridesToEnv({});
  expectEqual(process.env.IMAGE_GENERATION_MODEL, 'gpt-image-2', 'env po wyczyszczeniu');
});

check('envValue nie dryfuje po wielokrotnych zmianach', () => {
  // Dwie ROZNE wartosci pod rzad — inaczej test nie wykryje dryfu wartosci bazowej.
  catalog.applyModelOverridesToEnv({ imageModel: 'gpt-image-1.5' });
  catalog.applyModelOverridesToEnv({ imageModel: 'gpt-image-2' });
  catalog.applyModelOverridesToEnv({ imageModel: 'gpt-image-1.5' });
  const r = catalog.resolveModelSetting('imageModel', { imageModel: 'gpt-image-1.5' });
  expectEqual(r.envValue, 'gpt-image-2', 'wartosc bazowa z .env');
  expectEqual(r.value, 'gpt-image-1.5', 'wartosc aktywna');
  catalog.applyModelOverridesToEnv({});
  expectEqual(process.env.IMAGE_GENERATION_MODEL, 'gpt-image-2', 'powrot do .env');
});

console.log(`\n${pass} przeszlo, ${fail} nie przeszlo`);
process.exit(fail === 0 ? 0 : 1);

