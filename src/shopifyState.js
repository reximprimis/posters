const fs = require('fs');
const path = require('path');

function normalizeRelPath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function fileExists(projectRoot, relPath) {
  const rel = normalizeRelPath(relPath);
  if (!rel) return false;
  const abs = path.join(projectRoot, rel);
  return fs.existsSync(abs) && fs.statSync(abs).isFile();
}

function withThumbSuffix(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  const dot = p.lastIndexOf('.');
  if (dot < 0) return '';
  return p.slice(0, dot) + '_thumb.jpg';
}

function withFramedSuffix(relPath) {
  const p = normalizeRelPath(relPath);
  if (!p) return '';
  const dot = p.lastIndexOf('.');
  if (dot < 0) return '';
  return p.slice(0, dot) + '_ramka' + p.slice(dot);
}

/**
 * Resolve inventory thumb path to shopify_thumbs/ using real on-disk segment names (CDN is case-sensitive).
 * @param {string} projectRoot
 * @param {string} relPath e.g. posters/Botanika/Photography/foo_thumb.jpg
 * @returns {string} path relative to shopify_thumbs/, or '' if not found
 */
/**
 * Usuwa katalog plakatu ze sciezki wzglednej.
 *
 *   Botanika/photography/Golden_Blossom/Golden_Blossom_thumb.jpg
 *   -> Botanika/photography/Golden_Blossom_thumb.jpg
 *
 * W posters/ kazdy plakat ma wlasny katalog, ale shopify_thumbs/ MUSI zostac
 * PLASKI: to on jest serwowany przez CDN do zywego sklepu, a przebudowa jego
 * struktury unieruchomilaby ponad 2000 zdjec do czasu ponownego importu CSV.
 *
 * Zwraca sciezke bez zmian, gdy nie ma czego usuwac. Wynik trzeba traktowac
 * jako KANDYDATA i sprawdzic na dysku — nazwa pliku bywa prefiksowana nazwa
 * STYLU (katalog "Abstract", plik "Abstract_Circuitry_..."), wiec bezwarunkowe
 * splaszczenie usunelo by katalog stylu.
 *
 * @param {string} rel sciezka wzgledna, bez przedrostka posters/
 * @returns {string}
 */
function flattenPosterDir(rel) {
  const cz = String(rel || '').split('/').filter(Boolean);
  // Uklad to Kategoria/styl/[Tytul/]plik. Katalog plakatu istnieje dopiero przy
  // CZTERECH segmentach — przy trzech przedostatni jest katalogiem STYLU i jego
  // usuniecie wysylaloby pliki w zle miejsce (np. "Abstract/Abstract_Circuitry").
  if (cz.length < 4) return rel;
  const plik = cz[cz.length - 1];
  const katalog = cz[cz.length - 2];
  if (!katalog || !plik.toLowerCase().startsWith(katalog.toLowerCase())) return rel;
  cz.splice(cz.length - 2, 1);
  return cz.join('/');
}

function resolveShopifyThumbsRel(projectRoot, relPath) {
  let rel = normalizeRelPath(relPath);
  if (!rel) return '';
  if (rel.startsWith('posters/')) rel = rel.slice('posters/'.length);
  if (rel.startsWith('shopify_thumbs/')) rel = rel.slice('shopify_thumbs/'.length);

  // SPLASZCZENIE KATALOGU PLAKATU.
  //
  // W posters/ kazdy plakat ma wlasny katalog (Tytul/Tytul_thumb.jpg), ale
  // shopify_thumbs/ pozostaje PLASKI — to on jest serwowany przez CDN do zywego
  // sklepu i przebudowa jego struktury unieruchomilaby ponad 2000 zdjec do czasu
  // ponownego importu CSV. Katalog posredni odpada, gdy jego nazwa jest prefiksem
  // nazwy pliku, czyli dokladnie w ukladzie, ktory tworzy migracja.
  // Splaszczenie jest DRUGA proba, nie pierwsza — patrz flattenPosterDir.
  const splaszczona = flattenPosterDir(rel);
  const kandydaci = splaszczona === rel ? [rel] : [rel, splaszczona];

  const shopRoot = path.join(projectRoot, 'shopify_thumbs');
  for (const kandydat of kandydaci) {
    const parts = kandydat.split('/').filter(Boolean);
    if (!parts.length) continue;

    let walk = shopRoot;
    const resolved = [];
    let ok = true;
    for (const part of parts) {
      if (!fs.existsSync(walk)) {
        ok = false;
        break;
      }
      const entries = fs.readdirSync(walk);
      const hit = entries.find((e) => e.toLowerCase() === part.toLowerCase());
      if (!hit) {
        ok = false;
        break;
      }
      resolved.push(hit);
      walk = path.join(walk, hit);
    }
    if (!ok) continue;
    if (!fs.existsSync(walk) || !fs.statSync(walk).isFile()) continue;
    return resolved.join('/');
  }
  return '';
}

/**
 * @param {string} projectRoot
 * @param {any} poster
 * @returns {{ state: 'ready'|'pending_assets'|'legacy_blocked', reasons: string[], resolved: { sourceExists:boolean, masterThumbRel:string, framedThumbRel:string } }}
 */
