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

module.exports = {
  normalizeRelPath,
  fileExists,
  withThumbSuffix,
  withFramedSuffix,
  evaluatePosterShopifyState,
  reconcileInventoryShopifyStates,
};
