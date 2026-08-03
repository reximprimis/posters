/**
 * Katalog modeli dostepnych w aplikacji.
 *
 * Jedyne zrodlo prawdy dla panelu ustawien i dla walidacji zapisu. Lista zawiera
 * wylacznie modele, ktore aplikacja potrafi realnie wywolac - czyli OpenAI,
 * bo tylko to SDK jest w zaleznosciach.
 *
 * Pole `paths` mowi, ktore z trzech sciezek generowania uzywaja danego ustawienia.
 * Bez tego zmiana modelu obrazow wygladalaby na globalna, a upload jej nie uzywa.
 */

/** Trzy tryby generatora widoczne w UI. */
const PATHS = {
  upload: 'Dodaj własne zdjęcie',
  manual: 'Generator manualny',
  auto: 'Generator automatyczny',
};

/** Ustawienie modelu obrazow: uzywane przez manualny i automatyczny, nie przez upload. */
const IMAGE_MODEL_PATHS = ['manual', 'auto'];

/** Ustawienie modelu tekstowego: tytuly (auto) oraz opisy sklepowe (wszystkie sciezki). */
const TEXT_MODEL_PATHS = ['upload', 'manual', 'auto'];

const IMAGE_MODELS = [
  {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    description: 'Najwyższa jakość i najlepsze trzymanie kompozycji. Domyślny wybór do druku.',
    badge: 'ZALECANY',
  },
  {
    id: 'gpt-image-1.5',
    label: 'GPT Image 1.5',
    description: 'Poprzednia generacja. Szybszy i tańszy, słabiej trzyma marginesy bezpieczeństwa.',
    badge: '',
  },
  {
    id: 'dall-e-3',
    label: 'DALL·E 3',
    description: 'Starszy model. Inny limit długości promptu i brak trybu edycji obrazu.',
    badge: 'LEGACY',
  },
];

const TEXT_MODELS = [
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    description: 'Najtańszy. W zupełności wystarcza do tytułów i krótkich opisów sklepowych.',
    badge: 'ZALECANY',
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    description: 'Bogatszy język w opisach, wyraźnie wyższy koszt przy tej samej liczbie plakatów.',
    badge: '',
  },
  {
    id: 'gpt-5',
    label: 'GPT-5',
    description: 'Najmocniejszy w tekstach sprzedażowych. Używaj, gdy zależy Ci na opisach, nie na cenie.',
    badge: '',
  },
];

/**
 * Definicje ustawien modeli - spina katalog, zmienna srodowiskowa i zasieg sciezek.
 */
const MODEL_SETTINGS = [
  {
    key: 'imageModel',
    envVar: 'IMAGE_GENERATION_MODEL',
    label: 'Model obrazów',
    hint: 'Generuje samą grafikę plakatu.',
    fallback: 'gpt-image-2',
    options: IMAGE_MODELS,
    paths: IMAGE_MODEL_PATHS,
  },
  {
    key: 'textModel',
    envVar: 'OPENAI_PROMPT_MODEL',
    // Swiadomie NIE "model promptow": prompt obrazu sklada szablon master-prompt-v1,
    // a nie model jezykowy. Stara nazwa wprowadzala w blad.
    label: 'Model tytułów i opisów',
    hint: 'Układa tytuły plakatów i opisy sklepowe. Nie pisze promptu do obrazu — ten składa wbudowany szablon.',
    fallback: 'gpt-4o-mini',
    options: TEXT_MODELS,
    paths: TEXT_MODEL_PATHS,
  },
];

const SETTINGS_BY_KEY = new Map(MODEL_SETTINGS.map((s) => [s.key, s]));

/**
 * Wartosci z .env zapamietane przy starcie, zanim panel cokolwiek nadpisze.
 *
 * Bez tego wyczyszczenie nadpisania nie przywracaloby .env - process.env trzymalby
 * nadal poprzednia wartosc z panelu i po cichu ja przeslanial.
 */
const ENV_BASELINE = Object.freeze(
  Object.fromEntries(MODEL_SETTINGS.map((s) => [s.key, String(process.env[s.envVar] || '').trim()]))
);

/** @returns {boolean} czy `modelId` jest w katalogu danego ustawienia. */
function isKnownModel(settingKey, modelId) {
  const setting = SETTINGS_BY_KEY.get(settingKey);
  if (!setting) return false;
  return setting.options.some((o) => o.id === String(modelId || '').trim());
}

/**
 * Wartosc efektywna ustawienia wraz z pochodzeniem - panel pokazuje obie wartosci
 * i to, ktora wygrywa, zeby precedencja byla widoczna zamiast ukryta.
 *
 * @param {string} settingKey
 * @param {Record<string,string>} [overrides] nadpisania z user_settings.json
 * @returns {{ key, label, hint, envVar, paths, options, envValue, overrideValue, value, source }}
 */
function resolveModelSetting(settingKey, overrides = {}) {
  const setting = SETTINGS_BY_KEY.get(settingKey);
  if (!setting) throw new Error(`Nieznane ustawienie modelu: ${settingKey}`);

  // Zawsze wartosc z .env sprzed nadpisan - process.env moglo juz zostac podmienione.
  const envValue = ENV_BASELINE[settingKey] || '';
  const rawOverride = overrides && overrides[settingKey] != null ? String(overrides[settingKey]).trim() : '';
  const overrideValue = isKnownModel(settingKey, rawOverride) ? rawOverride : '';

  let value;
  let source;
  if (overrideValue) {
    value = overrideValue;
    source = 'panel';
  } else if (envValue) {
    value = envValue;
    source = 'env';
  } else {
    value = setting.fallback;
    source = 'default';
  }

  return {
    key: setting.key,
    label: setting.label,
    hint: setting.hint,
    envVar: setting.envVar,
    paths: setting.paths.slice(),
    options: setting.options.map((o) => ({ ...o })),
    envValue,
    overrideValue,
    value,
    source,
  };
}

/** Wszystkie ustawienia modeli w formie gotowej dla UI. */
function resolveAllModelSettings(overrides = {}) {
  return MODEL_SETTINGS.map((s) => resolveModelSetting(s.key, overrides));
}

/**
 * Wstrzykuje nadpisania do process.env, zeby dzialaly bez restartu.
 * getImageModel() czyta env przy kazdym wywolaniu, a config.openaiPromptModel
 * jest getterem - dzieki temu obie sciezki lapia zmiane natychmiast.
 */
function applyModelOverridesToEnv(overrides = {}) {
  const applied = {};
  for (const setting of MODEL_SETTINGS) {
    const raw = overrides && overrides[setting.key] != null ? String(overrides[setting.key]).trim() : '';
    if (raw && isKnownModel(setting.key, raw)) {
      process.env[setting.envVar] = raw;
      applied[setting.key] = raw;
      continue;
    }
    // Brak nadpisania - przywroc stan wyjsciowy z .env, zeby panel i generator
    // widzialy to samo takze po wyczyszczeniu wyboru.
    const baseline = ENV_BASELINE[setting.key] || '';
    if (baseline) process.env[setting.envVar] = baseline;
    else delete process.env[setting.envVar];
  }
  return applied;
}

module.exports = {
  PATHS,
  IMAGE_MODELS,
  TEXT_MODELS,
  MODEL_SETTINGS,
  isKnownModel,
  resolveModelSetting,
  resolveAllModelSettings,
  applyModelOverridesToEnv,
};
