/**
 * Tlumaczy caly katalog (title, body_html, meta_title, meta_description) na
 * SV/CS/DA przez Shopify translationsRegister (Admin API) - ten sam
 * mechanizm co tlumaczKatalogPlDe.js, dla trzech nowych jezykow (Szwecja,
 * Czechy, Dania).
 *
 * Wznawialny: postep w tlumaczenia_sv_cs_da_progress.json (klucz: handle ->
 * {sv:true/false, cs:true/false, da:true/false}).
 *
 *   node scripts/tlumaczKatalogSvCsDa.js              — caly katalog
 *   node scripts/tlumaczKatalogSvCsDa.js --limit=5     — pierwsze N (test)
 *   node scripts/tlumaczKatalogSvCsDa.js --handle=xyz  — jeden produkt
 */

'use strict';

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { toPosterHandle } = require('../src/posterTitle');

const ROOT = __dirname + '/..';
const INVENTORY = path.join(ROOT, 'posters_inventory.json');
const PROGRESS = path.join(ROOT, 'tlumaczenia_sv_cs_da_progress.json');

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
const apiVersion = '2025-01';
const openaiKey = process.env.OPENAI_API_KEY;

const onlyHandle = (process.argv.find((a) => a.startsWith('--handle=')) || '').split('=')[1] || null;
const limitArg = (process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1];
const limit = limitArg ? Number(limitArg) : 0;

const FIELDS = ['title', 'body_html', 'meta_title', 'meta_description'];
const LOCALES = ['sv', 'cs', 'da'];

function loadProgress() {
  if (!fs.existsSync(PROGRESS)) return {};
  return JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
}
function saveProgress(p) {
  fs.writeFileSync(PROGRESS, JSON.stringify(p, null, 2) + '\n', 'utf8');
}

async function adminGraphql(query, variables) {
  const r = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await r.json();
  const cost = json.extensions && json.extensions.cost;
  return { json, cost };
}

async function throttleGuard(cost) {
  if (!cost || !cost.throttleStatus) return;
  const { currentlyAvailable, restoreRate } = cost.throttleStatus;
  if (currentlyAvailable < 200) {
    const waitMs = Math.ceil((200 - currentlyAvailable) / restoreRate) * 1000 + 500;
    await new Promise((res) => setTimeout(res, waitMs));
  }
}

async function fetchTranslatable(handle) {
  const q1 = `{ productByHandle(handle: "${handle}") { id } }`;
  const { json: j1, cost: c1 } = await adminGraphql(q1);
  await throttleGuard(c1);
  const gid = j1.data && j1.data.productByHandle && j1.data.productByHandle.id;
  if (!gid) return null;

  const q2 = `{ translatableResource(resourceId: "${gid}") { translatableContent { key value digest locale } } }`;
  const { json: j2, cost: c2 } = await adminGraphql(q2);
  await throttleGuard(c2);
  const content = j2.data && j2.data.translatableResource && j2.data.translatableResource.translatableContent;
  if (!content) return null;

  const byKey = {};
  for (const c of content) if (FIELDS.includes(c.key)) byKey[c.key] = c;
  return { gid, byKey };
}

async function translateWithOpenAI(title, bodyHtml, metaTitle, metaDescription) {
  const prompt = `Translate this Shopify product's fields into Swedish (sv), Czech (cs) and Danish (da). Keep it natural, premium e-commerce tone (this is a fine-art poster print shop). Preserve any HTML tags in body_html exactly, translate only the text inside them. Do not translate brand names or "REXIMPRIMIS". Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{"sv":{"title":"...","body_html":"...","meta_title":"...","meta_description":"..."},"cs":{"title":"...","body_html":"...","meta_title":"...","meta_description":"..."},"da":{"title":"...","body_html":"...","meta_title":"...","meta_description":"..."}}

title: ${JSON.stringify(title || '')}
body_html: ${JSON.stringify(bodyHtml || '')}
meta_title: ${JSON.stringify(metaTitle || '')}
meta_description: ${JSON.stringify(metaDescription || '')}`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + openaiKey,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  }).then((res) => res.json());

  if (r.error) throw new Error('OpenAI: ' + JSON.stringify(r.error));
  const text = r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
  if (!text) throw new Error('Brak odpowiedzi OpenAI: ' + JSON.stringify(r));
  return JSON.parse(text);
}

async function registerLocale(gid, locale, byKey, translated) {
  const translations = [];
  for (const key of FIELDS) {
    if (!byKey[key] || !translated[key]) continue;
    translations.push({ locale, key, value: translated[key], translatableContentDigest: byKey[key].digest });
  }
  if (!translations.length) return { userErrors: [] };
  const mutation = `mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
    translationsRegister(resourceId: $resourceId, translations: $translations) {
      userErrors { field message }
    }
  }`;
  const { json, cost } = await adminGraphql(mutation, { resourceId: gid, translations });
  await throttleGuard(cost);
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data.translationsRegister;
}

(async () => {
  if (!domain || !token) throw new Error('Brak SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN w .env');
  if (!openaiKey) throw new Error('Brak OPENAI_API_KEY w .env');

  const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  let list = inv.posters.filter((p) => p.approvedForPrint && p.shopifyState === 'ready');
  if (onlyHandle) list = list.filter((p) => toPosterHandle(p.title) === onlyHandle);
  if (limit) list = list.slice(0, limit);

  const progress = loadProgress();
  console.log(`Do przetlumaczenia: ${list.length} produktow (pomijam juz zrobione).`);

  let ok = 0, skip = 0, blad = 0;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const handle = toPosterHandle(p.title);
    const done = progress[handle];
    if (done && LOCALES.every((l) => done[l])) { skip += 1; continue; }

    process.stdout.write(`[${i + 1}/${list.length}] ${handle}... `);
    try {
      const tr = await fetchTranslatable(handle);
      if (!tr) { console.log('BRAK PRODUKTU W SHOPIFY, pomijam'); blad += 1; continue; }

      const title = tr.byKey.title ? tr.byKey.title.value : '';
      const body = tr.byKey.body_html ? tr.byKey.body_html.value : '';
      const metaT = tr.byKey.meta_title ? tr.byKey.meta_title.value : '';
      const metaD = tr.byKey.meta_description ? tr.byKey.meta_description.value : '';

      const all = await translateWithOpenAI(title, body, metaT, metaD);

      const results = [];
      for (const locale of LOCALES) {
        results.push(await registerLocale(tr.gid, locale, tr.byKey, all[locale]));
      }

      const errs = results.flatMap((r) => r.userErrors || []);
      if (errs.length) {
        console.log('BLEDY: ' + JSON.stringify(errs));
        blad += 1;
      } else {
        progress[handle] = { sv: true, cs: true, da: true };
        saveProgress(progress);
        console.log('OK');
        ok += 1;
      }
    } catch (e) {
      console.log('BLAD: ' + e.message);
      blad += 1;
    }
  }

  console.log('');
  console.log(`Gotowe: ${ok} OK, ${skip} pominietych (juz zrobione), ${blad} bledow.`);
})();