function evaluatePosterShopifyState(projectRoot, poster) {
  const reasons = [];
  const approved = poster && poster.approvedForPrint === true;
  const sourceRel = normalizeRelPath(poster && poster.imagePath);
  const sourceExists = fileExists(projectRoot, sourceRel);

  const masterThumbRel =
    (poster && poster.imagePathThumb && fileExists(projectRoot, poster.imagePathThumb) && normalizeRelPath(poster.imagePathThumb)) ||
    (withThumbSuffix(sourceRel) && fileExists(projectRoot, withThumbSuffix(sourceRel)) && withThumbSuffix(sourceRel)) ||
    '';

  const framedSourceRel = (poster && poster.imagePathFramed) || withFramedSuffix(sourceRel);
  const framedThumbRel =
    (poster && poster.imagePathFramedThumb && fileExists(projectRoot, poster.imagePathFramedThumb) && normalizeRelPath(poster.imagePathFramedThumb)) ||
    (withThumbSuffix(framedSourceRel) &&
      fileExists(projectRoot, withThumbSuffix(framedSourceRel)) &&
      withThumbSuffix(framedSourceRel)) ||
    '';

  if (!sourceRel) reasons.push('missing_image_path');
  if (sourceRel && !sourceExists) reasons.push('missing_source_png');
  if (approved && !masterThumbRel) reasons.push('missing_master_thumb');
  if (approved && !framedThumbRel) reasons.push('missing_framed_thumb');

  let state = 'pending_assets';
  if (!sourceRel || !sourceExists) {
    state = 'legacy_blocked';
  } else if (!approved) {
    state = 'pending_assets';
  } else if (masterThumbRel) {
    state = 'ready';
  } else {
    state = 'pending_assets';
  }

  return {
    state,
    reasons,
    resolved: {
      sourceExists,
      masterThumbRel,
      framedThumbRel,
    },
  };
}

/**
 * @param {string} projectRoot
 * @param {{ posters?: any[] }} inventory
 */
function reconcileInventoryShopifyStates(projectRoot, inventory) {
  const posters = Array.isArray(inventory && inventory.posters) ? inventory.posters : [];
  const summary = {
    total: 0,
    ready: 0,
    pending_assets: 0,
    legacy_blocked: 0,
    changed: 0,
  };
  const nowIso = new Date().toISOString();

  for (const p of posters) {
    // Ramki jako produkty (kind: 'frame') nie maja imagePath z zalozenia —
    // ich zdjecia rozwiazuja sie po konwencji sciezek, nie po polu w
    // rekordzie (patrz src/frameProductImages.js). Bez tego wykluczenia
    // kazda z nich dostawalaby stan 'legacy_blocked' (brak imagePath =
    // "zrodlowy plik zniknal"), co jest faktycznie nieprawda — po prostu
    // ten kind nigdy nie mial go miec.
    if (p && p.kind === 'frame') continue;
    const out = evaluatePosterShopifyState(projectRoot, p);
    summary.total += 1;
    summary[out.state] += 1;
    const nextReasons = out.reasons.slice().sort();
    const prevReasons = Array.isArray(p.shopifyIssues) ? p.shopifyIssues.slice().sort() : [];
    const nextMasterThumb = out.resolved.masterThumbRel || '';
    const nextFramedThumb = out.resolved.framedThumbRel || '';
    let localChanged = false;

    if (p.shopifyState !== out.state) {
      p.shopifyState = out.state;
      localChanged = true;
    }
    if (JSON.stringify(prevReasons) !== JSON.stringify(nextReasons)) {
      p.shopifyIssues = nextReasons;
      localChanged = true;
    }
    if (nextMasterThumb && p.imagePathThumb !== nextMasterThumb) {
      p.imagePathThumb = nextMasterThumb;
      localChanged = true;
    }
    if (nextFramedThumb && p.imagePathFramedThumb !== nextFramedThumb) {
      p.imagePathFramedThumb = nextFramedThumb;
      localChanged = true;
    }
    if (localChanged) {
      p.shopifyStateUpdatedAt = nowIso;
      summary.changed += 1;
    }
  }

  return summary;
}

/**
 * Shopify readiness counts for export: approved only, one row per imagePath (newest wins).
 * @param {string} projectRoot
 * @param {{ posters?: any[] }} inventory
 */
function summarizeApprovedShopifyStates(projectRoot, inventory) {
  const posters = Array.isArray(inventory && inventory.posters) ? inventory.posters : [];
  const approved = posters.filter((p) => p && p.approvedForPrint === true);
  const byImage = new Map();

  for (const p of approved) {
    const k = normalizeRelPath(p.imagePath).toLowerCase();
    if (!k) continue;
    const t = Date.parse(p.createdAt || '') || 0;
    const prev = byImage.get(k);
    if (!prev || t >= prev._t) byImage.set(k, { poster: p, _t: t });
  }

  const unique = [...byImage.values()].map((x) => x.poster);
  const summary = {
    approved: approved.length,
    uniqueApproved: unique.length,
    duplicates: Math.max(0, approved.length - unique.length),
    ready: 0,
    pending_assets: 0,
    legacy_blocked: 0,
  };

  for (const p of unique) {
    const out = evaluatePosterShopifyState(projectRoot, p);
    summary[out.state] += 1;
  }

  return summary;
}

module.exports = {
  normalizeRelPath,
  fileExists,
  withThumbSuffix,
  withFramedSuffix,
  flattenPosterDir,
  resolveShopifyThumbsRel,
  evaluatePosterShopifyState,
  reconcileInventoryShopifyStates,
  summarizeApprovedShopifyStates,
};
